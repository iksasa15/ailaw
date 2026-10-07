@testable import AILawCore

enum Finger: Hashable { case thumb, index, middle, ring, little }

enum HandFixture {
    /// Wrist at origin, fingers pointing up (y decreases). Thumb on the left.
    static func hand(extended: Set<Finger>, spacing: Double = 0.08,
                     thumbTipNear: Finger? = nil, origin: (x: Double, y: Double) = (0.5, 0.85)) -> HandLandmarks {
        func p(_ x: Double, _ y: Double) -> Point3 { Point3(origin.x + x, origin.y + y) }
        var pts = [Point3](repeating: p(0, 0), count: 21)
        let thumbOut = extended.contains(.thumb)
        pts[1] = p(-0.10, -0.08)
        pts[2] = thumbOut ? p(-0.18, -0.16) : p(-0.12, -0.16)
        pts[3] = thumbOut ? p(-0.25, -0.22) : p(-0.05, -0.24)
        pts[4] = thumbOut ? p(-0.33, -0.28) : p(0.03, -0.22)
        let fingers: [(Finger, Int)] = [(.index, 5), (.middle, 9), (.ring, 13), (.little, 17)]
        for (i, (finger, base)) in fingers.enumerated() {
            let bx = (Double(i) - 1.5) * spacing
            let out = extended.contains(finger)
            pts[base] = p(bx, -0.30)
            pts[base + 1] = p(bx, -0.40)
            pts[base + 2] = out ? p(bx, -0.47) : p(bx, -0.33)
            pts[base + 3] = out ? p(bx, -0.55) : p(bx, -0.27)
        }
        if let near = thumbTipNear, near != .thumb {
            let tipIndex = [Finger.index: 8, .middle: 12, .ring: 16, .little: 20][near]!
            pts[4] = Point3(pts[tipIndex].x + 0.02, pts[tipIndex].y)
        }
        return HandLandmarks(points: pts)!
    }

    static let allFive: Set<Finger> = [.thumb, .index, .middle, .ring, .little]
}
