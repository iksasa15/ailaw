import AILawCore
import Foundation
import Observation

/// Lab tab: scripted accident scenario, manual sign translator, lawyer mic test (port of web Lab.jsx).
@Observable
final class LabViewModel {
    let lines = CaseScenario.lines

    private(set) var stepIndex = -1
    private(set) var autoPlay = false
    var spellLetters = false
    var draft = ""
    private(set) var listening = false
    private(set) var lawyerPhrase: ScenePhrase?
    private(set) var personLine: ScenarioLine?

    @ObservationIgnored private let engines: AppEngines
    @ObservationIgnored private var autoTask: Task<Void, Never>?
    @ObservationIgnored private var listenTask: Task<Void, Never>?
    @ObservationIgnored private var lastSent = ""

    init(engines: AppEngines) {
        self.engines = engines
    }

    var current: ScenarioLine? { lines.indices.contains(stepIndex) ? lines[stepIndex] : nil }
    var progress: Double { stepIndex < 0 ? 0 : Double(stepIndex + 1) / Double(lines.count) }
    var isLastStep: Bool { stepIndex >= lines.count - 1 }

    var clips: [SignClip]? {
        SignLexicon.resolve(text: lawyerPhrase?.text, fingers: lawyerPhrase?.fingers, spellLetters: spellLetters)
    }

    var clipsToken: String { "\(lawyerPhrase?.id.uuidString ?? "-"):\(spellLetters)" }

    var autoPlayTitle: String {
        autoPlay ? "إيقاف تلقائي" : stepIndex < 0 ? "تشغيل السيناريو" : "متابعة تلقائية"
    }

    func play(_ index: Int) {
        guard lines.indices.contains(index) else { return }
        stepIndex = index
        let line = lines[index]
        if line.role == .lawyer {
            personLine = nil
            lawyerPhrase = ScenePhrase(id: UUID(), role: .lawyer, text: line.text, fingers: line.fingers, at: Self.nowMs)
            draft = line.text
        } else {
            lawyerPhrase = nil
            personLine = line
        }
        engines.speak.speak(line.text, force: true)
        scheduleAuto()
    }

    func next() {
        let next = stepIndex < 0 ? 0 : stepIndex + 1
        guard next < lines.count else {
            setAutoPlay(false)
            return
        }
        play(next)
    }

    func tapLine(_ index: Int) {
        setAutoPlay(false)
        play(index)
    }

    func toggleAutoPlay() {
        if stepIndex < 0 {
            autoPlay = true
            play(0)
        } else {
            setAutoPlay(!autoPlay)
        }
    }

    func reset() {
        setAutoPlay(false)
        stepIndex = -1
        lawyerPhrase = nil
        personLine = nil
        draft = ""
    }

    /// Show a lawyer phrase in the translator; speak it unless it came from the mic.
    func push(_ text: String, speak: Bool = true, fingers: Int? = nil) {
        let cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        lawyerPhrase = ScenePhrase(id: UUID(), role: .lawyer, text: cleaned, fingers: fingers, at: Self.nowMs)
        draft = cleaned
        if speak { engines.speak.speak(cleaned, force: true) }
    }

    func toggleListening() async {
        if listening {
            stopListening()
            return
        }
        await engines.audio.start()
        guard engines.audio.status == .running else { return }
        engines.speech.start(using: engines.audio)
        listening = true
        listenTask = Task { [weak self] in await self?.followSpeech() }
    }

    func stopListening() {
        listenTask?.cancel()
        listenTask = nil
        guard listening else { return }
        listening = false
        engines.speech.stop()
        engines.audio.stop()
    }

    func onDisappear() {
        setAutoPlay(false)
        stopListening()
    }

    var micStatus: String {
        if engines.audio.status == .denied { return "المايك مرفوض" }
        switch engines.speech.status {
        case .unavailable: return "الكلام العربي غير جاهز — افتح فحص الجاهزية"
        case .denied: return "التعرف على الكلام مرفوض"
        case .error(let message): return message
        case .listening: return "يستمع…"
        case .idle: return listening ? "جاهز" : "متوقف"
        }
    }

    /// Mic text → debounced 0.6 s → last 12 words → translator (no speech).
    private func followSpeech() async {
        var seen = ""
        var pending: Task<Void, Never>?
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(150))
            let text = engines.speech.text
            guard text != seen else { continue }
            seen = text
            pending?.cancel()
            pending = Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(600))
                guard !Task.isCancelled, let self, let snippet = SpeechSnippet.latest(in: text), snippet != lastSent else { return }
                lastSent = snippet
                push(snippet, speak: false)
            }
        }
        pending?.cancel()
    }

    private func setAutoPlay(_ on: Bool) {
        autoPlay = on
        if on { scheduleAuto() } else { autoTask?.cancel() }
    }

    private func scheduleAuto() {
        autoTask?.cancel()
        guard autoPlay, let line = current else { return }
        guard !isLastStep else {
            autoPlay = false
            return
        }
        let delay: Duration = line.role == .lawyer ? .milliseconds(4200) : .milliseconds(3200)
        autoTask = Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard !Task.isCancelled, let self, autoPlay else { return }
            play(stepIndex + 1)
        }
    }

    static var nowMs: Int64 { Int64(Date().timeIntervalSince1970 * 1000) }
}
