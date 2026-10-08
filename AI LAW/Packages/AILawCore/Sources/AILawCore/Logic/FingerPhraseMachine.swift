/// Finger-count phrases with lawyer/person roles (port of web useFingerPhrases, made
/// time-based). Hold 1 finger → lawyer, 2 fingers → person; a count held steady speaks the
/// role's phrase. Readings go through a majority filter so one misread frame does not
/// restart the wait.
public struct FingerPhraseMachine: Sendable {
    /// Seconds before a steady count is previewed (not yet accepted).
    public static let previewSeconds = 0.2

    public let lockedRole: Role?
    public var tuning: RecognitionTuning

    public private(set) var role: Role
    public private(set) var result: SignResult?
    public private(set) var roleHoldProgress: Double = 0

    private var filter = ReadingFilter<Int>()
    private var candidate: Int?
    private var candidateSince = 0.0
    private var lastAcceptedKey: String?
    private var roleSwitchDone = false

    public init(lockedRole: Role? = nil, tuning: RecognitionTuning = .preset(.balanced)) {
        self.lockedRole = lockedRole
        self.tuning = tuning
        self.role = lockedRole ?? .person
    }

    /// One reading (call it for every analysed camera frame or on a timer).
    /// Returns the new role when a hold-to-switch completes.
    public mutating func tick(hands: [HandLandmarks], quality: TrackingQuality, phrases: PhraseBook, now: Double) -> Role? {
        if quality == .lost {
            reset()
            return nil
        }
        guard !hands.isEmpty else { return nil }

        guard let fingers = filter.add(FingerCounter.count(hands: hands), now: now) else {
            // Readings keep disagreeing (e.g. a hand flickering in and out): nothing is steady.
            candidateSince = now
            roleSwitchDone = false
            roleHoldProgress = 0
            return nil
        }
        if fingers != candidate {
            candidate = fingers
            candidateSince = now
            lastAcceptedKey = nil
            roleSwitchDone = false
        }

        let elapsed = now - candidateSince + 1e-9
        let phrase = phrases.phrase(for: role, fingers: fingers)

        // Role hold — free screens only. While holding 1 or 2 fingers, short phrase
        // acceptance is suppressed so the switch does not speak a phrase first.
        let roleTarget: Role? = fingers == 1 ? .lawyer : fingers == 2 ? .person : nil
        var roleHolding = false
        if lockedRole == nil, let target = roleTarget, !roleSwitchDone {
            let progress = min(1, elapsed / tuning.roleHold)
            roleHoldProgress = progress
            roleHolding = progress > 0.08
            if progress >= 1 {
                roleSwitchDone = true
                roleHoldProgress = 0
                if role != target {
                    role = target
                    lastAcceptedKey = nil
                    // Ruling (Task 3): never accept the old role's phrase on the switch tick.
                    return target
                }
                roleHolding = false
            }
        } else {
            roleHoldProgress = 0
        }

        let need = quality == .locked ? tuning.acceptLocked : tuning.acceptWeak
        if let phrase, !roleHolding, elapsed >= need {
            let confidence = min(0.95, 0.55 + 0.4 * min(1, elapsed / (2 * need)))
            let key = "\(role.rawValue):\(fingers):\(phrase)"
            if lastAcceptedKey != key || result == nil {
                lastAcceptedKey = key
                result = SignResult(fingers: fingers, display: phrase, role: role, confidence: confidence, accepted: true)
            } else {
                result?.confidence = confidence
            }
        } else if let phrase, elapsed >= Self.previewSeconds {
            if let current = result, current.accepted, current.display == phrase, current.role == role {
                // keep the accepted result
            } else {
                result = SignResult(fingers: fingers, display: phrase, role: role,
                                    confidence: 0.35 + 0.2 * min(1, elapsed / need), accepted: false)
            }
        } else if phrase == nil && lastAcceptedKey == nil {
            result = nil
        }
        return nil
    }

    /// Manual toggle. Returns false when the role is locked or unchanged.
    public mutating func setRole(_ next: Role) -> Bool {
        guard lockedRole == nil, role != next else { return false }
        role = next
        lastAcceptedKey = nil
        roleSwitchDone = true
        roleHoldProgress = 0
        result = nil
        return true
    }

    public mutating func reset() {
        filter.reset()
        candidate = nil
        candidateSince = 0
        lastAcceptedKey = nil
        roleSwitchDone = false
        result = nil
        roleHoldProgress = 0
    }
}
