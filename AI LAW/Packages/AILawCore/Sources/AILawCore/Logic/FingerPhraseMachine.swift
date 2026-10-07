/// Finger-count phrases with lawyer/person roles (port of web useFingerPhrases).
/// Hold 1 finger 5 s → lawyer; hold 2 fingers 5 s → person. A stable count speaks the role's phrase.
public struct FingerPhraseMachine: Sendable {
    public static let tickInterval: Double = 0.12

    public let lockedRole: Role?
    public let stableNeed: Int
    public let roleHoldSeconds: Double

    public private(set) var role: Role
    public private(set) var result: SignResult?
    public private(set) var roleHoldProgress: Double = 0

    private var streakValue = -1
    private var streakCount = 0
    private var lastAcceptedKey: String?
    private var roleHoldStart: Double?
    private var roleHoldFingers = 0
    private var roleSwitchDone = false

    public init(lockedRole: Role? = nil, stableNeed: Int = 10, roleHoldSeconds: Double = 5) {
        self.lockedRole = lockedRole
        self.stableNeed = stableNeed
        self.roleHoldSeconds = roleHoldSeconds
        self.role = lockedRole ?? .person
    }

    /// One poll tick. Returns the new role on the tick a hold-to-switch completes.
    public mutating func tick(hands: [HandLandmarks], quality: TrackingQuality, phrases: PhraseBook, now: Double) -> Role? {
        if quality == .lost {
            reset()
            return nil
        }
        guard !hands.isEmpty else { return nil }

        let fingers = FingerCounter.count(hands: hands)
        if fingers == streakValue {
            streakCount += 1
        } else {
            streakValue = fingers
            streakCount = 1
            lastAcceptedKey = nil
        }

        let locked = quality == .locked
        let phrase = phrases.phrase(for: role, fingers: fingers)

        // Role hold — only on a free (not locked) screen. While holding 1 or 2 fingers,
        // short phrase acceptance is suppressed to avoid speaking mid-switch.
        let roleCandidate: Role? = fingers == 1 ? .lawyer : fingers == 2 ? .person : nil
        var roleHolding = false
        var switched: Role?
        if lockedRole == nil, locked, let candidate = roleCandidate {
            if roleHoldFingers != fingers {
                roleHoldFingers = fingers
                roleHoldStart = now
                roleSwitchDone = false
            }
            let elapsed = now - (roleHoldStart ?? now)
            let progress = min(1, elapsed / roleHoldSeconds)
            roleHoldProgress = progress
            roleHolding = progress > 0.08 && progress < 1

            if !roleSwitchDone && elapsed >= roleHoldSeconds {
                roleSwitchDone = true
                if role != candidate {
                    role = candidate
                    lastAcceptedKey = nil
                    switched = candidate
                }
                roleHoldProgress = 0
                roleHolding = false
            }
        } else {
            roleHoldStart = nil
            roleHoldFingers = 0
            roleSwitchDone = false
            roleHoldProgress = 0
        }

        // Ruling (ledger, Task 3): the web accepts the *previous* role's phrase on the switch
        // tick; skip acceptance on that tick so the old phrase is never spoken.
        if let switched { return switched }

        let phraseNeed = locked ? stableNeed : stableNeed + 4
        if let phrase, !roleHolding, streakCount >= phraseNeed {
            let confidence = min(0.95, 0.55 + Double(streakCount) * 0.03)
            let key = "\(role.rawValue):\(fingers):\(phrase)"
            if lastAcceptedKey != key || result == nil {
                lastAcceptedKey = key
                result = SignResult(fingers: fingers, display: phrase, role: role, confidence: confidence, accepted: true)
            } else {
                result?.confidence = confidence
            }
        } else if let phrase, locked, streakCount >= 3 {
            if let current = result, current.accepted, current.display == phrase, current.role == role {
                // keep the accepted result
            } else {
                result = SignResult(fingers: fingers, display: phrase, role: role,
                                    confidence: 0.35 + Double(streakCount) * 0.05, accepted: false)
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
        roleHoldStart = nil
        roleSwitchDone = false
        roleHoldProgress = 0
        result = nil
        return true
    }

    public mutating func reset() {
        streakValue = -1
        streakCount = 0
        lastAcceptedKey = nil
        roleHoldStart = nil
        roleHoldFingers = 0
        roleSwitchDone = false
        result = nil
        roleHoldProgress = 0
    }
}
