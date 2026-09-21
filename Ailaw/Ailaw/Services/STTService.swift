import AVFoundation
import Foundation
import Speech

@Observable
final class STTService {
    private let api: APIClient
    private var wsTask: URLSessionWebSocketTask?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var chunkTimer: Timer?
    private var pcmBuffer = Data()
    private let chunkLock = NSLock()

    private(set) var caption = ""
    private(set) var isListening = false
    private(set) var mode: String = "idle" // whisper | browser | idle
    private(set) var errorMessage: String?

    private var useWhisper = false
    private var language = "ar"

    init(api: APIClient) {
        self.api = api
    }

    func clearCaption() {
        caption = ""
    }

    func start(useWhisper: Bool, language: String = "ar") async {
        await stop()
        self.useWhisper = useWhisper
        self.language = language
        errorMessage = nil

        let micOK = await requestMic()
        guard micOK else {
            errorMessage = "الميكروفون غير مسموح"
            return
        }

        if useWhisper {
            mode = "whisper"
            startWhisperStream()
        } else {
            mode = "browser"
            startAppleSpeech()
        }
        isListening = true
    }

    func stop() async {
        chunkTimer?.invalidate()
        chunkTimer = nil
        wsTask?.cancel(with: .goingAway, reason: nil)
        wsTask = nil
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine = nil
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isListening = false
        mode = "idle"
        pcmBuffer = Data()
    }

    private func requestMic() async -> Bool {
        await withCheckedContinuation { cont in
            AVAudioApplication.requestRecordPermission { granted in
                cont.resume(returning: granted)
            }
        }
    }

    // MARK: - Whisper WebSocket

    private func startWhisperStream() {
        guard let url = URL(string: api.wsBaseURL + "/ws/stt") else {
            errorMessage = "عنوان WS غير صالح"
            return
        }
        let task = URLSession.shared.webSocketTask(with: url)
        wsTask = task
        task.resume()

        let config: [String: Any] = ["type": "config", "language": language]
        if let data = try? JSONSerialization.data(withJSONObject: config),
           let text = String(data: data, encoding: .utf8) {
            task.send(.string(text)) { _ in }
        }
        receiveWS()
        startPCMCapture { [weak self] chunk in
            self?.appendPCM(chunk)
        }
        chunkTimer = Timer.scheduledTimer(withTimeInterval: 1.8, repeats: true) { [weak self] _ in
            self?.flushChunkToWS()
        }
    }

    private func receiveWS() {
        wsTask?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let type = json["type"] as? String,
                       let t = json["text"] as? String,
                       !t.isEmpty {
                        DispatchQueue.main.async {
                            if type == "final" || type == "partial" {
                                self.caption = t
                            }
                        }
                    }
                default:
                    break
                }
                self.receiveWS()
            case .failure(let error):
                DispatchQueue.main.async {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func appendPCM(_ data: Data) {
        chunkLock.lock()
        pcmBuffer.append(data)
        chunkLock.unlock()
    }

    private func flushChunkToWS() {
        chunkLock.lock()
        let data = pcmBuffer
        pcmBuffer = Data()
        chunkLock.unlock()
        guard !data.isEmpty, let wav = Self.pcm16ToWav(data, sampleRate: 16000) else { return }
        wsTask?.send(.data(wav)) { _ in }
    }

    // MARK: - Apple Speech fallback

    private func startAppleSpeech() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            guard let self else { return }
            guard status == .authorized,
                  let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ar-SA")),
                  recognizer.isAvailable
            else {
                DispatchQueue.main.async { self.errorMessage = "التعرف على الكلام غير متاح" }
                return
            }

            DispatchQueue.main.async {
                do {
                    try self.runAppleSpeech(recognizer: recognizer)
                } catch {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func runAppleSpeech(recognizer: SFSpeechRecognizer) throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let engine = AVAudioEngine()
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request
        audioEngine = engine

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        engine.prepare()
        try engine.start()

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                DispatchQueue.main.async {
                    self.caption = result.bestTranscription.formattedString
                }
            }
            if error != nil || (result?.isFinal ?? false) {
                // keep listening by restarting if still on
                if self.isListening, self.mode == "browser" {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        Task { await self.start(useWhisper: false, language: self.language) }
                    }
                }
            }
        }
    }

    private func startPCMCapture(onChunk: @escaping (Data) -> Void) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP, .mixWithOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let engine = AVAudioEngine()
            audioEngine = engine
            let input = engine.inputNode
            let inputFormat = input.outputFormat(forBus: 0)
            guard let converterFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true) else { return }

            input.installTap(onBus: 0, bufferSize: 2048, format: inputFormat) { buffer, _ in
                guard let converter = AVAudioConverter(from: inputFormat, to: converterFormat) else { return }
                let ratio = converterFormat.sampleRate / inputFormat.sampleRate
                let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
                guard let out = AVAudioPCMBuffer(pcmFormat: converterFormat, frameCapacity: capacity) else { return }
                var error: NSError?
                let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
                    outStatus.pointee = .haveData
                    return buffer
                }
                converter.convert(to: out, error: &error, withInputFrom: inputBlock)
                if let ch = out.int16ChannelData?[0] {
                    let data = Data(bytes: ch, count: Int(out.frameLength) * MemoryLayout<Int16>.size)
                    onChunk(data)
                }
            }
            engine.prepare()
            try engine.start()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    static func pcm16ToWav(_ pcm: Data, sampleRate: Int) -> Data? {
        var data = Data()
        let channels: Int16 = 1
        let bitsPerSample: Int16 = 16
        let byteRate = Int32(sampleRate * Int(channels) * Int(bitsPerSample) / 8)
        let blockAlign = Int16(channels * bitsPerSample / 8)
        let dataSize = Int32(pcm.count)
        let chunkSize = Int32(36 + pcm.count)

        func append(_ value: String) { data.append(value.data(using: .ascii)!) }
        func appendUInt16(_ v: UInt16) { var le = v.littleEndian; withUnsafeBytes(of: &le) { data.append(contentsOf: $0) } }
        func appendInt16(_ v: Int16) { var le = v.littleEndian; withUnsafeBytes(of: &le) { data.append(contentsOf: $0) } }
        func appendInt32(_ v: Int32) { var le = v.littleEndian; withUnsafeBytes(of: &le) { data.append(contentsOf: $0) } }

        append("RIFF")
        appendInt32(chunkSize)
        append("WAVE")
        append("fmt ")
        appendInt32(16)
        appendInt16(1)
        appendInt16(channels)
        appendInt32(Int32(sampleRate))
        appendInt32(byteRate)
        appendInt16(blockAlign)
        appendInt16(bitsPerSample)
        append("data")
        appendInt32(dataSize)
        data.append(pcm)
        return data
    }
}
