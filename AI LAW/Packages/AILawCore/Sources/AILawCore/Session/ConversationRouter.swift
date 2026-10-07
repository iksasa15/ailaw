import Foundation

/// Solo: one phone, role switches by hand. Dedicated: this phone is locked to one role in a two-phone session.
public enum LensMode: Equatable, Sendable {
    case solo
    case dedicated(Role)
}

/// What the Lens should do in response to an event.
public enum LensAction: Equatable, Sendable {
    case speak(String)
    case publish(ScenePhrase)
    case showLawyerPhrase(ScenePhrase)
    case showRemotePerson(ScenePhrase)
    case pulse
}

/// Decides who speaks, what is sent to the other phone, and what is shown
/// (port of the effects in web/src/pages/Home.jsx).
public struct ConversationRouter {
    public let mode: LensMode
    private let makeID: @Sendable () -> UUID

    /// Newest lawyer phrase by `at`, local or remote.
    public private(set) var lawyerPhrase: ScenePhrase?
    /// Last person phrase published from this phone (sent in snapshots).
    public private(set) var lastPersonPhrase: ScenePhrase?

    private var lastSpokenKey: String?
    private var lastSnippet: String?
    private var deduper = SceneDeduper()

    public init(mode: LensMode, makeID: @escaping @Sendable () -> UUID = { UUID() }) {
        self.mode = mode
        self.makeID = makeID
    }

    private var speaksLocally: Bool { mode != .dedicated(.person) }

    public mutating func signResult(_ r: SignResult, currentRole: Role, roleHoldProgress: Double, now: Int64) -> [LensAction] {
        guard r.accepted, !r.display.isEmpty else { return [] }
        if mode == .solo, roleHoldProgress > 0.15, let f = r.fingers, f == 1 || f == 2 { return [] }

        let spokenRole = r.role ?? currentRole
        let key = r.fingers.map { "\(spokenRole.rawValue):\($0):\(r.display)" } ?? r.display
        guard key != lastSpokenKey else { return [] }
        lastSpokenKey = key

        let phrase = ScenePhrase(id: makeID(), role: spokenRole, text: r.display, fingers: r.fingers, at: now)
        var actions: [LensAction] = []
        if spokenRole == .lawyer {
            lawyerPhrase = phrase
            actions.append(.showLawyerPhrase(phrase))
        } else {
            lastPersonPhrase = phrase
        }
        actions.append(.publish(phrase))
        if speaksLocally { actions.append(.speak(r.display)) }
        actions.append(.pulse)
        return actions
    }

    /// Lawyer speech (already debounced and cut to the last words) → sign translator.
    public mutating func speechSnippet(_ snippet: String, currentRole: Role, now: Int64) -> [LensAction] {
        let isLawyerTalking = mode == .dedicated(.lawyer) || (mode == .solo && currentRole == .lawyer)
        let isPersonListening = mode == .dedicated(.person) || (mode == .solo && currentRole == .person)
        guard isLawyerTalking || isPersonListening else { return [] }

        let text = snippet.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, text != lastSnippet else { return [] }
        lastSnippet = text

        let phrase = ScenePhrase(id: makeID(), role: .lawyer, text: text, fingers: nil, at: now)
        lawyerPhrase = phrase
        return isLawyerTalking ? [.showLawyerPhrase(phrase), .publish(phrase)] : [.showLawyerPhrase(phrase)]
    }

    /// Letters-mode text sent by the person.
    public mutating func alphabetSend(_ text: String, now: Int64) -> [LensAction] {
        let message = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return [] }
        let phrase = ScenePhrase(id: makeID(), role: .person, text: message, fingers: nil, at: now)
        lastPersonPhrase = phrase
        return speaksLocally ? [.publish(phrase), .speak(message)] : [.publish(phrase)]
    }

    public mutating func remote(_ message: SceneMessage) -> [LensAction] {
        switch message {
        case .phrase(let p):
            return receive(p, live: true)
        case .snapshot(let lawyer, let person):
            return (lawyer.map { receive($0, live: false) } ?? []) + (person.map { receive($0, live: false) } ?? [])
        }
    }

    /// Solo only: announce the new role and allow the same phrase to be spoken again.
    public mutating func roleChanged(to role: Role) -> [LensAction] {
        guard mode == .solo else { return [] }
        resetSpoken()
        return [.speak(role.modeAnnouncement)]
    }

    /// Send turned off or tracking lost: the next accepted sign is spoken even if repeated.
    public mutating func resetSpoken() {
        lastSpokenKey = nil
    }

    public func snapshot() -> SceneMessage {
        .snapshot(lawyer: lawyerPhrase, person: lastPersonPhrase)
    }

    private mutating func receive(_ p: ScenePhrase, live: Bool) -> [LensAction] {
        guard deduper.isNew(p) else { return [] }
        switch p.role {
        case .lawyer:
            if let current = lawyerPhrase, current.at >= p.at { return [] }
            lawyerPhrase = p
            return [.showLawyerPhrase(p)]
        case .person:
            guard mode == .dedicated(.lawyer) else { return [] }
            return live ? [.showRemotePerson(p), .speak(p.text)] : [.showRemotePerson(p)]
        }
    }
}
