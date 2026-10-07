import Foundation

/// A landmark in MediaPipe image space: origin top-left, y grows downward, x/y normalized 0…1.
public struct Point3: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var z: Double

    public init(_ x: Double, _ y: Double, _ z: Double = 0) {
        self.x = x
        self.y = y
        self.z = z
    }
}

/// The 21 hand joints in MediaPipe order.
public enum Joint: Int, CaseIterable, Sendable {
    case wrist = 0
    case thumbCMC, thumbMCP, thumbIP, thumbTip
    case indexMCP, indexPIP, indexDIP, indexTip
    case middleMCP, middlePIP, middleDIP, middleTip
    case ringMCP, ringPIP, ringDIP, ringTip
    case littleMCP, littlePIP, littleDIP, littleTip
}

/// One tracked hand: exactly 21 points in MediaPipe order.
public struct HandLandmarks: Equatable, Sendable {
    public let points: [Point3]

    public init?(points: [Point3]) {
        guard points.count == Joint.allCases.count else { return nil }
        self.points = points
    }

    public subscript(_ joint: Joint) -> Point3 { points[joint.rawValue] }

    /// Builds a hand from per-joint detections. Low-confidence joints keep their reported
    /// location; the hand is rejected only when a joint is missing or too few are confident.
    public static func fromJoints(
        _ joints: [Joint: (point: Point3, confidence: Double)],
        minConfidence: Double = 0.3,
        minConfidentJoints: Int = 16
    ) -> HandLandmarks? {
        var points: [Point3] = []
        points.reserveCapacity(Joint.allCases.count)
        var confident = 0
        for joint in Joint.allCases {
            guard let detection = joints[joint] else { return nil }
            points.append(detection.point)
            if detection.confidence >= minConfidence { confident += 1 }
        }
        guard confident >= minConfidentJoints else { return nil }
        return HandLandmarks(points: points)
    }
}

/// 2D distance ignoring z, matching the web `dist()` helpers.
public func planarDistance(_ a: Point3, _ b: Point3) -> Double {
    hypot(a.x - b.x, a.y - b.y)
}
