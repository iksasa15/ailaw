/// lost / weak / locked from frame-to-frame hand motion (web useHands.js processResults).
public struct TrackingQualityMeter: Sendable {
    public private(set) var quality: TrackingQuality = .lost
    private var stableFrames = 0
    private var lostFrames = 0

    public init() {}

    public mutating func update(previous: [HandLandmarks], current: [HandLandmarks]) -> TrackingQuality {
        guard let primary = current.first else {
            stableFrames = 0
            lostFrames += 1
            if lostFrames >= 5 { quality = .lost }
            return quality
        }
        lostFrames = 0
        var motion = landmarkMotion(previous.first, primary)
        if current.count > 1 {
            let second = landmarkMotion(previous.count > 1 ? previous[1] : nil, current[1])
            motion = (motion + second) / 2
        }
        if motion < 0.012 {
            stableFrames += 1
        } else {
            stableFrames = max(0, stableFrames - 2)
        }
        quality = stableFrames >= 10 ? .locked : .weak
        return quality
    }
}
