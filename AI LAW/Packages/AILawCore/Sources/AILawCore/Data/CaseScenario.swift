public struct ScenarioLine: Equatable, Sendable {
    public let role: Role
    public let fingers: Int
    public let text: String

    public init(role: Role, fingers: Int, text: String) {
        self.role = role
        self.fingers = fingers
        self.text = text
    }
}

/// Traffic-accident consultation between a lawyer and a client (web/src/data/caseScenario.js).
public enum CaseScenario {
    public static let title = "جلسة حادث مروري"
    public static let subtitle = "سيناريو جديد: محامٍ يستمع لموكّل تعرّض لحادث ويطلب تعويضاً"

    public static let lines: [ScenarioLine] = (1...10).flatMap { n in
        [
            ScenarioLine(role: .lawyer, fingers: n, text: PhraseBook.defaultLawyer[n]!),
            ScenarioLine(role: .person, fingers: n, text: PhraseBook.defaultPerson[n]!),
        ]
    }
}
