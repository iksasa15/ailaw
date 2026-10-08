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
            _ = meter.update(previous: previous, current: out, dt: 1.0 / 30)
            previous = out
            #expect(FingerCounter.count(hands: out) == 10)
        }
        #expect(meter.quality == .locked)
    }

    @Test func smootherAlphaFollowsFrameTime() {
        // Same smoothing per second at any frame rate: at 15 fps one frame weighs 1-(0.65)^2.
        var smoother = HandSmoother()
        _ = smoother.smooth([HandFixture.hand(extended: [.index])], dt: 1.0 / 15)
        let out = smoother.smooth([HandFixture.hand(extended: [.index], origin: (0.6, 0.85))], dt: 1.0 / 15)
        #expect(abs(out[0][.wrist].x - (0.5 + 0.1 * (1 - 0.65 * 0.65))) < 1e-9)
    }

    @Test func motionIsOneWhenMissing() {
        #expect(landmarkMotion(nil, HandFixture.hand(extended: [])) == 1)
    }
}

@Suite struct TrackingQualityTests {
    let hand = HandFixture.hand(extended: [.index])
    let dt = 0.05 // 20 fps

    private func lockedMeter() -> TrackingQualityMeter {
        var meter = TrackingQualityMeter()
        _ = meter.update(previous: [], current: [hand], dt: dt)
        for _ in 0..<6 { _ = meter.update(previous: [hand], current: [hand], dt: dt) }
        return meter
    }

    @Test func lockedAfterThreeTenthsOfASecondStill() {
        var meter = TrackingQualityMeter()
        #expect(meter.quality == .lost)
        #expect(meter.update(previous: [], current: [hand], dt: dt) == .weak)
        for _ in 0..<5 { #expect(meter.update(previous: [hand], current: [hand], dt: dt) == .weak) }
        #expect(meter.update(previous: [hand], current: [hand], dt: dt) == .locked) // 0.30 s still
    }

    @Test func lockingTimeDoesNotDependOnFrameRate() {
        // Same 0.6 s of a still hand at 8 fps and at 30 fps → both locked (frame counts differ 4×).
        for fps in [8.0, 30.0] {
            var meter = TrackingQualityMeter()
            _ = meter.update(previous: [], current: [hand], dt: 1 / fps)
            for _ in 0..<Int(0.6 * fps) { _ = meter.update(previous: [hand], current: [hand], dt: 1 / fps) }
            #expect(meter.quality == .locked)
        }
    }

    @Test func slowDriftCountsAsStillAtLowFrameRate() {
        // 0.2 units/s of drift: per-frame motion is 4× larger at 8 fps than at 30 fps,
        // but the speed is the same, so both must lock.
        for fps in [8.0, 30.0] {
            var meter = TrackingQualityMeter()
            var prev: [HandLandmarks] = []
            for k in 0...Int(fps) {
                let moved = HandFixture.hand(extended: [.index], origin: (0.5 + 0.2 * Double(k) / fps, 0.85))
                _ = meter.update(previous: prev, current: [moved], dt: 1 / fps)
                prev = [moved]
            }
            #expect(meter.quality == .locked)
        }
    }

    @Test func qualityDropsToWeakOnJump() {
        var meter = lockedMeter()
        let jumped = HandFixture.hand(extended: [.index], origin: (0.6, 0.85))
        #expect(meter.update(previous: [hand], current: [jumped], dt: dt) == .weak)
    }

    @Test func lostAfterThreeTenthsOfASecondWithoutHand() {
        var meter = lockedMeter()
        for _ in 0..<5 { #expect(meter.update(previous: [hand], current: [], dt: dt) == .locked) }
        #expect(meter.update(previous: [], current: [], dt: dt) == .lost)
    }
}
