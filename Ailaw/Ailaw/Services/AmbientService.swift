import AVFoundation
import Foundation
import UIKit

@Observable
final class AmbientService {
    private let api: APIClient
    private var timer: Timer?
    private var recorder: AVAudioRecorder?
    private var fileURL: URL?

    private(set) var lastLabel: String?
    private(set) var isDanger = false
    var onDanger: ((String) -> Void)?

    init(api: APIClient) {
        self.api = api
    }

    func start() {
        stop()
        timer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: true) { [weak self] _ in
            Task { await self?.captureAndClassify() }
        }
        Task { await captureAndClassify() }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        recorder?.stop()
        recorder = nil
    }

    private func captureAndClassify() async {
        let granted = await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            AVAudioApplication.requestRecordPermission { cont.resume(returning: $0) }
        }
        guard granted else { return }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothHFP])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            try session.overrideOutputAudioPort(.speaker)

            let url = FileManager.default.temporaryDirectory.appendingPathComponent("ambient-\(UUID().uuidString).wav")
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatLinearPCM),
                AVSampleRateKey: 16000,
                AVNumberOfChannelsKey: 1,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsFloatKey: false,
                AVLinearPCMIsBigEndianKey: false,
            ]
            let rec = try AVAudioRecorder(url: url, settings: settings)
            recorder = rec
            fileURL = url
            rec.record()
            try await Task.sleep(nanoseconds: 1_200_000_000)
            rec.stop()

            let data = try Data(contentsOf: url)
            try? FileManager.default.removeItem(at: url)

            let result = try await api.classifyAmbient(data: data)
            await MainActor.run {
                self.lastLabel = result.label
                if result.is_danger == true {
                    self.isDanger = true
                    let label = result.label ?? "خطر"
                    self.onDanger?(label)
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                        self.isDanger = false
                    }
                }
            }
        } catch {
            // silent — ambient is best-effort
        }
    }
}

@Observable
final class ObstacleService {
    private(set) var isNear = false
    var onObstacle: (() -> Void)?

    private var lastAlert: Date = .distantPast
    private var cooldown: TimeInterval = 4
    private var sampleCount = 0

    func analyze(pixelBuffer: CVPixelBuffer) {
        sampleCount += 1
        guard sampleCount % 8 == 0 else { return }

        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        guard let base = CVPixelBufferGetBaseAddress(pixelBuffer) else { return }
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        let buffer = base.assumingMemoryBound(to: UInt8.self)

        // Sample center region brightness variance / edge energy
        let x0 = width / 3
        let x1 = (2 * width) / 3
        let y0 = height / 3
        let y1 = (2 * height) / 3
        var sum = 0
        var sumSq = 0
        var edge = 0
        var n = 0
        var prev: Int = -1

        for y in stride(from: y0, to: y1, by: 8) {
            for x in stride(from: x0, to: x1, by: 8) {
                let offset = y * bytesPerRow + x * 4
                let b = Int(buffer[offset])
                let g = Int(buffer[offset + 1])
                let r = Int(buffer[offset + 2])
                let gray = (r + g + b) / 3
                sum += gray
                sumSq += gray * gray
                if prev >= 0 {
                    edge += abs(gray - prev)
                }
                prev = gray
                n += 1
            }
        }
        guard n > 0 else { return }
        let mean = Double(sum) / Double(n)
        let variance = Double(sumSq) / Double(n) - mean * mean
        let avgEdge = Double(edge) / Double(max(1, n - 1))

        // Low edges + mid brightness often means wall/close surface filling frame
        let near = avgEdge < 12 && variance < 900 && mean > 25 && mean < 230
        DispatchQueue.main.async {
            self.isNear = near
            if near, Date().timeIntervalSince(self.lastAlert) > self.cooldown {
                self.lastAlert = Date()
                self.onObstacle?()
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            }
        }
    }
}
