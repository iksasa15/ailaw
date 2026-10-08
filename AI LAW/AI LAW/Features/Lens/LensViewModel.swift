import AILawCore
import Foundation
import Observation

/// Orchestrates the Lens: camera → signs → speech/peer, mic → captions → sign translator,
/// safety alerts (port of web/src/pages/Home.jsx). Decisions live in AILawCore.
@Observable
final class LensViewModel {
    enum SafetyAlert: Equatable {
        case sound(DangerAlert)
        case obstacle
    }

    let mode: LensMode

    private(set) var role: Role
    private(set) var roleHoldProgress: Double = 0
    private(set) var rolePulse = 0
    private(set) var sendResult: SignResult?
    private(set) var lawyerPhrase: ScenePhrase?
    private(set) var remotePerson: ScenePhrase?
    private(set) var safetyAlert: SafetyAlert?
    private(set) var alphabet = AlphabetWriter()
    private(set) var alphabetSent = false
    /// Everything said or signed while this screen is open («سجل المحادثة»).
    private(set) var log = ConversationLog()
    private(set) var pulseToken = 0
    private(set) var letterPulse = 0
    var translateVisible = true
    private(set) var spellLetters = false
    var showDebug = false

    @ObservationIgnored let engines: AppEngines
    @ObservationIgnored let settings: AppSettings
    @ObservationIgnored private var router: ConversationRouter
    @ObservationIgnored private var finger: FingerPhraseMachine
    @ObservationIgnored private var voter = WordSignVoter()
    @ObservationIgnored private var loop: Task<Void, Never>?
    @ObservationIgnored private var speechDebounce: Task<Void, Never>?
    @ObservationIgnored private var sentReset: Task<Void, Never>?
    @ObservationIgnored private var nextWordTick = 0.0
    @ObservationIgnored private var isActive = false
    @ObservationIgnored private var startTask: Task<Void, Never>?
    @ObservationIgnored private var seenSpeech = ""
    @ObservationIgnored private var seenSoundToken = 0
    @ObservationIgnored private var seenObstacleToken = 0
    @ObservationIgnored private var lastObstacleSpoken = Date.distantPast
    @ObservationIgnored private var debugResult: SignResult?

    init(mode: LensMode, engines: AppEngines, settings: AppSettings) {
        self.mode = mode
        self.engines = engines
        self.settings = settings
        router = ConversationRouter(mode: mode)
        let tuning = settings.data.tuning
        if case .dedicated(let locked) = mode {
            finger = FingerPhraseMachine(lockedRole: locked, tuning: tuning)
        } else {
            finger = FingerPhraseMachine(tuning: tuning)
        }
        alphabet = AlphabetWriter(holdSeconds: tuning.letterHold)
        role = finger.role
    }

    // MARK: Derived state

    var isDedicated: Bool { mode != .solo }
    var sendOn: Bool { isDedicated || settings.data.sendEnabled }
    var receiveOn: Bool { settings.data.receiveEnabled }
    var safetyOn: Bool { settings.data.safetyEnabled }

    var title: String {
        switch mode {
        case .solo: "النظارة الذكية"
        case .dedicated(.lawyer): "شاشة المحامي"
        case .dedicated(.person): "شاشة الشخص"
        }
    }

    var subtitle: String {
        if case .dedicated(let r) = mode { return r.label }
        return engines.speech.status == .unavailable ? "الكلام: غير جاهز" : "الكلام: على الجهاز"
    }

    var signClips: [SignClip]? {
        SignLexicon.resolve(text: lawyerPhrase?.text, fingers: lawyerPhrase?.fingers, spellLetters: spellLetters)
    }

    /// The translator card only covers the camera when it has a phrase to show.
    var hasTranslation: Bool { !(signClips ?? []).isEmpty }

    var signToken: String { "\(lawyerPhrase?.id.uuidString ?? "-"):\(spellLetters)" }

