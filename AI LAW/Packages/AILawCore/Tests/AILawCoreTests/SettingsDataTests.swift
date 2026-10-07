import Foundation
import Testing
@testable import AILawCore

@Suite struct SettingsDataTests {
    @Test func settingsDefaultsWhenNil() {
        let s = SettingsData.decode(nil)
        #expect(s == SettingsData())
        #expect(s.fontScale == 1.0)
        #expect(s.overlayOpacity == 0.55)
        #expect(s.confidence == 0.38)
        #expect(s.receiveEnabled && s.sendEnabled && s.safetyEnabled)
        #expect(!s.arslEnabled && !s.onboarded)
        #expect(s.phrasePack == "accident-case-v1")
    }

    @Test func settingsPartialJSONKeepsDefaults() {
        let s = SettingsData.decode(Data(#"{"fontScale":1.3}"#.utf8))
        var expected = SettingsData()
        expected.fontScale = 1.3
        #expect(s == expected)
    }

    @Test func settingsOldPackResetsPhrases() {
        let s = SettingsData.decode(Data(#"{"phrasePack":"old","lawyerPhrases":{"1":"x"},"onboarded":true}"#.utf8))
        #expect(s.lawyerPhrases == PhraseBook.defaultLawyer)
        #expect(s.phrasePack == "accident-case-v1")
        #expect(s.onboarded)
    }

    @Test func settingsMergesCustomPhrases() {
        let s = SettingsData.decode(Data(#"{"phrasePack":"accident-case-v1","personPhrases":{"3":"نص جديد","4":"  "}}"#.utf8))
        #expect(s.personPhrases[3] == "نص جديد")
        #expect(s.personPhrases[4] == PhraseBook.defaultPerson[4])
        #expect(s.phraseBook.phrase(for: .person, fingers: 3) == "نص جديد")
    }

    @Test func settingsGarbageFallsBackToDefaults() {
        #expect(SettingsData.decode(Data("not json".utf8)) == SettingsData())
    }

    @Test func settingsRoundTrip() {
        var s = SettingsData()
        s.fontScale = 1.2
        s.arslEnabled = true
        s.lawyerPhrases[2] = "سؤال معدّل"
        #expect(SettingsData.decode(s.encoded()) == s)
    }
}
