import Foundation

public struct ConversationEntry: Equatable, Sendable, Identifiable {
    public let id: UUID
    public let role: Role
    public let text: String
    /// Milliseconds since 1970.
    public let at: Int64
}

/// Everything said or signed in the current conversation, oldest first, for the
/// «سجل المحادثة» sheet and its text export.
public struct ConversationLog: Sendable {
    public let limit: Int
    public private(set) var entries: [ConversationEntry] = []
    private var seen: Set<UUID> = []

    public init(limit: Int = 200) {
        self.limit = limit
    }

    /// Records a phrase once, even if it was both shown and published.
    public mutating func record(_ phrase: ScenePhrase) {
        guard seen.insert(phrase.id).inserted else { return }
        let entry = ConversationEntry(id: phrase.id, role: phrase.role, text: phrase.text, at: phrase.at)
        let index = entries.lastIndex { $0.at <= entry.at }.map { $0 + 1 } ?? 0
        entries.insert(entry, at: index)
        if entries.count > limit {
            let dropped = entries.prefix(entries.count - limit)
            dropped.forEach { seen.remove($0.id) }
            entries.removeFirst(entries.count - limit)
        }
    }

    public mutating func clear() {
        entries = []
        seen = []
    }

    /// One line per entry: "[HH:mm:ss] المحامي: …".
    public func exportText(timeZone: TimeZone = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "HH:mm:ss"
        return entries.map { entry in
            let time = formatter.string(from: Date(timeIntervalSince1970: Double(entry.at) / 1000))
            let who = entry.role == .lawyer ? "المحامي" : "الشخص"
            return "[\(time)] \(who): \(entry.text)"
        }.joined(separator: "\n")
    }
}
