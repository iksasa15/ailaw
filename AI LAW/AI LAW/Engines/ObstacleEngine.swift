import AILawCore
import CoreVideo
import Observation

/// Warns when a wall or barrier fills the camera (web useObstacleProximity).
@Observable
final class ObstacleEngine {
    private(set) var near = false
    /// Increments on every alert so the UI can react once per alert.
    private(set) var alertToken = 0

    @ObservationIgnored private let core = ObstacleCore()
    @ObservationIgnored private weak var camera: CameraEngine?
    @ObservationIgnored private weak var hub: AudioHub?

    func attach(to camera: CameraEngine, hub: AudioHub) {
        detach()
        self.camera = camera
        self.hub = hub
        core.reset()
        let core = self.core
        camera.addConsumer("obstacle", interval: ObstacleDetector.tickInterval) { [weak self] buffer, time in
            let reading = core.ingest(buffer, time: time)
            guard let engine = self else { return }
            Task { @MainActor in engine.apply(reading) }
        }
    }

    func detach() {
        camera?.removeConsumer("obstacle")
        camera = nil
        near = false
    }

    private func apply(_ reading: ObstacleReading) {
        guard camera != nil else { return }
        near = reading.near
        if reading.shouldAlert {
            alertToken += 1
            hub?.playAlarm(beeps: 5)
            Haptics.danger()
        }
    }
}

/// Runs on the camera's video queue only.
nonisolated final class ObstacleCore: @unchecked Sendable {
    private var detector = ObstacleDetector()

    func reset() {
        detector.reset()
    }

    func ingest(_ buffer: CVPixelBuffer, time: TimeInterval) -> ObstacleReading {
        detector.ingest(gray: Self.downsampleLuma(buffer), now: time)
    }

    /// Nearest-neighbour samples of the Y (luma) plane into an 80×60 grid, 0…255.
    static func downsampleLuma(_ buffer: CVPixelBuffer) -> [Float] {
        let w = ObstacleDetector.width, h = ObstacleDetector.height
        CVPixelBufferLockBaseAddress(buffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
        guard CVPixelBufferGetPlaneCount(buffer) > 0,
              let base = CVPixelBufferGetBaseAddressOfPlane(buffer, 0) else {
            return Array(repeating: 0, count: w * h)
        }
        let width = CVPixelBufferGetWidthOfPlane(buffer, 0)
        let height = CVPixelBufferGetHeightOfPlane(buffer, 0)
        let rowBytes = CVPixelBufferGetBytesPerRowOfPlane(buffer, 0)
        let pixels = base.assumingMemoryBound(to: UInt8.self)
        var gray = [Float](repeating: 0, count: w * h)
        for y in 0..<h {
            let row = (y * height / h) * rowBytes
            for x in 0..<w {
                gray[y * w + x] = Float(pixels[row + x * width / w])
            }
        }
        return gray
    }
}
