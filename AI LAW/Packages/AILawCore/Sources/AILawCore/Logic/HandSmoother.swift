import Foundation

/// Exponential moving average per hand slot (web `emaLandmarks`), frame-rate independent:
/// `alpha` is the per-frame weight at 30 fps and is adjusted for the real frame time.
public struct HandSmoother: Sendable {
    public let alpha: Double
    private var previous: [HandLandmarks] = []

    public init(alpha: Double = 0.35) {
        self.alpha = alpha
    }

    /// Hands are ordered by wrist x first: Vision (unlike MediaPipe) does not keep a stable
    /// hand order between frames, and slots are matched by index.
    public mutating func smooth(_ hands: [HandLandmarks], dt: Double = 1.0 / 30) -> [HandLandmarks] {
        let alpha = 1 - pow(1 - self.alpha, max(dt, 0) * 30)
        let ordered = hands.sorted { $0[.wrist].x < $1[.wrist].x }
        let out = ordered.enumerated().map { i, hand -> HandLandmarks in
            guard i < previous.count else { return hand }
            let prev = previous[i]
            let blended = zip(hand.points, prev.points).map { p, q in
                Point3(alpha * p.x + (1 - alpha) * q.x,
                       alpha * p.y + (1 - alpha) * q.y,
                       alpha * p.z + (1 - alpha) * q.z)
            }
            return HandLandmarks(points: blended) ?? hand
        }
        previous = out
        return out
    }

    public mutating func reset() {
        previous = []
    }
}

/// Mean planar displacement between two hands; 1 when either is missing (web `landmarkMotion`).
public func landmarkMotion(_ a: HandLandmarks?, _ b: HandLandmarks?) -> Double {
    guard let a, let b else { return 1 }
    let total = zip(a.points, b.points).reduce(0) { $0 + planarDistance($1.0, $1.1) }
    return total / Double(a.points.count)
}
