import Testing
@testable import AILawCore

@Suite struct WordSignTests {
    @Test(arguments: [
        (HandFixture.allFive, "السلام عليكم"),
        ([.thumb], "شكراً"),
        ([.index], "هنا"),
        ([], "يسكت"),
        ([.index, .middle], "مساعدة"),
        ([.index, .middle, .ring], "حب"),
        ([.thumb, .index, .little], "قلق"),
        ([.middle, .ring], "مرتبك"),
    ] as [(Set<Finger>, String)])
    func classifyWords(extended: Set<Finger>, display: String) {
        #expect(WordSignClassifier.classify(HandFixture.hand(extended: extended)).display == display)
    }

    @Test func greetingConfidence() {
        let p = WordSignClassifier.classify(HandFixture.hand(extended: HandFixture.allFive))
        #expect(p.label == "السلام عليكم")
        #expect(p.confidence == 0.72)
    }

    let huna = WordPrediction(label: "هنا", display: "هنا", confidence: 0.68)

    @Test func voterAcceptsAfterTwoLockedVotes() {
        var voter = WordSignVoter()
        let first = voter.add(huna, quality: .locked)
        #expect(first?.accepted == false)
        let second = voter.add(huna, quality: .locked)
        #expect(second?.accepted == true)
        #expect(second?.display == "هنا")
    }

    @Test func voterNeedsFourVotesWhenWeak() {
        var voter = WordSignVoter(threshold: 0.45)
        for _ in 1...3 {
            let r = voter.add(huna, quality: .weak)
            #expect(r?.accepted != true)
        }
        let fourth = voter.add(huna, quality: .weak)
        #expect(fourth?.accepted == true)
    }

    @Test func voterGuessWhenWeakHighConfidence() {
        var voter = WordSignVoter(threshold: 0.45)
        let greet = WordPrediction(label: "السلام عليكم", display: "السلام عليكم", confidence: 0.72)
        let r = voter.add(greet, quality: .weak)
        #expect(r?.accepted == false)
        #expect(r?.display == "السلام عليكم")
    }

    @Test func voterMixedPredictionsDoNotAccept() {
        var voter = WordSignVoter(threshold: 0.45)
        let other = WordPrediction(label: "حب", display: "حب", confidence: 0.62)
        for i in 0..<6 {
            let r = voter.add(i % 2 == 0 ? huna : other, quality: .weak)
            #expect(r?.accepted != true)
        }
    }

    @Test func arbiter() {
        let fingerAccepted = SignResult(fingers: 3, display: "f", role: .person, confidence: 0.9, accepted: true)
        let fingerPreview = SignResult(fingers: 3, display: "f", role: .person, confidence: 0.5, accepted: false)
        let wordStrong = SignResult(display: "w", confidence: 0.5, accepted: true)
        let wordWeak = SignResult(display: "w", confidence: 0.44, accepted: true)
        #expect(SignArbiter.pick(finger: fingerAccepted, word: wordStrong, wordEnabled: true) == fingerAccepted)
        #expect(SignArbiter.pick(finger: fingerPreview, word: wordStrong, wordEnabled: true) == wordStrong)
        #expect(SignArbiter.pick(finger: fingerPreview, word: wordWeak, wordEnabled: true) == fingerPreview)
        #expect(SignArbiter.pick(finger: nil, word: wordStrong, wordEnabled: false) == nil)
        #expect(SignArbiter.pick(finger: nil, word: wordWeak, wordEnabled: true) == wordWeak)
    }
}
