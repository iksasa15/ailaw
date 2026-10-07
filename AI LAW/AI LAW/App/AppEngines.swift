import Observation

/// Every on-device engine, created once for the app's lifetime and shared through the environment.
@Observable
final class AppEngines {
    let camera = CameraEngine()
    let hands = HandTracker()
    let audio = AudioHub()
    let speech = SpeechEngine()
    let speak = SpeakEngine()
}