    var roleHoldSeconds: Double { settings.data.tuning.roleHold }

    var coachVisible: Bool {
        guard translateVisible else { return false }
        switch mode {
        case .dedicated(.person): return true
        case .dedicated(.lawyer): return false
        case .solo: return role == .person || lawyerPhrase != nil
        }
    }

    var trackingText: String {
        switch engines.hands.quality {
        case .lost: "وجّه يدك"
        case .weak: "تتبع ضعيف"
        case .locked: "يد متثبتة"
        }
    }

    var speechStatusText: String {
        guard receiveOn else { return "متوقف" }
        if mode == .dedicated(.person) { return "يستقبل كلام المحامي" }
        if engines.audio.status == .denied { return "المايك مرفوض" }
        switch engines.speech.status {
        case .unavailable: return "الكلام العربي غير جاهز"
        case .denied: return "التعرف على الكلام مرفوض"
        case .error(let message): return message
        case .listening: return "يستمع…"
        case .idle: return "جاهز"
        }
    }

    /// Small caption above the result: "شخص · 3" for finger phrases.
    var resultCaption: String? {
        guard let r = sendResult, let fingers = r.fingers else { return nil }
        return "\((r.role ?? role).label) · \(fingers)"
    }

    // MARK: Lifecycle

    func onAppear() {
        let s = settings.data
        engines.camera.facing = (isDedicated || s.sendEnabled) ? .front : (s.safetyEnabled ? .back : .front)
        voter = WordSignVoter(threshold: max(0.45, s.confidence))
        seenSoundToken = engines.sound.alertToken
        seenObstacleToken = engines.obstacle.alertToken
        // Text left over from the Lab or rehearsal must not be sent as new lawyer speech.
        seenSpeech = engines.speech.text
        isActive = true
        // Recognition runs on every analysed camera frame (≈30 fps), not on a timer.
        engines.hands.onFrame = { [weak self] frame in self?.handleFrame(frame) }
        #if DEBUG
        // Launch argument `-uiLetters YES`: open straight into letters mode (device soak tests).
        if UserDefaults.standard.bool(forKey: "uiLetters"), !spellLetters { toggleLetters() }
        #endif
        if isDedicated {
            engines.peer.onMessage = { [weak self] in self?.handleRemote($0) }
            engines.peer.snapshotProvider = { [weak self] in
                self?.snapshot() ?? .snapshot(lawyer: nil, person: nil)
            }
        }
        startTask?.cancel()
        startTask = Task { [weak self] in
            guard let self else { return }
            await engines.camera.start()
            guard isActive else {
                engines.camera.stop()
                return
            }
            await applyEngines()
        }
        startLoop()
    }

    func onDisappear() {
        isActive = false
        startTask?.cancel()
        engines.hands.onFrame = nil
        if isDedicated {
            engines.peer.onMessage = nil
            engines.peer.snapshotProvider = nil
        }
        loop?.cancel()
        loop = nil
        speechDebounce?.cancel()
        engines.hands.detach()
        engines.obstacle.detach()
        engines.speech.stop()
        engines.sound.stop()
        engines.audio.stop()
        engines.camera.stop()
    }

    /// Starts or stops each engine to match the current toggles.
    private func applyEngines() async {
        guard isActive else { return }
        let s = settings.data
        let camera = engines.camera
        if sendOn {
            if !engines.hands.isAttached { engines.hands.attach(to: camera) }
        } else {
            engines.hands.detach()
        }
        // Spec §5: the obstacle detector reads back-camera frames only (a ceiling or a face
        // in front of the selfie camera would trip it).
        if s.safetyEnabled && camera.facing == .back {
            if !engines.obstacle.isAttached { engines.obstacle.attach(to: camera, hub: engines.audio) }
        } else {
            engines.obstacle.detach()
        }

        // The person phone in a session shows received lawyer speech; it does not transcribe.
        let wantsSpeech = s.receiveEnabled && mode != .dedicated(.person)
        let needMic = wantsSpeech || s.safetyEnabled
        if needMic { await engines.audio.start() }
        guard isActive else { return }
        let micReady = engines.audio.status == .running
        if wantsSpeech && micReady { engines.speech.start(using: engines.audio) } else { engines.speech.stop() }
        if s.safetyEnabled && micReady { engines.sound.start(using: engines.audio) } else { engines.sound.stop() }
        if !needMic { engines.audio.stop() }
    }

