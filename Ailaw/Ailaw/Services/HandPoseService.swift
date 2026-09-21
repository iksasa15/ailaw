import Foundation
import Vision

enum TrackingQuality: String {
    case lost
    case weak
    case locked

    var label: String {
        switch self {
        case .lost: return "وجّه يدك"
        case .weak: return "تتبع ضعيف"
        case .locked: return "يد متثبتة"
        }
    }
}

struct HandLandmark {
    let x: Double
    let y: Double
    let z: Double

    var array: [Double] { [x, y, z] }
}

@Observable
final class HandPoseService {
    private(set) var quality: TrackingQuality = .lost
    private(set) var fingerCount: Int = 0
    private(set) var hands: [[HandLandmark]] = []
    private(set) var primaryLandmarks: [HandLandmark] = []

    private var lastPoints: [CGPoint] = []
    private var stableFrames = 0
    private let lock = NSLock()
    private var busy = false

    func process(pixelBuffer: CVPixelBuffer) {
        lock.lock()
        if busy {
            lock.unlock()
            return
        }
        busy = true
        lock.unlock()

        let request = VNDetectHumanHandPoseRequest()
        request.maximumHandCount = 2
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            defer {
                self?.lock.lock()
                self?.busy = false
                self?.lock.unlock()
            }
            guard let self else { return }
            do {
                try handler.perform([request])
                let observations = request.results ?? []
                self.handle(observations: observations)
            } catch {
                DispatchQueue.main.async {
                    self.quality = .lost
                    self.fingerCount = 0
                    self.hands = []
                    self.primaryLandmarks = []
                }
            }
        }
    }

    private func handle(observations: [VNHumanHandPoseObservation]) {
        guard !observations.isEmpty else {
            DispatchQueue.main.async {
                self.quality = .lost
                self.fingerCount = 0
                self.hands = []
                self.primaryLandmarks = []
                self.lastPoints = []
                self.stableFrames = 0
            }
            return
        }

        var allHands: [[HandLandmark]] = []
        var tipPoints: [CGPoint] = []

        for obs in observations {
            guard let landmarks = try? Self.landmarks(from: obs) else { continue }
            allHands.append(landmarks)
            if landmarks.count > 8 {
                tipPoints.append(CGPoint(x: landmarks[8].x, y: landmarks[8].y))
            }
        }

        let fingers = FingerCounter.count(hands: allHands)
        let movement = Self.movement(from: lastPoints, to: tipPoints)
        lastPoints = tipPoints

        let nextQuality: TrackingQuality
        if allHands.isEmpty {
            nextQuality = .lost
            stableFrames = 0
        } else if movement > 0.045 {
            nextQuality = .weak
            stableFrames = 0
        } else {
            stableFrames += 1
            nextQuality = stableFrames >= 6 ? .locked : .weak
        }

        DispatchQueue.main.async {
            self.hands = allHands
            self.primaryLandmarks = allHands.first ?? []
            self.fingerCount = fingers
            self.quality = nextQuality
        }
    }

    private static func landmarks(from observation: VNHumanHandPoseObservation) throws -> [HandLandmark] {
        let all = try observation.recognizedPoints(.all)
        let order: [VNHumanHandPoseObservation.JointName] = [
            .wrist,
            .thumbCMC, .thumbMP, .thumbIP, .thumbTip,
            .indexMCP, .indexPIP, .indexDIP, .indexTip,
            .middleMCP, .middlePIP, .middleDIP, .middleTip,
            .ringMCP, .ringPIP, .ringDIP, .ringTip,
            .littleMCP, .littlePIP, .littleDIP, .littleTip,
        ]
        return order.compactMap { name in
            guard let p = all[name], p.confidence > 0.2 else { return nil }
            // Vision y grows up; web MediaPipe y grows down — flip for distance heuristics.
            return HandLandmark(x: Double(p.location.x), y: Double(1 - p.location.y), z: 0)
        }
    }

    private static func movement(from old: [CGPoint], to new: [CGPoint]) -> CGFloat {
        guard !old.isEmpty, old.count == new.count else { return 1 }
        var sum: CGFloat = 0
        for i in 0..<old.count {
            sum += hypot(old[i].x - new[i].x, old[i].y - new[i].y)
        }
        return sum / CGFloat(old.count)
    }
}

enum FingerCounter {
    static func count(hands: [[HandLandmark]]) -> Int {
        var total = 0
        for hand in hands {
            total += countExtended(hand)
        }
        return min(10, total)
    }

    static func countExtended(_ landmarks: [HandLandmark]) -> Int {
        guard landmarks.count >= 21 else { return 0 }
        let wrist = landmarks[0]
        let tips = [8, 12, 16, 20]
        let pips = [6, 10, 14, 18]
        var n = 0
        for i in 0..<tips.count {
            let tip = landmarks[tips[i]]
            let pip = landmarks[pips[i]]
            if dist(tip, wrist) > dist(pip, wrist) * 1.12 {
                n += 1
            }
        }
        let thumbTip = landmarks[4]
        let thumbIP = landmarks[3]
        let ref = landmarks[17]
        if dist(thumbTip, ref) > dist(thumbIP, ref) * 1.08 {
            n += 1
        }
        return min(5, n)
    }

    private static func dist(_ a: HandLandmark, _ b: HandLandmark) -> Double {
        hypot(a.x - b.x, a.y - b.y)
    }
}
