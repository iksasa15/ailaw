import AILawCore
import AVFoundation
import Observation
import os
@preconcurrency import SoundAnalysis

/// Danger sounds (sirens, alarms, horns…) via Apple's built-in on-device classifier.
@Observable
final class SoundAlertEngine {
    private(set) var alert: DangerAlert?
    /// Increments on every alert so the UI reacts once per alert, even for identical ones.
    private(set) var alertToken = 0
    private(set) var isRunning = false

    @ObservationIgnored private var core: SoundAnalysisCore?
    @ObservationIgnored private weak var hub: AudioHub?

    func start(using hub: AudioHub) {
        guard !isRunning, let format = hub.format else { return }
        let core = SoundAnalysisCore(format: format) { [weak self] alert in
            guard let engine = self else { return }
            Task { @MainActor in engine.raise(alert) }
        }
        guard core.prepare() else { return }
        hub.subscribe("sound") { buffer, time in core.analyze(buffer, at: time) }
        self.core = core
        self.hub = hub
        isRunning = true
    }

    func stop() {
        hub?.unsubscribe("sound")
        core?.finish()
        core = nil
        isRunning = false
    }

    func clearAlert() {
        alert = nil
    }

    private func raise(_ newAlert: DangerAlert) {
        guard isRunning else { return }
        alert = newAlert
        alertToken += 1
        Haptics.danger()
    }
}

/// SNAudioStreamAnalyzer fed from the mic tap on its own serial queue.
nonisolated final class SoundAnalysisCore: NSObject, SNResultsObserving, @unchecked Sendable {
    private let analyzer: SNAudioStreamAnalyzer
    private let queue = DispatchQueue(label: "ailaw.sound", qos: .userInitiated)
    private let policy = OSAllocatedUnfairLock(initialState: DangerSoundPolicy())
    private let onAlert: @Sendable (DangerAlert) -> Void
    private let started = Date()

    init(format: AVAudioFormat, onAlert: @escaping @Sendable (DangerAlert) -> Void) {
        analyzer = SNAudioStreamAnalyzer(format: format)
        self.onAlert = onAlert
    }

    func prepare() -> Bool {
        do {
            let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
            request.windowDuration = Self.windowDuration(1.5, constraint: request.windowDurationConstraint)
            request.overlapFactor = 0.5
            try analyzer.add(request, withObserver: self)
            return true
        } catch {
            return false
        }
    }

    func analyze(_ buffer: AVAudioPCMBuffer, at time: AVAudioTime) {
        nonisolated(unsafe) let pcm = buffer
        let position = time.sampleTime
        queue.async { self.analyzer.analyze(pcm, atAudioFramePosition: position) }
    }

    func finish() {
        queue.async { self.analyzer.completeAnalysis() }
    }

    func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let result = result as? SNClassificationResult else { return }
        let guesses = result.classifications.prefix(12).map { SoundGuess($0.identifier, $0.confidence) }
        let now = Date().timeIntervalSince(started)
        if let alert = policy.withLock({ $0.ingest(guesses, now: now) }) { onAlert(alert) }
    }

    private static func windowDuration(_ seconds: Double, constraint: SNTimeDurationConstraint) -> CMTime {
        let wanted = CMTime(seconds: seconds, preferredTimescale: 48_000)
        switch constraint {
        case .durationRange(let range):
            return CMTimeClampToRange(wanted, range: range)
        case .enumeratedDurations(let durations):
            return durations.min { abs($0.seconds - seconds) < abs($1.seconds - seconds) } ?? wanted
        @unknown default:
            return wanted
        }
    }
}
