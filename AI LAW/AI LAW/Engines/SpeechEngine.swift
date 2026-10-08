import AILawCore
import AVFoundation
import Observation
import Speech

/// Arabic speech → text, strictly on-device (never the network), restarted seamlessly
/// when Apple ends a recognition task (~1 minute) or it errors.
@Observable
final class SpeechEngine {
    enum Status: Equatable {
        case idle, listening, unavailable, denied
        case error(String)
    }

    private(set) var status: Status = .idle
    private(set) var text = ""
    private(set) var isPartial = false

    @ObservationIgnored private var accumulator = TranscriptAccumulator()
    @ObservationIgnored private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))
    @ObservationIgnored private var request: SFSpeechAudioBufferRecognitionRequest?
    @ObservationIgnored private var task: SFSpeechRecognitionTask?
    @ObservationIgnored private weak var hub: AudioHub?
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var heardSinceStart = false
    @ObservationIgnored private var paused = false
    @ObservationIgnored private var resumeTask: Task<Void, Never>?
    @ObservationIgnored private var startTask: Task<Void, Never>?

    /// Once true it stays true (the Arabic model does not disappear while the app runs).
    private static var onDeviceConfirmed = false

    /// Whether Arabic is recognised on this device without the network. Asking is a synchronous
    /// call to the speech service (≈0.2 s on a Mac, longer on a phone), so it never runs on the
    /// main thread; a "no" is asked again next time (the user may have downloaded the model since).
    static func isArabicOnDeviceAvailable() async -> Bool {
        if onDeviceConfirmed { return true }
        let available = await Task.detached(priority: .userInitiated) {
            SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))?.supportsOnDeviceRecognition ?? false
        }.value
        if available { onDeviceConfirmed = true }
        return available
    }

    static func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0 == .authorized) }
        }
    }

    func start(using hub: AudioHub) {
        guard status != .listening, startTask == nil else { return }
        self.hub = hub
        startTask = Task { [weak self] in
            let available = await Self.isArabicOnDeviceAvailable()
            var authorized = SFSpeechRecognizer.authorizationStatus() == .authorized
            if available, SFSpeechRecognizer.authorizationStatus() == .notDetermined {
                authorized = await Self.requestAuthorization()
            }
            // stop() while waiting cancels the start.
            guard let self, !Task.isCancelled else { return }
            startTask = nil
            if !available || recognizer == nil {
                status = .unavailable
            } else if authorized {
                beginTask()
            } else {
                status = .denied
            }
        }
    }

    func stop() {
        startTask?.cancel()
        startTask = nil
        generation += 1
        resumeTask?.cancel()
        paused = false
        teardown()
        status = .idle
        isPartial = false
    }

    /// Clears the caption. The running task is restarted, otherwise its cumulative
    /// partial result would bring the cleared words back.
    func clearText() {
        accumulator.clear()
        text = ""
        isPartial = false
        if status == .listening && !paused { beginTask() }
    }

    /// While the phone speaks, its own mic would transcribe the speech (no echo cancellation):
    /// stop feeding audio, and resume 0.5 s after speech ends with a fresh task.
    func setPaused(_ pause: Bool) {
        resumeTask?.cancel()
        if pause {
            guard status == .listening, !paused else { return }
            paused = true
            generation += 1
            accumulator.commit()
            text = accumulator.text
            isPartial = false
            teardown()
        } else {
            guard paused else { return }
            resumeTask = Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(500))
                guard !Task.isCancelled, let self, paused else { return }
                paused = false
                if status == .listening { beginTask() }
            }
        }
    }

    private func beginTask() {
        guard let recognizer, let hub else { return }
        teardown()
        generation += 1
        let gen = generation
        heardSinceStart = false

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = true
        request.taskHint = .dictation
        request.contextualStrings = CaseScenario.lines.map(\.text) + PhraseBook.defaultLawyer.values
        self.request = request

        let sink = RequestSink(request)
        hub.subscribe("speech") { buffer, _ in sink.append(buffer) }

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            let transcript = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            let failed = error != nil
            guard let engine = self else { return }
            Task { @MainActor in engine.handle(transcript: transcript, isFinal: isFinal, failed: failed, generation: gen) }
        }
        status = .listening
    }

    private func handle(transcript: String?, isFinal: Bool, failed: Bool, generation gen: Int) {
        guard gen == generation else { return }
        if let transcript, !transcript.isEmpty {
            heardSinceStart = true
            accumulator.update(partial: transcript)
            text = accumulator.text
            isPartial = !isFinal
        }
        guard isFinal || failed else { return }

        accumulator.commit()
        text = accumulator.text
        isPartial = false
        if failed, SFSpeechRecognizer.authorizationStatus() != .authorized {
            teardown()
            status = .denied
            return
        }
        teardown()
        let delay: Duration = heardSinceStart ? .milliseconds(300) : .seconds(1)
        Task {
            try? await Task.sleep(for: delay)
            if gen == generation, status == .listening, !paused { beginTask() }
        }
    }

    private func teardown() {
        hub?.unsubscribe("speech")
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
    }
}

/// Lets the audio tap feed the recognition request from the audio thread.
private nonisolated final class RequestSink: @unchecked Sendable {
    private let request: SFSpeechAudioBufferRecognitionRequest

    init(_ request: SFSpeechAudioBufferRecognitionRequest) {
        self.request = request
    }

    func append(_ buffer: AVAudioPCMBuffer) {
        request.append(buffer)
    }
}
