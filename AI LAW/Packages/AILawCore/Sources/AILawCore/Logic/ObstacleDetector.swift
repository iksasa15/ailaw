public struct ObstacleReading: Equatable, Sendable {
    public let near: Bool
    public let shouldAlert: Bool
    public let score: Double

    public init(near: Bool, shouldAlert: Bool, score: Double) {
        self.near = near
        self.shouldAlert = shouldAlert
        self.score = score
    }
}

/// Detects a close barrier filling the camera: low detail, uniform brightness, or looming
/// (port of web useObstacleProximity.js).
public struct ObstacleDetector: Sendable {
    public static let width = 80
    public static let height = 60
    public static let tickInterval = 0.18

    public let cooldown: Double
    private var previous: [Float]?
    private var streak = 0
    private var lastAlertAt = -Double.infinity

    public init(cooldown: Double = 4.5) {
        self.cooldown = cooldown
    }

    /// `gray`: luma 0…255, row-major, width × height.
    public mutating func ingest(gray: [Float], now: Double) -> ObstacleReading {
        let (mean, std) = Self.meanStd(gray)
        let edges = Self.edgeEnergy(gray)
        let diff = Self.frameDiff(previous, gray)
        previous = gray

        let uniformClose = std < 26 && edges < 16 && mean > 20 && mean < 230
        let softClose = edges < 11 && mean > 28 && mean < 215
        let looming = softClose && diff > 7 && diff < 48
        if uniformClose || looming {
            streak += 1
        } else {
            streak = max(0, streak - 2)
        }

        let near = streak >= 6
        let score = min(0.99, 0.55 + Double(streak) * 0.05)
        var shouldAlert = false
        if near && now - lastAlertAt > cooldown {
            lastAlertAt = now
            shouldAlert = true
        }
        return ObstacleReading(near: near, shouldAlert: shouldAlert, score: score)
    }

    public mutating func reset() {
        previous = nil
        streak = 0
    }

    static func meanStd(_ gray: [Float]) -> (mean: Double, std: Double) {
        guard !gray.isEmpty else { return (0, 0) }
        let n = Double(gray.count)
        let mean = gray.reduce(0.0) { $0 + Double($1) } / n
        let variance = gray.reduce(0.0) { $0 + (Double($1) - mean) * (Double($1) - mean) } / n
        return (mean, variance.squareRoot())
    }

    static func edgeEnergy(_ gray: [Float]) -> Double {
        let w = width, h = height
        guard gray.count == w * h else { return 0 }
        var e = 0.0
        var n = 0
        for y in 1..<(h - 1) {
            for x in 1..<(w - 1) {
                let i = y * w + x
                let gx = Double(gray[i + 1] - gray[i - 1])
                let gy = Double(gray[i + w] - gray[i - w])
                e += abs(gx) + abs(gy)
                n += 1
            }
        }
        return n == 0 ? 0 : e / Double(n)
    }

    static func frameDiff(_ a: [Float]?, _ b: [Float]) -> Double {
        guard let a, a.count == b.count, !b.isEmpty else { return 0 }
        var s = 0.0
        for i in b.indices { s += Double(abs(a[i] - b[i])) }
        return s / Double(b.count)
    }
}
