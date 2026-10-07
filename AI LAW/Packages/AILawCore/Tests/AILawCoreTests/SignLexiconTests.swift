import Testing
@testable import AILawCore

@Suite struct SignLexiconTests {
    @Test func resolveByFingers() {
        let clips = SignLexicon.resolve(text: nil, fingers: 3, spellLetters: false)
        #expect(clips?.map(\.label) == ["أين", "وقع الحادث"])
        #expect(clips?.first?.fileName == "word-where.mp4")
    }

    @Test func resolveExactPhrase() {
        #expect(SignLexicon.resolve(text: "السلام عليكم، أنا محاميك", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[1])
    }

    @Test func resolveContainedPhrase() {
        #expect(SignLexicon.resolve(text: "قال أين وقع الحادث الآن", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[3])
    }

    @Test func resolveMatchesWithoutPunctuationOrHamza() {
        #expect(SignLexicon.resolve(text: "ماذا حدث بالضبط", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[2])
        #expect(SignLexicon.resolve(text: "اين وقع الحادث", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[3])
        #expect(SignLexicon.resolve(text: "ـسأتابع القضية غدا", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[10])
        #expect(SignLexicon.fold("أيـن") == "اين")
    }

    @Test func resolvePicksMostRecentContainedPhrase() {
        // The live caption accumulates: the newest phrase is the rightmost one.
        #expect(SignLexicon.resolve(text: "السلام عليكم أنا محاميك ماذا حدث بالضبط", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[2])
        #expect(SignLexicon.resolve(text: "أين وقع الحادث هل لديك تقرير شرطة", fingers: nil, spellLetters: false) == SignLexicon.lawyerClips[4])
    }

    @Test func fingerspellWord() {
        #expect(SignLexicon.fingerspell("مرحبا").map(\.resource) == ["meem", "ra", "ha", "ba", "alef"])
        #expect(SignLexicon.fingerspell("مرحبا").allSatisfy { $0.kind == .letter })
        #expect(SignLexicon.fingerspell("مرحبا").first?.fileName == "meem.jpg")
    }

    @Test func fingerspellLamAlefDigraph() {
        #expect(SignLexicon.fingerspell("لا").map(\.resource) == ["la"])
    }

    @Test func fingerspellIgnoresTashkeel() {
        #expect(SignLexicon.fingerspell("شُكْرًا") == SignLexicon.fingerspell("شكرا"))
        #expect(!SignLexicon.fingerspell("شكرا").isEmpty)
    }

    @Test func fingerspellTaMarbuta() {
        #expect(SignLexicon.fingerspell("قضية").last?.resource == "ta_marbuta")
    }

    @Test func fingerspellCaps() {
        #expect(SignLexicon.fingerspell(String(repeating: "ب", count: 100)).count == 48)
    }

    @Test func spellLettersForcesSpelling() {
        let clips = SignLexicon.resolve(text: PhraseBook.defaultLawyer[1], fingers: 1, spellLetters: true)
        #expect(clips?.isEmpty == false)
        #expect(clips?.allSatisfy { $0.kind == .letter } == true)
    }

    @Test func unknownTextIsSpelled() {
        let clips = SignLexicon.resolve(text: "مرحبا", fingers: nil, spellLetters: false)
        #expect(clips?.map(\.resource) == ["meem", "ra", "ha", "ba", "alef"])
    }

    @Test func resolveEmpty() {
        #expect(SignLexicon.resolve(text: "", fingers: nil, spellLetters: false) == nil)
        #expect(SignLexicon.resolve(text: "!!!", fingers: nil, spellLetters: false) == nil)
        #expect(SignLexicon.resolve(text: nil, fingers: nil, spellLetters: false) == nil)
    }

    @Test func normalizeStripsTashkeelAndSymbols() {
        #expect(SignLexicon.normalize("  شُكْرًا!!  جزيلاً ") == "شكرا جزيلا")
    }
}
