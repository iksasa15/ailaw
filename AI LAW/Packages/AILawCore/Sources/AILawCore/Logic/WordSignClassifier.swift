public struct WordPrediction: Equatable, Sendable {
    public let label: String
    public let display: String
    public let confidence: Double

    public init(label: String, display: String, confidence: Double) {
        self.label = label
        self.display = display
        self.confidence = confidence
    }
}

/// The ten ArSL demo words via hand-shape rules
/// (port of backend/app/services/arsl_service.py `_heuristic_predict`).
public enum WordSignClassifier {
    public static let labels = [
        "ينام", "يسكت", "حب", "يدخن", "دعم", "مرتبك", "قلق", "هنا", "السلام عليكم", "شكرا",
    ]

    public static let displayNames: [String: String] = [
        "السلام عليكم": "السلام عليكم",
        "شكرا": "شكراً",
        "دعم": "مساعدة",
        "هنا": "هنا",
        "حب": "حب",
        "قلق": "قلق",
        "مرتبك": "مرتبك",
        "ينام": "ينام",
        "يسكت": "يسكت",
        "يدخن": "يدخن",
    ]

    public static func classify(_ hand: HandLandmarks) -> WordPrediction {
        let (index, confidence) = predict(normalized(hand))
        let label = labels[index]
        return WordPrediction(label: label, display: displayNames[label] ?? label, confidence: confidence)
    }

    /// Wrist-relative points divided by the 3D wrist→middle-MCP distance (`normalize_landmarks`).
    static func normalized(_ hand: HandLandmarks) -> [Point3] {
        let wrist = hand[.wrist]
        let mcp = hand[.middleMCP]
        let dx = mcp.x - wrist.x, dy = mcp.y - wrist.y, dz = mcp.z - wrist.z
        var scale = (dx * dx + dy * dy + dz * dz).squareRoot()
        if scale < 1e-6 { scale = 1 }
        return hand.points.map {
            Point3(($0.x - wrist.x) / scale, ($0.y - wrist.y) / scale, ($0.z - wrist.z) / scale)
        }
    }

    private static func predict(_ norm: [Point3]) -> (Int, Double) {
        func extended(_ tip: Joint, _ pip: Joint) -> Bool {
            norm[tip.rawValue].y < norm[pip.rawValue].y - 0.05
        }
        let index = extended(.indexTip, .indexPIP)
        let middle = extended(.middleTip, .middlePIP)
        let ring = extended(.ringTip, .ringPIP)
        let pinky = extended(.littleTip, .littlePIP)
        let thumb = extended(.thumbTip, .thumbIP)
        let n = [index, middle, ring, pinky, thumb].filter { $0 }.count

        if n >= 4 { return (8, 0.72) }
        if thumb && !index && !middle { return (9, 0.7) }
        if index && !middle && !ring && !pinky { return (7, 0.68) }
        if n <= 1 && !index { return (1, 0.65) }
        if index && middle && !ring && !pinky { return (4, 0.66) }
        if index && middle && ring && !pinky { return (2, 0.62) }
        if pinky && thumb && !middle { return (6, 0.6) }
        if n == 0 { return (0, 0.58) }
        return (5, 0.55)
    }
}

/// Temporal voting over word predictions (port of web useArsl.js).
public struct WordSignVoter: Sendable {
    public static let tickInterval = 0.45

    public let threshold: Double
    public let voteSize: Int
    public let voteNeed: Int

    public private(set) var result: SignResult?
    private var resultLabel: String?
    private var votes: [WordPrediction] = []
    private var lastAcceptedLabel: String?

    public init(threshold: Double = 0.38, voteSize: Int = 6, voteNeed: Int = 3) {
        self.threshold = threshold
        self.voteSize = voteSize
        self.voteNeed = voteNeed
    }

    public mutating func add(_ p: WordPrediction, quality: TrackingQuality) -> SignResult? {
        guard quality != .lost else {
            reset()
            return nil
        }
        let locked = quality == .locked
        let acceptFloor = locked ? min(threshold, 0.22) : threshold
        let tallyFloor = locked ? 0.15 : threshold * 0.85
        let need = locked ? min(voteNeed, 2) : voteNeed + 1
        let guessFloor = locked ? 0.18 : max(0.55, threshold + 0.12)

        votes.append(p)
        if votes.count > voteSize { votes = Array(votes.suffix(voteSize)) }

        // Tally in first-seen order, like a JS Map.
        var order: [String] = []
        var tallies: [String: (count: Int, sum: Double, display: String)] = [:]
        for v in votes where v.confidence >= tallyFloor {
            if tallies[v.label] == nil { order.append(v.label) }
            var t = tallies[v.label] ?? (0, 0, v.display)
            t.count += 1
            t.sum += v.confidence
            tallies[v.label] = t
        }

        var winner: (label: String, display: String, confidence: Double, votes: Int)?
        for label in order {
            guard let t = tallies[label] else { continue }
            let avg = t.sum / Double(t.count)
            guard t.count >= need, avg >= acceptFloor else { continue }
            if winner == nil || t.count > winner!.votes || (t.count == winner!.votes && avg > winner!.confidence) {
                winner = (label, t.display, avg, t.count)
            }
        }

        if let winner {
            if lastAcceptedLabel != winner.label || result == nil {
                lastAcceptedLabel = winner.label
                resultLabel = winner.label
                result = SignResult(display: winner.display, confidence: winner.confidence, accepted: true)
            } else {
                result?.confidence = winner.confidence
            }
        } else if let last = votes.last, last.confidence >= guessFloor {
            let keep = result?.accepted == true && lastAcceptedLabel == resultLabel
            if !keep {
                resultLabel = last.label
                result = SignResult(display: last.display, confidence: last.confidence, accepted: false)
            }
        } else if lastAcceptedLabel == nil {
            result = nil
            resultLabel = nil
        }
        return result
    }

    public mutating func reset() {
        votes = []
        result = nil
        resultLabel = nil
        lastAcceptedLabel = nil
    }
}
