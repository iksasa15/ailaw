import Testing
@testable import AILawCore

@Suite struct TranscriptTests {
    @Test func snippetEdges() {
        #expect(SpeechSnippet.latest(in: "  ") == nil)
        #expect(SpeechSnippet.latest(in: "ا") == nil)
        #expect(SpeechSnippet.latest(in: " مرحبا ") == "مرحبا")
    }

    @Test func snippetFromVeryLongText() {
        let text = (1...500).map { "w\($0)" }.joined(separator: "  ")
        #expect(SpeechSnippet.latest(in: text) == (489...500).map { "w\($0)" }.joined(separator: " "))
    }

    @Test func accumulatorJoins() {
        var a = TranscriptAccumulator()
        a.update(partial: "مرحبا")
        #expect(a.text == "مرحبا")
        a.commit()
        a.update(partial: "كيف")
        #expect(a.text == "مرحبا كيف")
        a.update(partial: "كيف حالك")
        #expect(a.text == "مرحبا كيف حالك")
    }

    @Test func accumulatorCapsAtWordBoundary() {
        var a = TranscriptAccumulator()
        for _ in 0..<200 {
            a.update(partial: "كلمة طويلة")
            a.commit()
        }
        #expect(a.text.count <= 400)
        #expect(a.text.count > 350)
        #expect(a.text.split(separator: " ").allSatisfy { $0 == "كلمة" || $0 == "طويلة" })
    }

    @Test func accumulatorCapsLongPartial() {
        var a = TranscriptAccumulator()
        a.update(partial: Array(repeating: "كلام", count: 300).joined(separator: " "))
        #expect(a.text.count <= 400)
        #expect(a.text.hasSuffix("كلام"))
    }

    @Test func accumulatorClear() {
        var a = TranscriptAccumulator()
        a.update(partial: "نص")
        a.commit()
        a.clear()
        #expect(a.text.isEmpty)
    }
}
