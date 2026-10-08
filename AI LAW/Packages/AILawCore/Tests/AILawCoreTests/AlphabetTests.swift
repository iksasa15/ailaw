import Testing
@testable import AILawCore

@Suite struct AlphabetClassifierTests {
    struct Case: CustomTestStringConvertible, Sendable {
        let extended: Set<Finger>
        let spacing: Double
        let letter: String
        let confidence: Double?
        var testDescription: String { "\(letter)" }
        init(_ extended: Set<Finger>, _ letter: String, _ confidence: Double? = nil, spacing: Double = 0.08) {
            self.extended = extended
            self.letter = letter
            self.confidence = confidence
            self.spacing = spacing
        }
    }

    @Test(arguments: [
        Case([.thumb], "أ"),
        Case([.index], "ب"),
        Case([.index, .middle], "ت"),
        Case([.index, .middle, .ring], "ث"),
        Case([.middle], "د"),
        Case([.ring], "ر"),
        Case([.little], "ي", 0.72),
        Case([.thumb, .little], "ي", 0.85),
        Case([.thumb, .index], "ل"),
        Case([.index, .middle, .ring, .little], "ب", 0.78),
        Case(HandFixture.allFive, "ش"),
        Case(HandFixture.allFive, "س", spacing: 0.06),
        Case([], "م"),
        Case([.index, .little], "لا"),
        Case([.thumb, .middle, .ring, .little], "ص"),
        Case([.thumb, .index, .middle], "ظ"),
        Case([.middle, .ring, .little], "ض"),
    ])
    func classifiesPatternTable(_ c: Case) {
        let guess = AlphabetClassifier.classify(HandFixture.hand(extended: c.extended, spacing: c.spacing))
        #expect(guess?.letter == c.letter)
        if let confidence = c.confidence { #expect(guess?.confidence == confidence) }
    }

    @Test(arguments: [
        Case(HandFixture.allFive, "ش"),
        Case(HandFixture.allFive, "س", spacing: 0.06),
        Case([.thumb, .index], "ل"),
        Case([.middle, .ring], "ف"),
    ])
    func sameLetterAtAnyDistance(_ c: Case) {
        // A hand twice as close or twice as far must read the same letter.
        let pinchNear: Finger? = c.letter == "ف" ? .index : nil
        let base = HandFixture.hand(extended: c.extended, spacing: c.spacing, thumbTipNear: pinchNear)
        for scale in [0.5, 2.0] {
            let wrist = base[.wrist]
            let scaled = HandLandmarks(points: base.points.map {
                Point3(wrist.x + ($0.x - wrist.x) * scale, wrist.y + ($0.y - wrist.y) * scale)
            })!
            #expect(AlphabetClassifier.classify(scaled)?.letter == c.letter)
        }
    }

    @Test func pinchFallthroughs() {
        #expect(AlphabetClassifier.classify(HandFixture.hand(extended: [.middle, .ring], thumbTipNear: .index))?.letter == "ف")
        #expect(AlphabetClassifier.classify(HandFixture.hand(extended: [.index, .ring], thumbTipNear: .index))?.letter == "ق")
    }

    @Test func nilHandIsNil() {
        #expect(AlphabetClassifier.classify(nil) == nil)
    }
}

@Suite struct AlphabetWriterTests {
    let ba = HandFixture.hand(extended: [.index])
    let ta = HandFixture.hand(extended: [.index, .middle])

    private func at(_ k: Int) -> Double { Double(k) * AlphabetWriter.tickInterval }

    @Test func writerAppendsAfterThreeSecondHold() {
        var w = AlphabetWriter()
        var appendedAt: [Int] = []
        for k in 0...60 where w.tick(hand: ba, quality: .locked, now: at(k)) {
            appendedAt.append(k)
        }
        #expect(appendedAt == [30, 60])
        #expect(w.text == "بب")
    }

    @Test func writerResetsHoldOnLetterChange() {
        var w = AlphabetWriter()
        for k in 0...20 { _ = w.tick(hand: ba, quality: .locked, now: at(k)) }
        #expect(w.holdProgress > 0.6)
        for k in 21...23 { _ = w.tick(hand: ta, quality: .locked, now: at(k)) }
        #expect(w.holdProgress < 0.1)
        #expect(w.current?.letter == "ت")
    }

    @Test func writerLostClearsCurrent() {
        var w = AlphabetWriter()
        for k in 0...30 { _ = w.tick(hand: ba, quality: .locked, now: at(k)) }
        _ = w.tick(hand: ba, quality: .lost, now: at(31))
        #expect(w.current == nil)
        #expect(w.holdProgress == 0)
        #expect(w.text == "ب")
    }

    @Test func writerIgnoresSingleMisread() {
        var w = AlphabetWriter(holdSeconds: 2)
        var appended: [Int] = []
        for k in 0...25 where w.tick(hand: k == 8 ? ta : ba, quality: .locked, now: at(k)) {
            appended.append(k)
        }
        #expect(appended == [20])
        #expect(w.text == "ب")
    }

    @Test func writerEditing() {
        var w = AlphabetWriter()
        for k in 0...30 { _ = w.tick(hand: ba, quality: .locked, now: at(k)) }
        w.space()
        w.space()
        #expect(w.text == "ب ")
        w.backspace()
        #expect(w.text == "ب")
        w.clear()
        #expect(w.text.isEmpty)
    }
}
