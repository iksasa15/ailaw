import Testing
@testable import AILawCore

@Suite struct CoreTypesTests {
    @Test func handLandmarksRequires21Points() {
        #expect(HandLandmarks(points: Array(repeating: Point3(0, 0), count: 20)) == nil)
        #expect(HandLandmarks(points: Array(repeating: Point3(0, 0), count: 21)) != nil)
    }

    private func joints(of hand: HandLandmarks, confidence: (Joint) -> Double = { _ in 0.9 })
        -> [Joint: (point: Point3, confidence: Double)] {
        var out: [Joint: (point: Point3, confidence: Double)] = [:]
        for j in Joint.allCases { out[j] = (hand[j], confidence(j)) }
        return out
    }

    @Test func fromJointsKeepsMediaPipeOrder() {
        let hand = HandFixture.hand(extended: [.index, .middle])
        let rebuilt = HandLandmarks.fromJoints(joints(of: hand))
        #expect(rebuilt?.points == hand.points)
    }

    @Test func fromJointsRejectsMostlyUnconfidentHand() {
        let hand = HandFixture.hand(extended: HandFixture.allFive)
        let weak: Set<Joint> = [.thumbTip, .indexTip, .middleTip, .ringTip, .littleTip, .indexDIP]
        let mostlyWeak = joints(of: hand) { weak.contains($0) ? 0.1 : 0.9 }
        #expect(HandLandmarks.fromJoints(mostlyWeak) == nil)

        var missing = joints(of: hand)
        missing[.wrist] = nil
        #expect(HandLandmarks.fromJoints(missing) == nil)

        let fiveWeak = joints(of: hand) { [.thumbTip, .indexTip, .middleTip, .ringTip, .littleTip].contains($0) ? 0.1 : 0.9 }
        #expect(HandLandmarks.fromJoints(fiveWeak) != nil)
    }

    @Test func phraseBookDefaults() {
        let book = PhraseBook()
        #expect(book.phrase(for: .lawyer, fingers: 1) == "السلام عليكم، أنا محاميك")
        #expect(book.phrase(for: .person, fingers: 10) == "أعتمد عليك")
        #expect(book.phrase(for: .person, fingers: 0) == nil)
        #expect(book.phrase(for: .lawyer, fingers: 11) == nil)
    }

    @Test func phraseBookMergeTrimsAndFallsBack() {
        let merged = PhraseBook.merge([3: "  نص  ", 4: "   "], defaults: PhraseBook.defaultPerson)
        #expect(merged[3] == "نص")
        #expect(merged[4] == PhraseBook.defaultPerson[4])
        #expect(merged.count == 10)
    }

    @Test func caseScenarioShape() {
        let lines = CaseScenario.lines
        #expect(lines.count == 20)
        for (i, line) in lines.enumerated() {
            #expect(line.role == (i % 2 == 0 ? .lawyer : .person))
            #expect(line.fingers == i / 2 + 1)
        }
        #expect(lines[19].text == "أعتمد عليك")
        #expect(CaseScenario.title == "جلسة حادث مروري")
    }

    @Test func roleLabels() {
        #expect(Role.lawyer.label == "محامي")
        #expect(Role.person.modeAnnouncement == "وضع الشخص")
    }
}
