import Foundation
import Testing
@testable import AILawCore

@Suite struct RecognitionTuningTests {
    @Test func presets() {
        let balanced = RecognitionTuning.preset(.balanced)
        #expect(balanced.acceptLocked == 0.7)
        #expect(balanced.acceptWeak == 1.0)
        #expect(balanced.letterHold == 1.5) // a letter is written after 1.5 s (user request)
        #expect(balanced.roleHold == 3.0)
        #expect(RecognitionTuning.preset(.fast).acceptLocked < balanced.acceptLocked)
        // «دقيق» keeps the web timings (10 polls × 120 ms, 3 s letters, 5 s role hold).
        let accurate = RecognitionTuning.preset(.accurate)
        #expect(accurate.acceptLocked == 1.2)
        #expect(accurate.letterHold == 3.0)
        #expect(accurate.roleHold == 5.0)
    }

    @Test func settingsDefaultToBalancedAndRoundTrip() {
        #expect(SettingsData().recognitionSpeed == .balanced)
        #expect(SettingsData.decode(Data(#"{"fontScale":1.1}"#.utf8)).recognitionSpeed == .balanced)
        var s = SettingsData()
        s.recognitionSpeed = .fast
        #expect(SettingsData.decode(s.encoded()).recognitionSpeed == .fast)
        #expect(s.tuning == RecognitionTuning.preset(.fast))
    }
}

@Suite struct ReadingFilterTests {
    @Test func isolatedMisreadIsIgnored() {
        var f = ReadingFilter<Int>(window: 0.36, minShare: 0.6)
        #expect(f.add(3, now: 0.00) == 3)
        #expect(f.add(3, now: 0.12) == 3)
        #expect(f.add(4, now: 0.24) == 3)
        #expect(f.add(3, now: 0.36) == 3)
    }

    @Test func persistentChangeWins() {
        var f = ReadingFilter<Int>(window: 0.36, minShare: 0.6)
        for t in [0.0, 0.12, 0.24] { _ = f.add(3, now: t) }
        _ = f.add(4, now: 0.36)
        _ = f.add(4, now: 0.48)
        #expect(f.add(4, now: 0.60) == 4)
    }

    @Test func evenSplitHasNoStableValue() {
        var f = ReadingFilter<Int>(window: 0.36, minShare: 0.6)
        for (i, t) in stride(from: 0.0, through: 1.0, by: 1.0 / 30).enumerated() {
            let v = f.add(i % 2 == 0 ? 5 : 10, now: t)
            if t > 0.2 { #expect(v == nil) }
        }
    }

    @Test func briefUnclearFramesKeepTheValue() {
        // nil = "no clear reading" (e.g. an ambiguous hand shape): ignored, until the
        // last real reading leaves the window.
        var f = ReadingFilter<String>(window: 0.36, minShare: 0.6)
        #expect(f.add("ب", now: 0) == "ب")
        #expect(f.add(nil, now: 0.12) == "ب")
        #expect(f.add(nil, now: 0.24) == "ب")
        #expect(f.add(nil, now: 0.40) == nil)
    }

    @Test func resetClears() {
        var f = ReadingFilter<Int>(window: 0.36, minShare: 0.6)
        _ = f.add(3, now: 0)
        f.reset()
        #expect(f.add(4, now: 0.01) == 4)
    }
}
