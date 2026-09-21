import Foundation
import UIKit

@Observable
@MainActor
final class HomeViewModel {
    let settings: AppSettings
    let api: APIClient
    let camera = CameraService()
    let hands = HandPoseService()
    let phrases = FingerPhraseEngine()
    let tts = TTSService()
    let stt: STTService
    let ambient: AmbientService
    let obstacle = ObstacleService()

    var lockedRole: UserRole?
    var alertTitle: String?
    var alertKind: AlertToast.Kind?
    var coachText: String?
    var whisperHealthy = false

    private var fingerTimer: Timer?
    private var sceneTimer: Timer?
    private var healthChecked = false
    private var lastPublished: String?

    init(settings: AppSettings, lockedRole: UserRole? = nil) {
        self.settings = settings
        self.api = APIClient(settings: settings)
        self.stt = STTService(api: api)
        self.ambient = AmbientService(api: api)
        self.lockedRole = lockedRole
        phrases.applyLockedRole(lockedRole)

        phrases.setOnAccepted { [weak self] result in
            Task { @MainActor in
                self?.handleAccepted(result)
            }
        }
        ambient.onDanger = { [weak self] label in
            Task { @MainActor in
                self?.showAlert("خطر: \(label)", kind: .danger)
            }
        }
        obstacle.onObstacle = { [weak self] in
            Task { @MainActor in
                self?.showAlert("احذر، حاجز قريب", kind: .obstacle)
                self?.tts.speak("احذر، حاجز قريب")
            }
        }
    }

    func onAppear() {
        phrases.lawyerPhrases = settings.lawyerPhrases
        phrases.personPhrases = settings.personPhrases
        if let lockedRole {
            settings.sendEnabled = true
            phrases.applyLockedRole(lockedRole)
        }
        syncCameraFacing()
        camera.requestAccessAndStart(facing: preferredFacing())
        camera.onFrame = { [weak self] buffer in
            guard let self else { return }
            if self.settings.sendEnabled {
                self.hands.process(pixelBuffer: buffer)
            }
            if self.settings.safetyEnabled && !self.settings.sendEnabled {
                self.obstacle.analyze(pixelBuffer: buffer)
            }
        }
        startFingerTicker()
        Task { await refreshHealthAndPipelines() }
        if lockedRole == .person {
            startScenePolling()
        }
    }

    func onDisappear() {
        fingerTimer?.invalidate()
        fingerTimer = nil
        sceneTimer?.invalidate()
        sceneTimer = nil
        camera.stop()
        ambient.stop()
        Task { await stt.stop() }
    }

    func syncToggles() {
        phrases.enabled = settings.sendEnabled
        phrases.lawyerPhrases = settings.lawyerPhrases
        phrases.personPhrases = settings.personPhrases
        syncCameraFacing()
        Task { await refreshPipelines() }
    }

    func clearCaption() {
        stt.clearCaption()
    }

    func dismissAlert() {
        alertTitle = nil
        alertKind = nil
    }

    private func preferredFacing() -> CameraFacing {
        if settings.sendEnabled || lockedRole != nil { return .front }
        if settings.safetyEnabled { return .back }
        return .front
    }

    private func syncCameraFacing() {
        camera.setFacing(preferredFacing())
    }

    private func startFingerTicker() {
        fingerTimer?.invalidate()
        fingerTimer = Timer.scheduledTimer(withTimeInterval: 0.12, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.phrases.tick(fingers: self.hands.fingerCount, quality: self.hands.quality)
            }
        }
    }

    private func startScenePolling() {
        sceneTimer?.invalidate()
        sceneTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: true) { [weak self] _ in
            Task { await self?.pollLawyerScene() }
        }
    }

    private func pollLawyerScene() async {
        do {
            let scene = try await api.fetchLawyerScene()
            if let text = scene.text, !text.isEmpty {
                coachText = text
            }
        } catch {
            // ignore
        }
    }

    private func refreshHealthAndPipelines() async {
        do {
            let h = try await api.checkHealth()
            whisperHealthy = h.whisper == true
        } catch {
            whisperHealthy = false
        }
        healthChecked = true
        await refreshPipelines()
    }

    private func refreshPipelines() async {
        if settings.receiveEnabled {
            await stt.start(useWhisper: whisperHealthy, language: settings.language)
        } else {
            await stt.stop()
        }

        if settings.safetyEnabled {
            ambient.start()
        } else {
            ambient.stop()
        }

        phrases.enabled = settings.sendEnabled
    }

    private func handleAccepted(_ result: FingerPhraseResult) {
        tts.speak(result.text)
        let key = "\(result.role.rawValue)-\(result.fingers)-\(result.text)"
        guard lastPublished != key else { return }
        lastPublished = key
        Task {
            try? await api.publishScenePhrase(
                role: result.role.rawValue,
                text: result.text,
                fingers: result.fingers
            )
        }
    }

    private func showAlert(_ title: String, kind: AlertToast.Kind) {
        alertTitle = title
        alertKind = kind
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }
}
