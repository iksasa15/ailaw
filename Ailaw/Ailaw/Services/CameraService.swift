import AVFoundation
import Combine
import UIKit

enum CameraFacing: Sendable, Equatable {
    case front
    case back
}

@Observable
final class CameraService: NSObject {
    let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "ailaw.camera")
    private let videoOutput = AVCaptureVideoDataOutput()
    private var currentFacing: CameraFacing = .front
    private var isConfigured = false

    var onFrame: ((CVPixelBuffer) -> Void)?
    var permissionGranted = false
    var isRunning = false
    var errorMessage: String?

    func requestAccessAndStart(facing: CameraFacing) {
        currentFacing = facing
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            permissionGranted = true
            start(facing: facing)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    self.permissionGranted = granted
                    if granted { self.start(facing: facing) }
                    else { self.errorMessage = "لم يتم السماح بالكاميرا" }
                }
            }
        default:
            permissionGranted = false
            errorMessage = "فعّل الكاميرا من إعدادات النظام"
        }
    }

    func setFacing(_ facing: CameraFacing) {
        guard facing != currentFacing else { return }
        currentFacing = facing
        sessionQueue.async { [weak self] in
            self?.reconfigure(facing: facing)
        }
    }

    func start(facing: CameraFacing) {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            if !self.isConfigured {
                self.configure(facing: facing)
            } else if facing != self.currentFacing {
                self.reconfigure(facing: facing)
            }
            if !self.session.isRunning {
                self.session.startRunning()
            }
            DispatchQueue.main.async {
                self.isRunning = self.session.isRunning
            }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            if self.session.isRunning {
                self.session.stopRunning()
            }
            DispatchQueue.main.async {
                self.isRunning = false
            }
        }
    }

    private func configure(facing: CameraFacing) {
        session.beginConfiguration()
        session.sessionPreset = .high
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }

        let position: AVCaptureDevice.Position = facing == .front ? .front : .back
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input)
        else {
            session.commitConfiguration()
            DispatchQueue.main.async { self.errorMessage = "تعذر تهيئة الكاميرا" }
            return
        }
        session.addInput(input)

        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "ailaw.video"))
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }
        if let connection = videoOutput.connection(with: .video) {
            if connection.isVideoRotationAngleSupported(90) {
                connection.videoRotationAngle = 90
            }
            if facing == .front && connection.isVideoMirroringSupported {
                connection.isVideoMirrored = true
            }
        }

        currentFacing = facing
        isConfigured = true
        session.commitConfiguration()
    }

    private func reconfigure(facing: CameraFacing) {
        let wasRunning = session.isRunning
        if wasRunning { session.stopRunning() }
        isConfigured = false
        configure(facing: facing)
        if wasRunning { session.startRunning() }
        DispatchQueue.main.async {
            self.isRunning = self.session.isRunning
        }
    }
}

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        onFrame?(buffer)
    }
}
