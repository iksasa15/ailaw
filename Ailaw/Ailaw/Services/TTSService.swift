import AVFoundation

@Observable
final class TTSService: NSObject {
    private let synthesizer = AVSpeechSynthesizer()
    private(set) var isSpeaking = false

    override init() {
        super.init()
        synthesizer.delegate = self
        AudioSessionHub.activateForApp()
    }

    func speak(_ text: String, language: String = "ar-SA") {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        AudioSessionHub.prepareForSpeech()
        synthesizer.stopSpeaking(at: .immediate)

        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = Self.bestArabicVoice(preferred: language)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1.05
        utterance.volume = 1.0
        utterance.preUtteranceDelay = 0.05
        utterance.postUtteranceDelay = 0.05

        isSpeaking = true
        // Ensure we speak on the main queue after session is ready.
        DispatchQueue.main.async { [weak self] in
            self?.synthesizer.speak(utterance)
        }
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    private static func bestArabicVoice(preferred: String) -> AVSpeechSynthesisVoice? {
        let voices = AVSpeechSynthesisVoice.speechVoices()
        if let exact = voices.first(where: { $0.language == preferred }) {
            return exact
        }
        if let arSA = voices.first(where: { $0.language.hasPrefix("ar-SA") }) {
            return arSA
        }
        if let anyAr = voices.first(where: { $0.language.hasPrefix("ar") }) {
            return anyAr
        }
        return AVSpeechSynthesisVoice(language: preferred)
            ?? AVSpeechSynthesisVoice(language: "ar")
    }
}

extension TTSService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        isSpeaking = true
        try? AVAudioSession.sharedInstance().overrideOutputAudioPort(.speaker)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        isSpeaking = false
    }
}
