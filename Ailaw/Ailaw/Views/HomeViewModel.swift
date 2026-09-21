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
    var lastSceneSyncAt: Date?
    var lastBackendOkAt: Date?
    var syncBadgeState: SyncBadge.State = .waiting

    private var fingerTimer: Timer?
    private var sceneTimer: Timer?
    private var syncUiTimer: Timer?
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
        AudioSessionHub.activateForApp()
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
            let trackHands = self.settings.sendEnabled || self.lockedRole != nil
            if trackHands {
                self.hands.process(pixelBuffer: buffer)
            } else {
                Task { @MainActor in
                    self.hands.reset()
                }
            }
            if self.settings.safetyEnabled && !self.settings.sendEnabled {
                self.obstacle.analyze(pixelBuffer: buffer)
            }
        }
        startFingerTicker()
        Task { await refreshHealthAndPipelines() }
        if lockedRole != nil {
            startScenePolling()
            startSyncUiTicker()
        }
    }

    func onDisappear() {
        fingerTimer?.invalidate()
        fingerTimer = nil
        sceneTimer?.invalidate()
        sceneTimer = nil
        syncUiTimer?.invalidate()
        syncUiTimer = nil
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
            guard let self else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.phrases.tick(fingers: self.hands.fingerCount, quality: self.hands.quality)
            }
        }
    }

    private func startScenePolling() {
        sceneTimer?.invalidate()
        sceneTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: true) { [weak self] _ in
            Task { await self?.pollScene() }
        }
        Task { await pollScene() }
    }

    private func startSyncUiTicker() {
        syncUiTimer?.invalidate()
        syncUiTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.refreshSyncBadge()
            }
        }
    }

    private func pollScene() async {
        do {
            if lockedRole == .person {
                let scene = try await api.fetchLawyerScene()
                if let text = scene.text, !text.isEmpty {
                    coachText = text
                    lastSceneSyncAt = Date()
                }
                lastBackendOkAt = Date()
            } else if lockedRole == .lawyer {
                _ = try await api.checkHealth()
                lastBackendOkAt = Date()
            }
        } catch {
            // leave timestamps stale → offline badge
        }
        refreshSyncBadge()
    }

    private func refreshSyncBadge() {
        let now = Date()
        let backendFresh = lastBackendOkAt.map { now.timeIntervalSince($0) < 4 } ?? false
        let phraseFresh = lastSceneSyncAt.map { now.timeIntervalSince($0) < 2.5 } ?? false
        if phraseFresh {
            syncBadgeState = .synced
        } else if backendFresh {
            syncBadgeState = .waiting
        } else {
            syncBadgeState = .offline
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
        // Pause mic pipelines briefly so TTS can own the speaker.
        Task { @MainActor in
            await stt.stop()
            tts.speak(result.text)
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            if settings.receiveEnabled {
                await stt.start(useWhisper: whisperHealthy, language: settings.language)
            }
        }
        let key = "\(result.role.rawValue)-\(result.fingers)-\(result.text)"
        guard lastPublished != key else { return }
        lastPublished = key
        Task {
            do {
                try await api.publishScenePhrase(
                    role: result.role.rawValue,
                    text: result.text,
                    fingers: result.fingers
                )
                await MainActor.run {
                    lastSceneSyncAt = Date()
                    lastBackendOkAt = Date()
                    refreshSyncBadge()
                }
            } catch {
                // keep waiting / offline state
            }
        }
    }

    private func showAlert(_ title: String, kind: AlertToast.Kind) {
        alertTitle = title
        alertKind = kind
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }
}
