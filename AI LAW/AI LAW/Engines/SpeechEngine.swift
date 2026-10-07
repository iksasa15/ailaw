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

    static var isArabicOnDeviceAvailable: Bool {
        SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))?.supportsOnDeviceRecognition ?? false
    }

    static func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0 == .authorized) }
        }
    }

    func start(using hub: AudioHub) {
        guard status != .listening else { return }
        self.hub = hub
        guard let recognizer, recognizer.supportsOnDeviceRecognition else {
            status = .unavailable
            return
        }
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            beginTask()
        case .notDetermined:
            Task {
                if await Self.requestAuthorization() { beginTask() } else { status = .denied }
            }
        default:
            status = .denied
        }
    }

    func stop() {
        generation += 1
        teardown()
        status = .idle
        isPartial = false
    }

    func clearText() {
        accumulator.clear()
        text = ""
        isPartial = false
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
            if gen == generation, status == .listening { beginTask() }
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
