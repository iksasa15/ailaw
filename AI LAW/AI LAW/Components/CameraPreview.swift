import AVFoundation
import SwiftUI
import UIKit

/// Full-bleed camera preview (aspect fill), matching the frames the engines analyze.
/// iPhone stays portrait. On iPad the preview follows the interface orientation through
/// `AVCaptureDevice.RotationCoordinator` and reports each angle so the analysed frames rotate too.
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    /// The camera in use; the coordinator is rebuilt when it (or `configuration`) changes.
    var device: AVCaptureDevice?
    var configuration = 0
    var onRotation: ((CGFloat) -> Void)?

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        view.backgroundColor = .black
        view.onRotation = onRotation
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.onRotation = onRotation
        uiView.track(device: device, configuration: configuration)
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
        var onRotation: ((CGFloat) -> Void)?

        private var angle: CGFloat = 90
        private var coordinator: AVCaptureDevice.RotationCoordinator?
        private var observation: NSKeyValueObservation?
        private var trackedID: String?
        private var trackedConfiguration = -1

        private var rotates: Bool { UIDevice.current.userInterfaceIdiom == .pad }

        func track(device: AVCaptureDevice?, configuration: Int) {
            guard rotates else { return }
            guard device?.uniqueID != trackedID || configuration != trackedConfiguration else { return }
            trackedID = device?.uniqueID
            trackedConfiguration = configuration
            observation = nil
            coordinator = nil
            guard let device else { return }
            let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: previewLayer)
            self.coordinator = coordinator
            observation = coordinator.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]) {
                @Sendable [weak self] coordinator, _ in
                let angle = coordinator.videoRotationAngleForHorizonLevelPreview
                guard let view = self else { return }
                Task { @MainActor in view.apply(angle) }
            }
        }

        private func apply(_ angle: CGFloat) {
            self.angle = angle
            applyToPreview()
            onRotation?(angle)
        }

        private func applyToPreview() {
            if let connection = previewLayer.connection, connection.isVideoRotationAngleSupported(angle),
               connection.videoRotationAngle != angle {
                connection.videoRotationAngle = angle
            }
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            // The preview connection appears once the session has an input; keep it on the current angle.
            applyToPreview()
        }
    }
}
