/// lost / weak / locked from hand speed, measured in seconds so it behaves the same at any
/// frame rate. The web counted frames (10 still frames, 0.012 per frame, 5 missing frames)
/// at ~30 fps; these are the same limits expressed per second.
public struct TrackingQualityMeter: Sendable {
    /// Mean landmark speed (image-width units per second) below which the hand counts as still.
    public let stableSpeed: Double
    /// Seconds of stillness before tracking is locked.
    public let lockSeconds: Double
    /// Seconds without a hand before tracking is lost.
    public let lostSeconds: Double

    public private(set) var quality: TrackingQuality = .lost
    private var stableTime = 0.0
    private var missingTime = 0.0

    public init(stableSpeed: Double = 0.45, lockSeconds: Double = 0.3, lostSeconds: Double = 0.3) {
        self.stableSpeed = stableSpeed
        self.lockSeconds = lockSeconds
        self.lostSeconds = lostSeconds
    }

    public mutating func update(previous: [HandLandmarks], current: [HandLandmarks], dt: Double) -> TrackingQuality {
        let dt = max(dt, 1e-3)
        guard let primary = current.first else {
            stableTime = 0
            missingTime += dt
            if missingTime >= lostSeconds - 1e-9 { quality = .lost }
            return quality
        }
        missingTime = 0
        var motion = landmarkMotion(previous.first, primary)
        if current.count > 1 {
            let second = landmarkMotion(previous.count > 1 ? previous[1] : nil, current[1])
            motion = (motion + second) / 2
        }
        if motion / dt < stableSpeed {
            stableTime += dt
        } else {
            stableTime = max(0, stableTime - 2 * dt)
        }
        quality = stableTime >= lockSeconds - 1e-9 ? .locked : .weak
        return quality
    }
}
