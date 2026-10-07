/// The latest chunk of live speech sent to the sign translator (web Home.jsx STT effect).
public enum SpeechSnippet {
    /// The last `maxWords` words, or nil when the trimmed text is shorter than 2 characters.
    public static func latest(in text: String, maxWords: Int = 12) -> String? {
        let words = text.split(whereSeparator: { $0.isWhitespace })
        let trimmed = words.joined(separator: " ")
        guard trimmed.count >= 2 else { return nil }
        return words.suffix(maxWords).joined(separator: " ")
    }
}

/// Live caption text across recognition restarts, bounded to `maxCharacters` at word boundaries.
public struct TranscriptAccumulator: Sendable {
    public let maxCharacters: Int
    public private(set) var committed = ""
    public private(set) var current = ""

    public init(maxCharacters: Int = 400) {
        self.maxCharacters = maxCharacters
    }

    public var text: String {
        let joined = [committed, current].filter { !$0.isEmpty }.joined(separator: " ")
        return Self.tail(joined, maxCharacters: maxCharacters)
    }

    public mutating func update(partial: String) {
        current = partial.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    public mutating func commit() {
        committed = text
        current = ""
    }

    public mutating func clear() {
        committed = ""
        current = ""
    }

    /// Drops whole words from the front until the text fits.
    static func tail(_ s: String, maxCharacters: Int) -> String {
        guard s.count > maxCharacters else { return s }
        var words = s.split(separator: " ")
        var length = s.count
        while length > maxCharacters, words.count > 1 {
            length -= words.removeFirst().count + 1
        }
        let out = words.joined(separator: " ")
        return out.count > maxCharacters ? String(out.suffix(maxCharacters)) : out
    }
}
