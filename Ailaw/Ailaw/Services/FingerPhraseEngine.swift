import Foundation

struct FingerPhraseResult: Equatable {
    let fingers: Int
    let text: String
    let role: UserRole
}

@Observable
final class FingerPhraseEngine {
    private(set) var role: UserRole
    private(set) var result: FingerPhraseResult?
    private(set) var roleHoldProgress: Double = 0
    private(set) var roleChangedBanner: String?

    var lockedRole: UserRole?
    var enabled = false
    var lawyerPhrases: [Int: String] = PhraseDefaults.lawyer
    var personPhrases: [Int: String] = PhraseDefaults.person

    private var streakCount = 0
    private var streakValue = -1
    private var lastAccepted: Int?
    private var roleHoldStart: Date?
    private var roleHoldFingers = 0
    private var roleSwitchDone = false
    private let roleHoldMs: Double = 5000
    private let stableNeed = 8
    private var onAccepted: ((FingerPhraseResult) -> Void)?

    init(initialRole: UserRole = .person) {
        self.role = initialRole
    }

    func setOnAccepted(_ handler: @escaping (FingerPhraseResult) -> Void) {
        onAccepted = handler
    }

    func applyLockedRole(_ locked: UserRole?) {
        lockedRole = locked
        if let locked {
            role = locked
            lastAccepted = nil
            roleHoldProgress = 0
        }
    }

    func resetTracking() {
        streakCount = 0
        streakValue = -1
        lastAccepted = nil
        roleHoldStart = nil
        roleHoldFingers = 0
        roleSwitchDone = false
        result = nil
        roleHoldProgress = 0
    }

    func tick(fingers: Int, quality: TrackingQuality) {
        guard enabled else {
            result = nil
            roleHoldProgress = 0
            return
        }
        guard quality != .lost else {
            resetTracking()
            return
        }

        if fingers == streakValue {
            streakCount += 1
        } else {
            streakValue = fingers
            streakCount = 1
            lastAccepted = nil
        }

        let locked = quality == .locked
        let map = PhraseDefaults.phrases(for: role, lawyer: lawyerPhrases, person: personPhrases)
        let need = locked ? stableNeed : stableNeed + 4

        // Role hold
        if lockedRole == nil {
            let roleCandidate: UserRole? = fingers == 1 ? .lawyer : fingers == 2 ? .person : nil
            if locked, let roleCandidate, streakValue == fingers {
                if roleHoldFingers != fingers {
                    roleHoldFingers = fingers
                    roleHoldStart = Date()
                    roleSwitchDone = false
                }
                let started = roleHoldStart ?? Date()
                let elapsed = Date().timeIntervalSince(started) * 1000
                roleHoldProgress = min(1, elapsed / roleHoldMs)
                if !roleSwitchDone, elapsed >= roleHoldMs {
                    roleSwitchDone = true
                    if role != roleCandidate {
                        role = roleCandidate
                        lastAccepted = nil
                        roleChangedBanner = "تم التبديل إلى وضع \(roleCandidate.label)"
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                            self?.roleChangedBanner = nil
                        }
                    }
                }
            } else {
                roleHoldStart = nil
                roleHoldFingers = 0
                roleSwitchDone = false
                roleHoldProgress = 0
            }
        } else {
            roleHoldProgress = 0
        }

        // Accept phrase (skip during role-hold for 1/2 fingers when unlocked)
        let holdingRole = lockedRole == nil && (fingers == 1 || fingers == 2) && roleHoldProgress > 0 && roleHoldProgress < 1
        if locked, !holdingRole, streakCount >= need, fingers >= 1, fingers <= 10, lastAccepted != fingers,
           let text = map[fingers], !text.isEmpty {
            lastAccepted = fingers
            let accepted = FingerPhraseResult(fingers: fingers, text: text, role: role)
            result = accepted
            onAccepted?(accepted)
        }
    }

    func toggleRole() {
        guard lockedRole == nil else { return }
        role = role == .lawyer ? .person : .lawyer
        lastAccepted = nil
        roleChangedBanner = "تم التبديل إلى وضع \(role.label)"
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.roleChangedBanner = nil
        }
    }
}
