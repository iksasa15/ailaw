import AVFoundation
import Observation
import os

/// Main-actor facade over the capture pipeline: permission, status, facing, frame consumers.
@Observable
final class CameraEngine {
    enum Status: Equatable {
        case idle, ready, denied, unavailable
        case failed(String)
    }

    enum Facing {
        case front, back
    }

    private(set) var status: Status = .idle
    /// Frames arrive upright (portrait) and mirrored for the front camera, like the preview.
    let bufferSize = CGSize(width: 720, height: 1280)

    var facing: Facing = .front {
        didSet {
            guard oldValue != facing, status == .ready else { return }
            Task { await configure() }
        }
    }

    @ObservationIgnored let controller = CaptureController()
    var session: AVCaptureSession { controller.session }

    func start() async {
        // Check hardware first so the simulator never shows a permission prompt.
        guard CaptureController.device(front: facing == .front) != nil else {
            status = .unavailable
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            break
        case .notDetermined:
            guard await AVCaptureDevice.requestAccess(for: .video) else {
                status = .denied
                return
            }
        default:
            status = .denied
            return
        }
        await configure()
    }

    func stop() {
        controller.stop()
        if status == .ready { status = .idle }
    }

    func addConsumer(_ id: String, interval: TimeInterval, _ handler: @escaping @Sendable (CVPixelBuffer, TimeInterval) -> Void) {
        controller.addConsumer(id, interval: interval, handler)
    }

    func removeConsumer(_ id: String) {
        controller.removeConsumer(id)
    }

    private func configure() async {
        let front = facing == .front
        let ok = await withCheckedContinuation { continuation in
            controller.configureAndRun(front: front) { continuation.resume(returning: $0) }
        }
        status = ok ? .ready : .failed("تعذّر تشغيل الكاميرا")
    }
}

/// Owns the AVCaptureSession on its own queues and fans frames out to throttled consumers.
nonisolated final class CaptureController: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked Sendable {
    let session = AVCaptureSession()

    private struct Consumer {
        let interval: TimeInterval
        var last: TimeInterval
        let handler: @Sendable (CVPixelBuffer, TimeInterval) -> Void
    }

    private let sessionQueue = DispatchQueue(label: "ailaw.camera.session")
    private let videoQueue = DispatchQueue(label: "ailaw.camera.video", qos: .userInitiated)
    private let output = AVCaptureVideoDataOutput()
    private var input: AVCaptureDeviceInput?
    private let consumers = OSAllocatedUnfairLock<[String: Consumer]>(initialState: [:])

    static func device(front: Bool) -> AVCaptureDevice? {
        AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: front ? .front : .back)
    }

    func configureAndRun(front: Bool, completion: @escaping @Sendable (Bool) -> Void) {
        sessionQueue.async { [self] in
            guard let device = Self.device(front: front),
                  let newInput = try? AVCaptureDeviceInput(device: device) else {
                completion(false)
                return
            }
            session.beginConfiguration()
            if session.canSetSessionPreset(.hd1280x720) { session.sessionPreset = .hd1280x720 }
            if let input { session.removeInput(input) }
            guard session.canAddInput(newInput) else {
                session.commitConfiguration()
                completion(false)
                return
            }
            session.addInput(newInput)
            input = newInput

            if !session.outputs.contains(output) {
                output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
                output.alwaysDiscardsLateVideoFrames = true
                output.setSampleBufferDelegate(self, queue: videoQueue)
                if session.canAddOutput(output) { session.addOutput(output) }
            }
            if let connection = output.connection(with: .video) {
                if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
                if connection.isVideoMirroringSupported {
                    connection.automaticallyAdjustsVideoMirroring = false
                    connection.isVideoMirrored = front
                }
            }
            session.commitConfiguration()
            if !session.isRunning { session.startRunning() }
            completion(session.isRunning)
        }
    }

    func stop() {
        sessionQueue.async { [self] in
            if session.isRunning { session.stopRunning() }
        }
    }

    func addConsumer(_ id: String, interval: TimeInterval, _ handler: @escaping @Sendable (CVPixelBuffer, TimeInterval) -> Void) {
        consumers.withLock { $0[id] = Consumer(interval: interval, last: -.infinity, handler: handler) }
    }

    func removeConsumer(_ id: String) {
        _ = consumers.withLock { $0.removeValue(forKey: id) }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds
        let due = consumers.withLock { all -> [@Sendable (CVPixelBuffer, TimeInterval) -> Void] in
            var handlers: [@Sendable (CVPixelBuffer, TimeInterval) -> Void] = []
            for (id, consumer) in all where time - consumer.last >= consumer.interval {
                all[id]?.last = time
                handlers.append(consumer.handler)
            }
            return handlers
        }
        for handler in due { handler(buffer, time) }
    }
}
