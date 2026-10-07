import Foundation

/// A phrase exchanged between the lawyer and person phones (same shape as the web scene payload).
public struct ScenePhrase: Codable, Equatable, Sendable {
    public var id: UUID
    public var role: Role
    public var text: String
    public var fingers: Int?
    /// Milliseconds since 1970.
    public var at: Int64

    public init(id: UUID, role: Role, text: String, fingers: Int?, at: Int64) {
        self.id = id
        self.role = role
        self.text = text
        self.fingers = fingers
        self.at = at
    }

    enum CodingKeys: String, CodingKey { case id, role, text, fingers, at }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(role, forKey: .role)
        try c.encode(text, forKey: .text)
        if let fingers { try c.encode(fingers, forKey: .fingers) } else { try c.encodeNil(forKey: .fingers) }
        try c.encode(at, forKey: .at)
    }

    var isValid: Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...200).contains(trimmed.count) else { return false }
        if let fingers, !(1...10).contains(fingers) { return false }
        return true
    }
}

/// Wire message between the two phones. JSON uses a flat `type` discriminator.
public enum SceneMessage: Equatable, Sendable {
    case phrase(ScenePhrase)
    case snapshot(lawyer: ScenePhrase?, person: ScenePhrase?)

    private enum CodingKeys: String, CodingKey { case type, lawyer, person }

    private struct Wire: Encodable {
        let message: SceneMessage

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            switch message {
            case .phrase(let p):
                try c.encode("phrase", forKey: .type)
                try p.encode(to: encoder)
            case .snapshot(let lawyer, let person):
                try c.encode("snapshot", forKey: .type)
                if let lawyer { try c.encode(lawyer, forKey: .lawyer) } else { try c.encodeNil(forKey: .lawyer) }
                if let person { try c.encode(person, forKey: .person) } else { try c.encodeNil(forKey: .person) }
            }
        }
    }

    private struct Envelope: Decodable {
        let message: SceneMessage?

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            switch try c.decode(String.self, forKey: .type) {
            case "phrase":
                let p = try ScenePhrase(from: decoder)
                message = p.isValid ? .phrase(p) : nil
            case "snapshot":
                let lawyer = try c.decodeIfPresent(ScenePhrase.self, forKey: .lawyer)
                let person = try c.decodeIfPresent(ScenePhrase.self, forKey: .person)
                let valid = (lawyer?.isValid ?? true) && (person?.isValid ?? true)
                message = valid ? .snapshot(lawyer: lawyer, person: person) : nil
            default:
                message = nil
            }
        }
    }

    public func encoded() -> Data {
        (try? JSONEncoder().encode(Wire(message: self))) ?? Data()
    }

    /// Nil for anything malformed, unknown, or out of range — never throws.
    public static func decode(_ data: Data) -> SceneMessage? {
        (try? JSONDecoder().decode(Envelope.self, from: data))?.message
    }
}

/// Drops repeated phrases by id, and by `at:text` for re-sent copies with a new id.
public struct SceneDeduper: Sendable {
    public let capacity: Int
    private var keys: [String] = []
    private var seen: Set<String> = []

    public init(capacity: Int = 64) {
        self.capacity = capacity
    }

    public mutating func isNew(_ p: ScenePhrase) -> Bool {
        let idKey = "id:\(p.id.uuidString)"
        let contentKey = "at:\(p.at):\(p.text)"
        guard !seen.contains(idKey), !seen.contains(contentKey) else { return false }
        remember(idKey)
        remember(contentKey)
        return true
    }

    private mutating func remember(_ key: String) {
        seen.insert(key)
        keys.append(key)
        while keys.count > capacity * 2 {
            seen.remove(keys.removeFirst())
        }
    }
}
