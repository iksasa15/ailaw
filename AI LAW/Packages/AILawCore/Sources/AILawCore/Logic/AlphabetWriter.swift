/// Letters mode: a letter is written only after the same shape is held `holdSeconds`
/// (port of web useAlphabetSign).
public struct AlphabetWriter: Sendable {
    public static let tickInterval = 0.1

    public let holdSeconds: Double
    public let appendCooldown: Double

    public private(set) var text = ""
    public private(set) var current: LetterGuess?
    public private(set) var holdProgress: Double = 0

    private var filter = ReadingFilter<String>()
    private var holdLetter: String?
    private var holdStart: Double = 0
    private var lastAppendAt: Double = -.infinity
    private var lastAppendLetter = ""

    public init(holdSeconds: Double = 3, appendCooldown: Double = 0.5) {
        self.holdSeconds = holdSeconds
        self.appendCooldown = appendCooldown
    }

    /// Returns true on the tick a letter is appended (UI pulse).
    public mutating func tick(hand: HandLandmarks?, quality: TrackingQuality, now: Double) -> Bool {
        guard quality != .lost else {
            filter.reset()
            resetHold()
            return false
        }
        let raw = AlphabetClassifier.classify(hand)
        // One misread frame must not restart the hold (ReadingFilter).
        guard let letter = filter.add(raw?.letter, now: now) else {
            resetHold()
            return false
        }
        let hit = raw?.letter == letter ? raw! : LetterGuess(letter: letter, confidence: current?.confidence ?? 0.5)
        if holdLetter != hit.letter {
            holdLetter = hit.letter
            holdStart = now
            holdProgress = 0
        }
        let elapsed = now - holdStart
        holdProgress = min(1, elapsed / holdSeconds)
        current = hit

        guard elapsed >= holdSeconds else { return false }
        guard now - lastAppendAt >= appendCooldown else { return false }
        if lastAppendLetter == hit.letter && now - lastAppendAt < appendCooldown * 2 { return false }

        lastAppendAt = now
        lastAppendLetter = hit.letter
        text += hit.letter
        holdStart = now
        holdProgress = 0
        return true
    }

    public mutating func backspace() {
        if !text.isEmpty { text.removeLast() }
    }

    public mutating func space() {
        if !text.hasSuffix(" ") { text += " " }
    }

    public mutating func clear() {
        text = ""
        lastAppendLetter = ""
        filter.reset()
        resetHold()
    }

    private mutating func resetHold() {
        holdLetter = nil
        holdStart = 0
        current = nil
        holdProgress = 0
    }
}
