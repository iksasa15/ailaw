/// Majority vote over a short time window: an isolated misread (one finger or letter read
/// wrong for a frame) is ignored, while readings that keep disagreeing have no stable value.
public struct ReadingFilter<Value: Hashable & Sendable>: Sendable {
    public let window: Double
    public let minShare: Double

    private var times: [Double] = []
    private var values: [Value?] = []

    public init(window: Double = 0.36, minShare: Double = 0.6) {
        self.window = window
        self.minShare = minShare
    }

    /// `nil` means "no clear reading" and is ignored; returns the stable value, if any.
    public mutating func add(_ value: Value?, now: Double) -> Value? {
        times.append(now)
        values.append(value)
        while let first = times.first, now - first > window + 1e-9 {
            times.removeFirst()
            values.removeFirst()
        }
        var counts: [Value: Int] = [:]
        var total = 0
        for case let v? in values {
            counts[v, default: 0] += 1
            total += 1
        }
        guard total > 0, let best = counts.max(by: { $0.value < $1.value }) else { return nil }
        return Double(best.value) / Double(total) >= minShare - 1e-9 ? best.key : nil
    }

    public mutating func reset() {
        times = []
        values = []
    }
}
