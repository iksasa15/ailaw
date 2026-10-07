import AVFoundation
import Observation
import os

/// One microphone shared by speech recognition and danger-sound analysis (web useSharedMic).
/// Owns the app's AVAudioSession.
@Observable
final class AudioHub {
    enum Status: Equatable {
        case idle, running, denied
        case failed(String)
    }

    private(set) var status: Status = .idle
    private(set) var format: AVAudioFormat?

    @ObservationIgnored private let core = AudioCore()
    @ObservationIgnored private var observers: [NSObjectProtocol] = []

    func start() async {
        guard status != .running else { return }
        guard await AVAudioApplication.requestRecordPermission() else {
            status = .denied
            return
        }
        do {
            try Self.configureSession()
            try core.start()
            format = core.inputFormat
            status = .running
            observeSession()
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    func stop() {
        observers.forEach(NotificationCenter.default.removeObserver)
        observers = []
        core.stop()
        status = .idle
    }

    func subscribe(_ id: String, _ handler: @escaping @Sendable (AVAudioPCMBuffer, AVAudioTime) -> Void) {
        core.subscribe(id, handler)
    }

    func unsubscribe(_ id: String) {
        core.unsubscribe(id)
    }

    /// Obstacle warning tone: alternating 880/660 Hz square beeps (web playProximityAlarm).
    func playAlarm(beeps: Int = 5) {
        core.playAlarm(beeps: beeps)
    }

    static func configureSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP])
        try session.setActive(true)
    }

    private func observeSession() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            MainActor.assumeIsolated { self?.handleInterruption(raw.flatMap(AVAudioSession.InterruptionType.init)) }
        })
        observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.restartTap() }
        })
    }

    private func handleInterruption(_ type: AVAudioSession.InterruptionType?) {
        switch type {
        case .began:
            core.stop()
        case .ended:
            restartTap()
        default:
            break
        }
    }

    private func restartTap() {
        guard status == .running else { return }
        core.stop()
        do {
            try Self.configureSession()
            try core.start()
            format = core.inputFormat
        } catch {
            status = .failed(error.localizedDescription)
        }
    }
}

/// AVAudioEngine work, callable from any thread.
nonisolated final class AudioCore: @unchecked Sendable {
    typealias Handler = @Sendable (AVAudioPCMBuffer, AVAudioTime) -> Void

    private let engine = AVAudioEngine()
    private let subscribers = OSAllocatedUnfairLock<[String: Handler]>(initialState: [:])
    private let state = OSAllocatedUnfairLock(initialState: false) // tap installed

    private let toneEngine = AVAudioEngine()
    private let tonePlayer = AVAudioPlayerNode()
    private let toneFormat = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private let toneSetup = OSAllocatedUnfairLock(initialState: false)

    var inputFormat: AVAudioFormat { engine.inputNode.outputFormat(forBus: 0) }

    func start() throws {
        let installed = state.withLock { $0 }
        if !installed {
            let input = engine.inputNode
            let subscribers = self.subscribers
            input.installTap(onBus: 0, bufferSize: 4096, format: input.outputFormat(forBus: 0)) { buffer, time in
                for handler in subscribers.withLock({ Array($0.values) }) { handler(buffer, time) }
            }
            state.withLock { $0 = true }
        }
        engine.prepare()
        try engine.start()
    }

    func stop() {
        engine.stop()
        if state.withLock({ $0 }) {
            engine.inputNode.removeTap(onBus: 0)
            state.withLock { $0 = false }
        }
    }

    func subscribe(_ id: String, _ handler: @escaping Handler) {
        subscribers.withLock { $0[id] = handler }
    }

    func unsubscribe(_ id: String) {
        _ = subscribers.withLock { $0.removeValue(forKey: id) }
    }

    func playAlarm(beeps: Int) {
        let needsSetup = toneSetup.withLock { done in
            defer { done = true }
            return !done
        }
        if needsSetup {
            toneEngine.attach(tonePlayer)
            toneEngine.connect(tonePlayer, to: toneEngine.mainMixerNode, format: toneFormat)
        }
        if !toneEngine.isRunning { try? toneEngine.start() }
        guard toneEngine.isRunning, let buffer = Self.alarmBuffer(beeps: beeps, format: toneFormat) else { return }
        tonePlayer.scheduleBuffer(buffer, at: nil, options: .interrupts)
        tonePlayer.play()
    }

    /// Beep i starts at i × 0.28 s, lasts 0.18 s, 880 Hz on even beeps and 660 Hz on odd, gain 0.22.
    static func alarmBuffer(beeps: Int, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let total = Double(max(beeps - 1, 0)) * 0.28 + 0.2
        let frames = AVAudioFrameCount(total * rate)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else { return nil }
        buffer.frameLength = frames
        for n in 0..<Int(frames) { samples[n] = 0 }
        for i in 0..<beeps {
            let start = Int(Double(i) * 0.28 * rate)
            let length = Int(0.18 * rate)
            let frequency = i % 2 == 0 ? 880.0 : 660.0
            for k in 0..<length where start + k < Int(frames) {
                let t = Double(k) / rate
                let attack = min(1, t / 0.02)
                let decay = max(0, 1 - max(0, t - 0.02) / 0.16)
                let square: Double = sin(2 * .pi * frequency * t) >= 0 ? 1 : -1
                samples[start + k] = Float(square * 0.22 * attack * decay)
            }
        }
        return buffer
    }
}