    private func startLoop() {
        loop?.cancel()
        loop = Task { [weak self] in
            while !Task.isCancelled {
                self?.tick()
                try? await Task.sleep(for: .milliseconds(40))
            }
        }
    }

    // MARK: Tick

    /// Speech and safety (signs are driven per frame by `handleFrame`).
    private func tick() {
        let data = settings.data

        if !sendOn {
            router.resetSpoken()
            sendResult = nil
        }

        if data.receiveEnabled, engines.speech.text != seenSpeech {
            seenSpeech = engines.speech.text
            scheduleSnippet(seenSpeech)
        }

        if engines.sound.alertToken != seenSoundToken {
            seenSoundToken = engines.sound.alertToken
            if let alert = engines.sound.alert { safetyAlert = .sound(alert) }
        }
        if engines.obstacle.alertToken != seenObstacleToken {
            seenObstacleToken = engines.obstacle.alertToken
            safetyAlert = .obstacle
            if Date().timeIntervalSince(lastObstacleSpoken) >= 4 {
                lastObstacleSpoken = Date()
                engines.speak.speak("احذر، حاجز قريب", force: true)
            }
        }
    }

    /// One analysed camera frame: finger phrases, ArSL words, letters.
    private func handleFrame(_ frame: HandPoseProcessor.Frame) {
        guard isActive, sendOn else { return }
        let now = frame.time
        let data = settings.data
        if frame.quality == .lost { router.resetSpoken() }

        if spellLetters {
            sendResult = nil
            if alphabet.tick(hand: frame.hands.first, quality: frame.quality, now: now) {
                letterPulse += 1
                Haptics.accept() // feel each written letter without looking at the screen
            }
            return
        }

        finger.tuning = data.tuning
        if let newRole = finger.tick(hands: frame.hands, quality: frame.quality, phrases: data.phraseBook, now: now) {
            perform(router.roleChanged(to: newRole))
            rolePulse += 1
            Haptics.roleChanged()
        }
        role = finger.role
        roleHoldProgress = finger.roleHoldProgress

        if data.arslEnabled, let primary = frame.hands.first, now >= nextWordTick {
            nextWordTick = Self.nextDeadline(after: nextWordTick, interval: WordSignVoter.tickInterval, now: now)
            _ = voter.add(WordSignClassifier.classify(primary), quality: frame.quality)
        }

        let picked = SignArbiter.pick(finger: finger.result, word: voter.result, wordEnabled: data.arslEnabled)
        if picked != nil { debugResult = nil }
        sendResult = picked ?? debugResult
        if let picked, picked.accepted {
            perform(router.signResult(picked, currentRole: finger.role,
                                      roleHoldProgress: finger.roleHoldProgress, now: Self.nowMs))
        }
    }

    /// Fixed-rate deadline that never drifts behind `now`.
    private static func nextDeadline(after deadline: Double, interval: Double, now: Double) -> Double {
        let next = deadline + interval
        return next > now ? next : now + interval
    }

