/// Conversation role: the hearing lawyer or the deaf person (client).
public enum Role: String, Codable, Sendable, CaseIterable {
    case lawyer
    case person

    public var label: String {
        switch self {
        case .lawyer: "محامي"
        case .person: "شخص"
        }
    }

    public var modeAnnouncement: String {
        switch self {
        case .lawyer: "وضع المحامي"
        case .person: "وضع الشخص"
        }
    }
}

public enum TrackingQuality: String, Sendable {
    case lost, weak, locked
}

/// A recognized sign (finger phrase or ArSL word) ready to display or speak.
public struct SignResult: Equatable, Sendable {
    public var fingers: Int?
    public var display: String
    public var role: Role?
    public var confidence: Double
    public var accepted: Bool

    public init(fingers: Int? = nil, display: String, role: Role? = nil, confidence: Double, accepted: Bool) {
        self.fingers = fingers
        self.display = display
        self.role = role
        self.confidence = confidence
        self.accepted = accepted
    }
}
