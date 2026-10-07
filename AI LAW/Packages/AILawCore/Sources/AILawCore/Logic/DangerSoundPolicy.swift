/// One classification from Apple's built-in sound classifier.
public struct SoundGuess: Sendable {
    public let identifier: String
    public let confidence: Double

    public init(_ identifier: String, _ confidence: Double) {
        self.identifier = identifier
        self.confidence = confidence
    }
}

public struct DangerAlert: Equatable, Sendable {
    public let identifier: String
    public let label: String
    public let score: Double

    public init(identifier: String, label: String, score: Double) {
        self.identifier = identifier
        self.label = label
        self.score = score
    }
}

/// Decides when ambient sound is a danger: a danger class at or above the threshold in
/// consecutive analysis windows, then a cooldown so one siren does not flash forever.
public struct DangerSoundPolicy: Sendable {
    public static let labels: [String: String] = [
        "siren": "صفارة إنذار",
        "police_siren": "صفارة إنذار",
        "ambulance_siren": "صفارة إنذار",
        "fire_engine_siren": "صفارة إنذار",
        "civil_defense_siren": "صفارة إنذار",
        "emergency_vehicle": "صفارة إنذار",
        "smoke_detector": "إنذار حريق",
        "car_horn": "بوق سيارة",
        "air_horn": "بوق سيارة",
        "alarm_clock": "منبّه",
        "screaming": "صراخ",
        "glass_breaking": "كسر زجاج",
    ]

    public let threshold: Double
    public let windowsNeeded: Int
    public let cooldown: Double
    private var consecutive = 0
    private var lastAlertAt = -Double.infinity

    public init(threshold: Double = 0.5, windowsNeeded: Int = 2, cooldown: Double = 4) {
        self.threshold = threshold
        self.windowsNeeded = windowsNeeded
        self.cooldown = cooldown
    }

    public mutating func ingest(_ guesses: [SoundGuess], now: Double) -> DangerAlert? {
        let best = guesses
            .filter { Self.labels[$0.identifier] != nil && $0.confidence >= threshold }
            .max { $0.confidence < $1.confidence }
        guard let best, let label = Self.labels[best.identifier] else {
            consecutive = 0
            return nil
        }
        consecutive += 1
        guard consecutive >= windowsNeeded, now - lastAlertAt >= cooldown else { return nil }
        lastAlertAt = now
        return DangerAlert(identifier: best.identifier, label: label, score: best.confidence)
    }
}
