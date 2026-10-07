import Testing
@testable import AILawCore

@Suite struct ObstacleDetectorTests {
    let w = ObstacleDetector.width
    let h = ObstacleDetector.height
    var uniform: [Float] { Array(repeating: 120, count: w * h) }
    var dark: [Float] { Array(repeating: 5, count: w * h) }
    var checkerboard: [Float] {
        (0..<(w * h)).map { i in ((i % w) + (i / w)) % 2 == 0 ? 0 : 255 }
    }

    private func at(_ k: Int) -> Double { Double(k - 1) * ObstacleDetector.tickInterval }

    @Test func uniformFrameAlertsOnSixth() {
        var d = ObstacleDetector()
        for k in 1...5 { #expect(d.ingest(gray: uniform, now: at(k)).near == false) }
        let sixth = d.ingest(gray: uniform, now: at(6))
        #expect(sixth.near)
        #expect(sixth.shouldAlert)
        let seventh = d.ingest(gray: uniform, now: at(7))
        #expect(seventh.near)
        #expect(!seventh.shouldAlert)
    }

    @Test func alertCooldown() {
        var d = ObstacleDetector()
        var alerts: [Double] = []
        for k in 1...60 where d.ingest(gray: uniform, now: at(k)).shouldAlert {
            alerts.append(at(k))
        }
        #expect(alerts.count >= 2)
        #expect(alerts[1] - alerts[0] > 4.5)
        #expect(alerts[1] - ObstacleDetector.tickInterval - alerts[0] <= 4.5)
    }

    @Test func checkerboardNeverNear() {
        var d = ObstacleDetector()
        for k in 1...20 { #expect(!d.ingest(gray: checkerboard, now: at(k)).near) }
    }

    @Test func darkFrameNeverNear() {
        var d = ObstacleDetector()
        for k in 1...20 { #expect(!d.ingest(gray: dark, now: at(k)).near) }
    }

    @Test func streakDecays() {
        var d = ObstacleDetector()
        for k in 1...6 { _ = d.ingest(gray: uniform, now: at(k)) }
        var last = ObstacleReading(near: true, shouldAlert: false, score: 0)
        for k in 7...9 { last = d.ingest(gray: checkerboard, now: at(k)) }
        #expect(!last.near)
    }
}

@Suite struct DangerSoundPolicyTests {
    let siren = [SoundGuess("siren", 0.8)]
    let speech = [SoundGuess("speech", 0.9)]

    @Test func sirenNeedsTwoWindows() {
        var p = DangerSoundPolicy()
        #expect(p.ingest(siren, now: 0) == nil)
        #expect(p.ingest(siren, now: 0.75) == DangerAlert(identifier: "siren", label: "صفارة إنذار", score: 0.8))
    }

    @Test func dangerCooldown() {
        var p = DangerSoundPolicy()
        _ = p.ingest(siren, now: 0)
        _ = p.ingest(siren, now: 0.75)
        var next: Double?
        var t = 1.5
        while t < 10 {
            if p.ingest(siren, now: t) != nil { next = t; break }
            t += 0.75
        }
        let again = try! #require(next)
        #expect(again - 0.75 >= 4)
        #expect(again - 0.75 - 0.75 < 4)
    }

    @Test func interruptedWindowsReset() {
        var p = DangerSoundPolicy()
        #expect(p.ingest(siren, now: 0) == nil)
        #expect(p.ingest(speech, now: 0.75) == nil)
        #expect(p.ingest(siren, now: 1.5) == nil)
    }

    @Test func lowConfidenceIgnored() {
        var p = DangerSoundPolicy()
        #expect(p.ingest([SoundGuess("siren", 0.4)], now: 0) == nil)
        #expect(p.ingest([SoundGuess("siren", 0.4)], now: 0.75) == nil)
    }

    @Test func nonDangerIgnored() {
        var p = DangerSoundPolicy()
        #expect(p.ingest([SoundGuess("dog_bark", 0.9)], now: 0) == nil)
        #expect(p.ingest([SoundGuess("dog_bark", 0.9)], now: 0.75) == nil)
    }

    @Test func picksBestDangerInWindow() {
        var p = DangerSoundPolicy()
        let mixed = [SoundGuess("car_horn", 0.6), SoundGuess("smoke_detector", 0.9), SoundGuess("speech", 0.95)]
        _ = p.ingest(mixed, now: 0)
        #expect(p.ingest(mixed, now: 0.75)?.label == "إنذار حريق")
    }
}
