/// How quickly a held sign is accepted. «دقيق» keeps the web timings.
public enum RecognitionSpeed: String, Codable, Sendable, CaseIterable {
    case fast, balanced, accurate

    public var label: String {
        switch self {
        case .fast: "سريع"
        case .balanced: "متوازن"
        case .accurate: "دقيق"
        }
    }
}

/// Seconds a reading must stay stable before it counts.
public struct RecognitionTuning: Equatable, Sendable {
    /// Same finger count held this long while tracking is steady → phrase accepted.
    public let acceptLocked: Double
    /// Same, while the hand is still moving a little.
    public let acceptWeak: Double
    /// Letters mode: hold a letter shape this long to write it.
    public let letterHold: Double
    /// Hold 1 or 2 fingers this long to switch role.
    public let roleHold: Double

    public init(acceptLocked: Double, acceptWeak: Double, letterHold: Double, roleHold: Double) {
        self.acceptLocked = acceptLocked
        self.acceptWeak = acceptWeak
        self.letterHold = letterHold
        self.roleHold = roleHold
    }

    public static func preset(_ speed: RecognitionSpeed) -> RecognitionTuning {
        switch speed {
        case .fast: RecognitionTuning(acceptLocked: 0.45, acceptWeak: 0.7, letterHold: 1.2, roleHold: 2.5)
        case .balanced: RecognitionTuning(acceptLocked: 0.7, acceptWeak: 1.0, letterHold: 2.0, roleHold: 3.0)
        case .accurate: RecognitionTuning(acceptLocked: 1.2, acceptWeak: 1.7, letterHold: 3.0, roleHold: 5.0)
        }
    }
}
