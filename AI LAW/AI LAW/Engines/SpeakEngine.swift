import AVFoundation
import Observation

/// Arabic text → speech through the phone speaker (web useTts).
@Observable
final class SpeakEngine: NSObject, AVSpeechSynthesizerDelegate {
    private(set) var isSpeaking = false {
        didSet { if oldValue != isSpeaking { onSpeakingChanged?(isSpeaking) } }
    }
    /// Lets speech recognition pause while the phone talks (see SpeechEngine.setPaused).
    @ObservationIgnored var onSpeakingChanged: ((Bool) -> Void)?

    @ObservationIgnored private let synthesizer = AVSpeechSynthesizer()
    @ObservationIgnored private var lastText = ""
    @ObservationIgnored private var lastAt = Date.distantPast

    static let cooldown: TimeInterval = 1.6

    override init() {
        super.init()
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = true
    }

    var hasArabicVoice: Bool {
        AVSpeechSynthesisVoice.speechVoices().contains { $0.language.hasPrefix("ar") }
    }

    /// Same text within 1.6 s is skipped unless `force`.
    func speak(_ text: String, force: Bool = false) {
        let message = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        let now = Date()
        if !force, message == lastText, now.timeIntervalSince(lastAt) < Self.cooldown { return }
        lastText = message
        lastAt = now

        Self.ensureAudibleSession()
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .word) }
        let utterance = AVSpeechUtterance(string: message)
        utterance.voice = Self.voice
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1
        synthesizer.speak(utterance)
        isSpeaking = true
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    /// The first utterance pays for loading the voice (~0.5 s). Speak one silent utterance
    /// at launch so the first real phrase is spoken immediately.
    func warmUp() {
        let utterance = AVSpeechUtterance(string: "مرحبا")
        utterance.voice = Self.voice
        utterance.volume = 0
        synthesizer.speak(utterance)
    }

    /// Best installed Arabic voice (premium → enhanced → default).
    static let voice: AVSpeechSynthesisVoice? = {
        let arabic = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("ar") }
        return arabic.max { $0.quality.rawValue < $1.quality.rawValue } ?? AVSpeechSynthesisVoice(language: "ar-SA")
    }()

    /// Speech must be heard even with the ring switch on silent when the mic is off.
    private static func ensureAudibleSession() {
        let session = AVAudioSession.sharedInstance()
        if session.category == .soloAmbient || session.category == .ambient {
            try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try? session.setActive(true)
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        let stillSpeaking = synthesizer.isSpeaking
        Task { @MainActor in self.isSpeaking = stillSpeaking }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        let stillSpeaking = synthesizer.isSpeaking
        Task { @MainActor in self.isSpeaking = stillSpeaking }
    }
}
