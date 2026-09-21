import AVFoundation

enum AudioSessionHub {
    /// Shared session that keeps mic open while allowing speaker TTS playback.
    static func activateForApp() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [
                    .defaultToSpeaker,
                    .allowBluetoothHFP,
                    .mixWithOthers,
                ]
            )
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            try session.overrideOutputAudioPort(.speaker)
        } catch {
            // Best-effort — TTS will still attempt to speak.
        }
    }

    static func prepareForSpeech() {
        activateForApp()
        do {
            try AVAudioSession.sharedInstance().overrideOutputAudioPort(.speaker)
        } catch {}
    }
}
