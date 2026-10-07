import AILawCore
import CoreVideo
import Observation
import Vision

/// On-device hand tracking (Vision) published in MediaPipe landmark space.
@Observable
final class HandTracker {
    private(set) var hands: [HandLandmarks] = []
    private(set) var quality: TrackingQuality = .lost
    private(set) var fps: Double = 0

    @ObservationIgnored private let processor = HandPoseProcessor()
    @ObservationIgnored private weak var camera: CameraEngine?

    func attach(to camera: CameraEngine) {
        detach()
        self.camera = camera
        processor.reset()
        let processor = self.processor
        camera.addConsumer("hands", interval: 0.125) { [weak self] buffer, time in
            let frame = processor.process(buffer, time: time)
            guard let tracker = self else { return }
            Task { @MainActor in tracker.apply(frame) }
        }
    }

    private func apply(_ frame: HandPoseProcessor.Frame) {
        guard camera != nil else { return }
        hands = frame.hands
        quality = frame.quality
        fps = frame.fps
    }

    func detach() {
        camera?.removeConsumer("hands")
        camera = nil
        hands = []
        quality = .lost
        fps = 0
    }
}

/// Runs on the camera's video queue only (serial), so its mutable state needs no lock.
nonisolated final class HandPoseProcessor: @unchecked Sendable {
    struct Frame: Sendable {
        let hands: [HandLandmarks]
        let quality: TrackingQuality
        let fps: Double
    }

    private let request: VNDetectHumanHandPoseRequest = {
        let r = VNDetectHumanHandPoseRequest()
        r.maximumHandCount = 2
        return r
    }()
    private var smoother = HandSmoother()
    private var meter = TrackingQualityMeter()
    private var previous: [HandLandmarks] = []
    private var frameTimes: [TimeInterval] = []

    func reset() {
        smoother.reset()
        meter = TrackingQualityMeter()
        previous = []
        frameTimes = []
    }

    func process(_ buffer: CVPixelBuffer, time: TimeInterval) -> Frame {
        let handler = VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up)
        try? handler.perform([request])
        let raw = (request.results ?? []).compactMap(Self.landmarks(from:))
        let smoothed = smoother.smooth(raw)
        let quality = meter.update(previous: previous, current: smoothed)
        previous = smoothed

        frameTimes.append(time)
        frameTimes.removeAll { time - $0 > 1 }
        return Frame(hands: smoothed, quality: quality, fps: Double(frameTimes.count))
    }

    /// Vision: origin bottom-left, y up → MediaPipe: origin top-left, y down.
    static func landmarks(from observation: VNHumanHandPoseObservation) -> HandLandmarks? {
        guard let points = try? observation.recognizedPoints(.all) else { return nil }
        var joints: [AILawCore.Joint: (point: Point3, confidence: Double)] = [:]
        for (name, joint) in jointMap {
            guard let p = points[name] else { continue }
            joints[joint] = (Point3(Double(p.location.x), 1 - Double(p.location.y)), Double(p.confidence))
        }
        return HandLandmarks.fromJoints(joints)
    }

    static let jointMap: [(VNHumanHandPoseObservation.JointName, AILawCore.Joint)] = [
        (.wrist, .wrist),
        (.thumbCMC, .thumbCMC), (.thumbMP, .thumbMCP), (.thumbIP, .thumbIP), (.thumbTip, .thumbTip),
        (.indexMCP, .indexMCP), (.indexPIP, .indexPIP), (.indexDIP, .indexDIP), (.indexTip, .indexTip),
        (.middleMCP, .middleMCP), (.middlePIP, .middlePIP), (.middleDIP, .middleDIP), (.middleTip, .middleTip),
        (.ringMCP, .ringMCP), (.ringPIP, .ringPIP), (.ringDIP, .ringDIP), (.ringTip, .ringTip),
        (.littleMCP, .littleMCP), (.littlePIP, .littlePIP), (.littleDIP, .littleDIP), (.littleTip, .littleTip),
    ]
}