    /// 0.6 s after the caption stops changing, send the last 12 words to the translator.
    private func scheduleSnippet(_ text: String) {
        speechDebounce?.cancel()
        speechDebounce = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled, let self, let snippet = SpeechSnippet.latest(in: text) else { return }
            perform(router.speechSnippet(snippet, currentRole: role, now: Self.nowMs))
        }
    }

    private func perform(_ actions: [LensAction]) {
        for action in actions {
            switch action {
            case .speak(let text):
                engines.speak.speak(text, force: true)
            case .publish(let phrase):
                engines.peer.send(.phrase(phrase))
                log.record(phrase)
            case .showLawyerPhrase(let phrase):
                lawyerPhrase = phrase
                log.record(phrase)
            case .showRemotePerson(let phrase):
                remotePerson = phrase
                log.record(phrase)
            case .pulse:
                pulseToken += 1
                Haptics.accept()
            }
        }
    }

    // MARK: Two-phone session

    func handleRemote(_ message: SceneMessage) {
        perform(router.remote(message))
    }

    func snapshot() -> SceneMessage {
        router.snapshot()
    }

    // MARK: Controls

    func toggleReceive() {
        settings.data.receiveEnabled.toggle()
        Task { await applyEngines() }
    }

    func toggleSend() {
        guard !isDedicated else { return }
        settings.data.sendEnabled.toggle()
        resetSigns()
        engines.camera.facing = settings.data.sendEnabled ? .front : (settings.data.safetyEnabled ? .back : .front)
        Task { await applyEngines() }
    }

    func toggleSafety() {
        settings.data.safetyEnabled.toggle()
        Task { await applyEngines() }
    }

    func toggleTranslate() {
        translateVisible.toggle()
    }

    func toggleLetters() {
        spellLetters.toggle()
        translateVisible = true
        alphabet = AlphabetWriter(holdSeconds: settings.data.tuning.letterHold)
        resetSigns()
    }

    /// Typed text from the person (keyboard sheet): spoken, or sent to the lawyer phone.
    func sendTyped(_ text: String) {
        perform(router.alphabetSend(text, now: Self.nowMs))
    }

    func clearLog() {
        log.clear()
    }

    /// Mode changes must not re-speak the last accepted sign (web clears results when disabled).
    private func resetSigns() {
        finger.reset()
        voter.reset()
        sendResult = nil
        debugResult = nil
        roleHoldProgress = 0
    }

    func flipCamera() {
        engines.camera.facing = engines.camera.facing == .front ? .back : .front
        Task { await applyEngines() }
    }

    func clear() {
        engines.speech.clearText()
        seenSpeech = ""
        if spellLetters { alphabet.clear() }
    }

    func tapRole() {
        let next: Role = role == .lawyer ? .person : .lawyer
        guard finger.setRole(next) else { return }
        role = next
        rolePulse += 1
        perform(router.roleChanged(to: next))
    }

    func replay() {
        guard let display = sendResult?.display else { return }
        engines.speak.speak(display, force: true)
    }

    func alphabetSpace() { alphabet.space() }
    func alphabetBackspace() { alphabet.backspace() }
    func alphabetClear() { alphabet.clear() }

    func sendAlphabet() {
        let actions = router.alphabetSend(alphabet.text, now: Self.nowMs)
        guard !actions.isEmpty else { return }
        perform(actions)
        alphabet.clear()
        alphabetSent = true
        sentReset?.cancel()
        sentReset = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(2500))
            guard !Task.isCancelled else { return }
            self?.alphabetSent = false
        }
    }

    func dismissAlert() {
        safetyAlert = nil
        engines.sound.clearAlert()
    }

    /// DEBUG: behave as if the current role's phrase for `fingers` was signed.
    func injectDebug(fingers: Int) {
        guard let phrase = settings.data.phraseBook.phrase(for: role, fingers: fingers) else { return }
        let result = SignResult(fingers: fingers, display: phrase, role: role, confidence: 0.99, accepted: true)
        debugResult = result
        sendResult = result
        perform(router.signResult(result, currentRole: role, roleHoldProgress: 0, now: Self.nowMs))
    }

    static var nowMs: Int64 { Int64(Date().timeIntervalSince1970 * 1000) }
}
