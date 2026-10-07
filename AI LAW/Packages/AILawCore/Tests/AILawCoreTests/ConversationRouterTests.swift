import Foundation
import Testing
@testable import AILawCore

@Suite struct ConversationRouterTests {
    static let fixedID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
    let L1 = PhraseBook.defaultLawyer[1]!
    let P3 = PhraseBook.defaultPerson[3]!

    private func router(_ mode: LensMode) -> ConversationRouter {
        ConversationRouter(mode: mode, makeID: { Self.fixedID })
    }

    private func p(_ role: Role, _ text: String, _ fingers: Int?, _ at: Int64, id: UUID = fixedID) -> ScenePhrase {
        ScenePhrase(id: id, role: role, text: text, fingers: fingers, at: at)
    }

    private func accepted(_ fingers: Int?, _ display: String, _ role: Role?) -> SignResult {
        SignResult(fingers: fingers, display: display, role: role, confidence: 0.9, accepted: true)
    }

    @Test func soloLawyerAccepted() {
        var r = router(.solo)
        let actions = r.signResult(accepted(1, L1, .lawyer), currentRole: .lawyer, roleHoldProgress: 0, now: 1000)
        let x = p(.lawyer, L1, 1, 1000)
        #expect(actions == [.showLawyerPhrase(x), .publish(x), .speak(L1), .pulse])
        #expect(r.lawyerPhrase == x)
    }

    @Test func duplicateKeyIgnored() {
        var r = router(.solo)
        _ = r.signResult(accepted(1, L1, .lawyer), currentRole: .lawyer, roleHoldProgress: 0, now: 1000)
        #expect(r.signResult(accepted(1, L1, .lawyer), currentRole: .lawyer, roleHoldProgress: 0, now: 1100).isEmpty)
    }

    @Test func unacceptedIgnored() {
        var r = router(.solo)
        let preview = SignResult(fingers: 3, display: P3, role: .person, confidence: 0.5, accepted: false)
        #expect(r.signResult(preview, currentRole: .person, roleHoldProgress: 0, now: 1000).isEmpty)
    }

    @Test func soloRoleHoldSuppressesOneAndTwo() {
        var solo = router(.solo)
        let two = accepted(2, PhraseBook.defaultPerson[2]!, .person)
        #expect(solo.signResult(two, currentRole: .person, roleHoldProgress: 0.5, now: 1000).isEmpty)
        var dedicated = router(.dedicated(.lawyer))
        #expect(!dedicated.signResult(two, currentRole: .lawyer, roleHoldProgress: 0.5, now: 1000).isEmpty)
    }

    @Test func dedicatedPersonPublishesSilently() {
        var r = router(.dedicated(.person))
        let actions = r.signResult(accepted(3, P3, .person), currentRole: .person, roleHoldProgress: 0, now: 1000)
        #expect(actions == [.publish(p(.person, P3, 3, 1000)), .pulse])
        #expect(r.lastPersonPhrase == p(.person, P3, 3, 1000))
    }

    @Test func dedicatedLawyerSpeaksRemotePerson() {
        var r = router(.dedicated(.lawyer))
        let personP = p(.person, P3, 3, 500, id: UUID())
        #expect(r.remote(.phrase(personP)) == [.showRemotePerson(personP), .speak(P3)])
        #expect(r.remote(.phrase(personP)).isEmpty)
    }

    @Test func snapshotPersonShownNotSpoken() {
        var r = router(.dedicated(.lawyer))
        let personP = p(.person, P3, 3, 500, id: UUID())
        #expect(r.remote(.snapshot(lawyer: nil, person: personP)) == [.showRemotePerson(personP)])
    }

    @Test func remoteLawyerShownOnPersonPhone() {
        var r = router(.dedicated(.person))
        let lawyerP = p(.lawyer, L1, nil, 700, id: UUID())
        #expect(r.remote(.phrase(lawyerP)) == [.showLawyerPhrase(lawyerP)])
        #expect(r.lawyerPhrase == lawyerP)
    }

    @Test func olderRemoteLawyerIgnored() {
        var r = router(.solo)
        _ = r.signResult(accepted(1, L1, .lawyer), currentRole: .lawyer, roleHoldProgress: 0, now: 2000)
        let older = p(.lawyer, "قديم", nil, 1500, id: UUID())
        #expect(r.remote(.phrase(older)).isEmpty)
        #expect(r.lawyerPhrase?.at == 2000)
    }

    @Test func speechSnippetDedicatedLawyer() {
        var r = router(.dedicated(.lawyer))
        let x = p(.lawyer, "أين وقع الحادث", nil, 1000)
        #expect(r.speechSnippet("أين وقع الحادث", currentRole: .lawyer, now: 1000) == [.showLawyerPhrase(x), .publish(x)])
        #expect(r.speechSnippet("أين وقع الحادث", currentRole: .lawyer, now: 1200).isEmpty)
    }

    @Test func speechSnippetSoloPerson() {
        var r = router(.solo)
        let x = p(.lawyer, "مرحبا", nil, 1000)
        #expect(r.speechSnippet("مرحبا", currentRole: .person, now: 1000) == [.showLawyerPhrase(x)])
    }

    @Test func alphabetSend() {
        var person = router(.dedicated(.person))
        #expect(person.alphabetSend("سلام", now: 1000) == [.publish(p(.person, "سلام", nil, 1000))])
        var solo = router(.solo)
        #expect(solo.alphabetSend(" سلام ", now: 1000) == [.publish(p(.person, "سلام", nil, 1000)), .speak("سلام")])
        #expect(solo.alphabetSend("   ", now: 1000).isEmpty)
    }

    @Test func roleChangedAnnouncesAndResets() {
        var r = router(.solo)
        let result = accepted(5, PhraseBook.defaultLawyer[5]!, .lawyer)
        _ = r.signResult(result, currentRole: .lawyer, roleHoldProgress: 0, now: 1000)
        #expect(r.roleChanged(to: .lawyer) == [.speak("وضع المحامي")])
        #expect(!r.signResult(result, currentRole: .lawyer, roleHoldProgress: 0, now: 1100).isEmpty)
    }

    @Test func dedicatedIgnoresRoleChanged() {
        var r = router(.dedicated(.person))
        #expect(r.roleChanged(to: .lawyer).isEmpty)
    }

    @Test func resetSpokenAllowsRepeat() {
        var r = router(.solo)
        let result = accepted(4, PhraseBook.defaultPerson[4]!, .person)
        _ = r.signResult(result, currentRole: .person, roleHoldProgress: 0, now: 1000)
        r.resetSpoken()
        #expect(!r.signResult(result, currentRole: .person, roleHoldProgress: 0, now: 1100).isEmpty)
    }

    @Test func snapshotCarriesLatest() {
        var r = router(.dedicated(.person))
        _ = r.signResult(accepted(3, P3, .person), currentRole: .person, roleHoldProgress: 0, now: 1000)
        let lawyerP = p(.lawyer, L1, 1, 900, id: UUID())
        _ = r.remote(.phrase(lawyerP))
        #expect(r.snapshot() == .snapshot(lawyer: lawyerP, person: p(.person, P3, 3, 1000)))
    }
}
