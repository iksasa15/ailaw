import Testing
@testable import AILawCore

@Suite struct FingerPhraseMachineTests {
    let book = PhraseBook()
    let one = [HandFixture.hand(extended: [.index])]
    let three = [HandFixture.hand(extended: [.index, .middle, .ring])]
    let five = HandFixture.hand(extended: HandFixture.allFive)
    let fiveB = HandFixture.hand(extended: HandFixture.allFive, origin: (0.2, 0.85))

    /// Tick `k` (1-based) happens at now = (k-1) × 0.12.
    private func at(_ k: Int) -> Double { Double(k - 1) * FingerPhraseMachine.tickInterval }

    @Test func acceptsAfterTenStableTicksWhenLocked() {
        var m = FingerPhraseMachine()
        for k in 1...9 { _ = m.tick(hands: three, quality: .locked, phrases: book, now: at(k)) }
        #expect(m.result?.accepted == false)
        #expect(m.result?.display == "الحادث عند الإشارة")
        _ = m.tick(hands: three, quality: .locked, phrases: book, now: at(10))
        #expect(m.result?.accepted == true)
        #expect(m.result?.fingers == 3)
        #expect(m.result?.role == .person)
    }

    @Test func needsFourteenTicksWhenWeak() {
        var m = FingerPhraseMachine()
        for k in 1...13 {
            _ = m.tick(hands: three, quality: .weak, phrases: book, now: at(k))
            #expect(m.result == nil)
        }
        _ = m.tick(hands: three, quality: .weak, phrases: book, now: at(14))
        #expect(m.result?.accepted == true)
    }

    @Test func holdOneFingerFiveSecondsSwitchesToLawyer() {
        var m = FingerPhraseMachine()
        var switchedAt: Double?
        for k in 1...60 {
            if let role = m.tick(hands: one, quality: .locked, phrases: book, now: at(k)) {
                #expect(role == .lawyer)
                switchedAt = at(k)
                #expect(m.result?.accepted != true) // never speak the old role's phrase on the switch tick
                break
            }
        }
        let t = try! #require(switchedAt)
        #expect(t >= 5.0)
        #expect(t - FingerPhraseMachine.tickInterval < 5.0)
        #expect(m.role == .lawyer)
        #expect(m.roleHoldProgress == 0)
    }

    @Test func noPhraseWhileHolding() {
        var m = FingerPhraseMachine()
        for k in 1...20 {
            _ = m.tick(hands: one, quality: .locked, phrases: book, now: at(k))
            #expect(m.result?.accepted != true)
        }
        #expect(m.roleHoldProgress > 0.4)
    }

    @Test func acceptsLawyerPhraseAfterSwitch() {
        var m = FingerPhraseMachine()
        var k = 1
        while m.tick(hands: one, quality: .locked, phrases: book, now: at(k)) == nil { k += 1 }
        for j in 1...10 { _ = m.tick(hands: one, quality: .locked, phrases: book, now: at(k + j)) }
        #expect(m.result?.accepted == true)
        #expect(m.result?.display == "السلام عليكم، أنا محاميك")
        #expect(m.result?.role == .lawyer)
    }

    @Test func lockedRoleIgnoresHold() {
        var m = FingerPhraseMachine(lockedRole: .lawyer)
        for k in 1...50 {
            let switched = m.tick(hands: one, quality: .locked, phrases: book, now: at(k))
            #expect(switched == nil)
            if k == 10 {
                #expect(m.result?.accepted == true)
                #expect(m.result?.display == "السلام عليكم، أنا محاميك")
            }
        }
        #expect(m.role == .lawyer)
    }

    @Test func secondHandFlickerNeverAccepts() {
        var m = FingerPhraseMachine()
        for k in 1...30 {
            let hands = k % 2 == 0 ? [five, fiveB] : [five]
            _ = m.tick(hands: hands, quality: .locked, phrases: book, now: at(k))
            #expect(m.result?.accepted != true)
        }
    }

    @Test func lostResetsState() {
        var m = FingerPhraseMachine()
        for k in 1...10 { _ = m.tick(hands: three, quality: .locked, phrases: book, now: at(k)) }
        #expect(m.result?.accepted == true)
        _ = m.tick(hands: [], quality: .lost, phrases: book, now: at(11))
        #expect(m.result == nil)
        #expect(m.roleHoldProgress == 0)
    }

    @Test func manualSetRole() {
        var m = FingerPhraseMachine()
        let first = m.setRole(.lawyer)
        let second = m.setRole(.lawyer)
        #expect(first)
        #expect(!second)
        #expect(m.role == .lawyer)
        var locked = FingerPhraseMachine(lockedRole: .person)
        let lockedChanged = locked.setRole(.lawyer)
        #expect(!lockedChanged)
        #expect(locked.role == .person)
    }
}
