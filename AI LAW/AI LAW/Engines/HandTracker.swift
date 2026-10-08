import AILawCore
import CoreVideo
import Foundation
import Observation
import os
import Vision

/// On-device hand tracking (Vision) on every camera frame, in an isotropic landmark space:
/// x and y are both measured in image-width units (y ∈ 0…height/width), so distances and
/// ratios mean the same horizontally and vertically.
@Observable
final class HandTracker {
    private(set) var hands: [HandLandmarks] = []
    private(set) var quality: TrackingQuality = .lost
    private(set) var fps: Double = 0
    /// Height ÷ width of the analysed frames (y range of the landmarks).
    private(set) var aspect: Double = 16.0 / 9.0

    /// Called on the main actor for every analysed frame — the Lens drives recognition from it.
    @ObservationIgnored var onFrame: ((HandPoseProcessor.Frame) -> Void)?

    @ObservationIgnored private let processor = HandPoseProcessor()
    @ObservationIgnored private weak var camera: CameraEngine?

    var isAttached: Bool { camera != nil }

    func attach(to camera: CameraEngine) {
        detach()
        self.camera = camera
        processor.reset()
        let processor = self.processor
        camera.addConsumer("hands", interval: 0) { [weak self] buffer, time in
            guard let tracker = self else { return }
            processor.submit(buffer, time: time) { frame in
                Task { @MainActor in tracker.apply(frame) }
            }
        }
    }

    private func apply(_ frame: HandPoseProcessor.Frame) {
        guard camera != nil else { return }
        hands = frame.hands
        quality = frame.quality
        fps = frame.fps
        aspect = frame.aspect
        onFrame?(frame)
    }

    func detach() {
        camera?.removeConsumer("hands")
        camera = nil
        hands = []
        quality = .lost
        fps = 0
    }
}

/// Vision work on its own queue. Frames that arrive while a frame is being analysed are
/// dropped (latest frame wins), so analysis never falls behind the camera.
nonisolated final class HandPoseProcessor: @unchecked Sendable {
    struct Frame: Sendable {
        let hands: [HandLandmarks]
        let quality: TrackingQuality
        let fps: Double
        let aspect: Double
        /// Camera timestamp (seconds) of the analysed frame.
        let time: Double
    }

    private let queue = DispatchQueue(label: "ailaw.vision", qos: .userInteractive)
    private let busy = OSAllocatedUnfairLock(initialState: false)
    private let sequenceHandler = VNSequenceRequestHandler()
    private let request: VNDetectHumanHandPoseRequest = {
        let r = VNDetectHumanHandPoseRequest()
        r.maximumHandCount = 2
        return r
    }()

    // Touched only on `queue`.
    private var smoother = HandSmoother()
    private var meter = TrackingQualityMeter()
    private var previous: [HandLandmarks] = []
    private var lastTime = -1.0
    private var frameTimes: [Double] = []

    func reset() {
        queue.async { [self] in
            smoother.reset()
            meter = TrackingQualityMeter()
            previous = []
            lastTime = -1
            frameTimes = []
        }
    }

    func submit(_ buffer: CVPixelBuffer, time: Double, completion: @escaping @Sendable (Frame) -> Void) {
        let free = busy.withLock { busy -> Bool in
            guard !busy else { return false }
            busy = true
            return true
        }
        guard free else { return }
        nonisolated(unsafe) let pixels = buffer
        queue.async { [self] in
            defer { busy.withLock { $0 = false } }
            // Heat protection: fewer analyses per second when the phone gets hot.
            let minInterval = Self.minInterval(for: ProcessInfo.processInfo.thermalState)
            if lastTime >= 0, time - lastTime < minInterval { return }
            completion(process(pixels, time: time))
        }
    }

    static func minInterval(for state: ProcessInfo.ThermalState) -> Double {
        switch state {
        case .nominal, .fair: 0 // every camera frame (30 fps)
        case .serious: 1.0 / 15
        case .critical: 1.0 / 8
        @unknown default: 1.0 / 15
        }
    }

    private func process(_ buffer: CVPixelBuffer, time: Double) -> Frame {
        let dt = lastTime < 0 ? 1.0 / 30 : min(max(time - lastTime, 1e-3), 0.5)
        lastTime = time
        let width = Double(CVPixelBufferGetWidth(buffer))
        let height = Double(CVPixelBufferGetHeight(buffer))
        let aspect = width > 0 ? height / width : 16.0 / 9.0

        try? sequenceHandler.perform([request], on: buffer, orientation: .up)
        let raw = (request.results ?? []).compactMap { Self.landmarks(from: $0, aspect: aspect) }
        let smoothed = smoother.smooth(raw, dt: dt)
        let quality = meter.update(previous: previous, current: smoothed, dt: dt)
        previous = smoothed

        frameTimes.append(time)
        frameTimes.removeAll { time - $0 > 1 }
        return Frame(hands: smoothed, quality: quality, fps: Double(frameTimes.count), aspect: aspect, time: time)
    }

    /// Vision: normalised, origin bottom-left, y up → origin top-left, y down, in width units.
    static func landmarks(from observation: VNHumanHandPoseObservation, aspect: Double) -> HandLandmarks? {
        guard let points = try? observation.recognizedPoints(.all) else { return nil }
        var joints: [AILawCore.Joint: (point: Point3, confidence: Double)] = [:]
        for (name, joint) in jointMap {
            guard let p = points[name] else { continue }
            joints[joint] = (Point3(Double(p.location.x), (1 - Double(p.location.y)) * aspect), Double(p.confidence))
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
