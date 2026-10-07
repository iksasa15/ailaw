import Testing
@testable import AILawCore

@Suite struct FingerCounterTests {
    @Test(arguments: [
        (Set<Finger>(), 0),
        ([.index], 1),
        ([.index, .middle], 2),
        ([.index, .middle, .ring], 3),
        ([.index, .middle, .ring, .little], 4),
        (HandFixture.allFive, 5),
    ] as [(Set<Finger>, Int)])
    func countsSingleHand(extended: Set<Finger>, expected: Int) {
        #expect(FingerCounter.count(HandFixture.hand(extended: extended)) == expected)
    }

    @Test func countsTwoHandsUpToTen() {
        let a = HandFixture.hand(extended: HandFixture.allFive)
        let b = HandFixture.hand(extended: HandFixture.allFive, origin: (0.2, 0.85))
        #expect(FingerCounter.count(hands: [a, b]) == 10)
        #expect(FingerCounter.count(hands: []) == 0)
    }

    @Test func flagsPattern() {
        let flags = FingerCounter.flags(HandFixture.hand(extended: [.thumb, .little]))
        #expect(flags.pattern == "10001")
        #expect(flags.count == 2)
    }

    @Test func smootherBlends() {
        var smoother = HandSmoother()
        let first = HandFixture.hand(extended: [.index])
        _ = smoother.smooth([first])
        let moved = HandFixture.hand(extended: [.index], origin: (0.6, 0.85))
        let out = smoother.smooth([moved])
        #expect(abs(out[0][.wrist].x - (0.5 + 0.035)) < 1e-9)
    }

    @Test func smootherKeepsHandsMatchedWhenOrderSwaps() {
        // Vision does not keep a stable hand order between frames.
        let left = HandFixture.hand(extended: HandFixture.allFive, origin: (0.25, 0.85))
        let right = HandFixture.hand(extended: HandFixture.allFive, origin: (0.75, 0.85))
        var smoother = HandSmoother()
        var meter = TrackingQualityMeter()
        var previous: [HandLandmarks] = []
        for i in 0..<14 {
            let out = smoother.smooth(i % 2 == 0 ? [left, right] : [right, left])
            _ = meter.update(previous: previous, current: out)
            previous = out
            #expect(FingerCounter.count(hands: out) == 10)
        }
        #expect(meter.quality == .locked)
    }

    @Test func motionIsOneWhenMissing() {
        #expect(landmarkMotion(nil, HandFixture.hand(extended: [])) == 1)
    }
}

@Suite struct TrackingQualityTests {
    let hand = HandFixture.hand(extended: [.index])

    private func lockedMeter() -> TrackingQualityMeter {
        var meter = TrackingQualityMeter()
        _ = meter.update(previous: [], current: [hand])
        for _ in 0..<10 { _ = meter.update(previous: [hand], current: [hand]) }
        return meter
    }

    @Test func qualityLockedAfterTenStillFrames() {
        var meter = TrackingQualityMeter()
        #expect(meter.quality == .lost)
        #expect(meter.update(previous: [], current: [hand]) == .weak)
        for _ in 0..<9 { #expect(meter.update(previous: [hand], current: [hand]) == .weak) }
        #expect(meter.update(previous: [hand], current: [hand]) == .locked)
    }

    @Test func qualityDropsToWeakOnJump() {
        var meter = lockedMeter()
        let jumped = HandFixture.hand(extended: [.index], origin: (0.6, 0.85))
        #expect(meter.update(previous: [hand], current: [jumped]) == .weak)
    }

    @Test func qualityLostAfterFiveEmptyFrames() {
        var meter = lockedMeter()
        for _ in 0..<4 { #expect(meter.update(previous: [hand], current: []) == .locked) }
        #expect(meter.update(previous: [], current: []) == .lost)
    }
}
