import Testing
@testable import AILawCore

@Suite struct FingerPhraseMachineTests {
    let book = PhraseBook()
    let one = [HandFixture.hand(extended: [.index])]
    let three = [HandFixture.hand(extended: [.index, .middle, .ring])]
    let four = [HandFixture.hand(extended: [.index, .middle, .ring, .little])]
    let five = HandFixture.hand(extended: HandFixture.allFive)
    let fiveB = HandFixture.hand(extended: HandFixture.allFive, origin: (0.2, 0.85))

    /// Poll `k` (1-based) happens at now = (k-1) × 0.12, like the Lens.
    private func at(_ k: Int) -> Double { Double(k - 1) * 0.12 }

    private func firstAccepted(_ m: inout FingerPhraseMachine, _ hands: [HandLandmarks], _ q: TrackingQuality,
                               upTo k: Int = 60) -> Double? {
        for i in 1...k {
            _ = m.tick(hands: hands, quality: q, phrases: book, now: at(i))
            if m.result?.accepted == true { return at(i) }
        }
        return nil
    }

    @Test func acceptsAfterBalancedHoldWhenLocked() {
        var m = FingerPhraseMachine()
        let t = firstAccepted(&m, three, .locked)
        #expect(t == at(7)) // 0.72 s: first poll ≥ 0.7 s
        #expect(m.result?.display == "الحادث عند الإشارة")
        #expect(m.result?.fingers == 3)
        #expect(m.result?.role == .person)
    }

    @Test func weakTrackingNeedsLonger() {
        var m = FingerPhraseMachine()
        #expect(firstAccepted(&m, three, .weak) == at(10)) // 1.08 s: first poll ≥ 1.0 s
    }

    @Test func previewAppearsQuicklyEvenWhenWeak() {
        var m = FingerPhraseMachine()
        for k in 1...3 { _ = m.tick(hands: three, quality: .weak, phrases: book, now: at(k)) }
        #expect(m.result?.accepted == false)
        #expect(m.result?.display == "الحادث عند الإشارة")
    }

    @Test func presetsChangeSpeed() {
        var fast = FingerPhraseMachine(tuning: .preset(.fast))
        #expect(firstAccepted(&fast, three, .locked) == at(5)) // 0.48 s ≥ 0.45 s
        var accurate = FingerPhraseMachine(tuning: .preset(.accurate))
        #expect(firstAccepted(&accurate, three, .locked) == at(11)) // 1.2 s, like the web
    }

    @Test func singleMisreadDoesNotRestart() {
        var m = FingerPhraseMachine()
        var acceptedAt: Double?
        for k in 1...20 {
            let hands = k == 4 ? four : three
            _ = m.tick(hands: hands, quality: .locked, phrases: book, now: at(k))
            if acceptedAt == nil, m.result?.accepted == true { acceptedAt = at(k) }
        }
        #expect(acceptedAt == at(7))
        #expect(m.result?.fingers == 3)
    }

    @Test func holdOneFingerSwitchesToLawyer() {
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
        #expect(t >= 3.0)
        #expect(t - 0.12 < 3.0)
        #expect(m.role == .lawyer)
        #expect(m.roleHoldProgress == 0)
    }

    @Test func roleHoldWorksWithWeakTracking() {
        var m = FingerPhraseMachine()
        var switched = false
        for k in 1...40 where m.tick(hands: one, quality: .weak, phrases: book, now: at(k)) != nil {
            switched = true
        }
        #expect(switched)
        #expect(m.role == .lawyer)
    }

    @Test func noPhraseWhileHolding() {
        var m = FingerPhraseMachine()
        for k in 1...20 {
            _ = m.tick(hands: one, quality: .locked, phrases: book, now: at(k))
            #expect(m.result?.accepted != true)
        }
        #expect(m.roleHoldProgress > 0.5)
    }

    @Test func acceptsLawyerPhraseAfterSwitch() {
        var m = FingerPhraseMachine()
        var k = 1
        while m.tick(hands: one, quality: .locked, phrases: book, now: at(k)) == nil { k += 1 }
        _ = m.tick(hands: one, quality: .locked, phrases: book, now: at(k + 1))
        #expect(m.result?.accepted == true)
        #expect(m.result?.display == "السلام عليكم، أنا محاميك")
        #expect(m.result?.role == .lawyer)
        #expect(m.roleHoldProgress == 0)
    }

    @Test func lockedRoleIgnoresHold() {
        var m = FingerPhraseMachine(lockedRole: .lawyer)
        for k in 1...50 {
            let switched = m.tick(hands: one, quality: .locked, phrases: book, now: at(k))
            #expect(switched == nil)
            if k == 7 {
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

    @Test func flickerAtCameraRateNeverAccepts() {
        var m = FingerPhraseMachine()
        for (i, t) in stride(from: 0.0, through: 3.0, by: 1.0 / 30).enumerated() {
            _ = m.tick(hands: i % 2 == 0 ? [five, fiveB] : [five], quality: .locked, phrases: book, now: t)
            #expect(m.result?.accepted != true)
        }
    }

    @Test func lostResetsState() {
        var m = FingerPhraseMachine()
        _ = firstAccepted(&m, three, .locked)
        #expect(m.result?.accepted == true)
        _ = m.tick(hands: [], quality: .lost, phrases: book, now: 10)
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
