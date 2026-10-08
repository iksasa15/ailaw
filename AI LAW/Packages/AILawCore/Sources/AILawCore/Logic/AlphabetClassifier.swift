public struct LetterGuess: Equatable, Sendable {
    public let letter: String
    public let confidence: Double

    public init(letter: String, confidence: Double) {
        self.letter = letter
        self.confidence = confidence
    }
}

/// Approximate Arabic sign-alphabet letter from hand shape (port of web classifyAlphabetLetter).
/// Branch order matches the web, including branches the switch table makes unreachable.
/// Distance thresholds are relative to the palm (wrist → middle MCP), so the same shape reads
/// the same letter whether the hand is near or far from the camera; the web's absolute values
/// correspond to a palm of 0.30.
public enum AlphabetClassifier {
    public static func classify(_ hand: HandLandmarks?) -> LetterGuess? {
        guard let hand else { return nil }
        let f = FingerCounter.flags(hand)
        let wrist = hand[.wrist]
        let palm = planarDistance(wrist, hand[.middleMCP])
        guard palm > 1e-6 else { return nil }
        let k = palm / referencePalm
        let spread = tipSpread(hand) / k
        let pinch = planarDistance(hand[.thumbTip], hand[.indexTip]) / k
        func guess(_ letter: String, _ confidence: Double) -> LetterGuess {
            LetterGuess(letter: letter, confidence: confidence)
        }

        switch f.pattern {
        case "10000": return guess("أ", 0.82)
        case "01000": return guess("ب", 0.8)
        case "01100": return guess("ت", 0.8)
        case "01110": return guess("ث", 0.78)
        case "00100": return guess("د", 0.7)
        case "00010": return guess("ر", 0.65)
        case "00001": return guess("ي", 0.72)
        case "10001": return guess("ي", 0.85)
        case "11000":
            return pinch > 0.12 ? guess("ل", 0.75) : guess("ط", 0.6)
        case "01111": return guess("ب", 0.78)
        case "11111": return guess(spread > 0.22 ? "ش" : "س", 0.8)
        case "00000": return guess("م", 0.7)
        case "10111", "11011": return guess("ص", 0.55)
        case "11100": return guess("ظ", 0.6)
        case "00111": return guess("ض", 0.55)
        case "01001": return guess("لا", 0.8)
        default: break
        }

        if pinch < 0.05 && f.middle && f.ring { return guess("ف", 0.65) }
        if pinch < 0.055 && !f.middle { return guess("ق", 0.6) }
        if !f.thumb && f.index && f.middle && f.ring && f.little {
            return guess(spread > 0.22 ? "ش" : "ك", 0.7)
        }
        if f.index && !f.middle && !f.ring && !f.little && planarDistance(hand[.indexTip], wrist) / k < 0.28 {
            return guess("ن", 0.55)
        }
        if f.index && f.little && !f.middle && !f.ring { return guess("لا", 0.75) }
        if f.thumb && f.little && !f.index && !f.middle && !f.ring { return guess("ي", 0.8) }

        let n = f.count
        if n == 1 && f.thumb { return guess("أ", 0.55) }
        if n == 1 && f.index { return guess("ب", 0.55) }
        if n == 2 && f.index && f.middle { return guess("ت", 0.55) }
        if n == 3 && f.index && f.middle && f.ring { return guess("ث", 0.55) }
        if n == 5 { return guess(spread > 0.22 ? "ش" : "س", 0.55) }
        if n == 0 { return guess("م", 0.5) }
        return nil
    }

    static let referencePalm = 0.30

    /// Sum of distances between adjacent fingertips (index → little).
    static func tipSpread(_ hand: HandLandmarks) -> Double {
        let tips: [Joint] = [.indexTip, .middleTip, .ringTip, .littleTip]
        return zip(tips, tips.dropFirst()).reduce(0) { $0 + planarDistance(hand[$1.0], hand[$1.1]) }
    }
}
