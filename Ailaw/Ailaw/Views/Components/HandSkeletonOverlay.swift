import SwiftUI

/// Skeleton overlay matching MediaPipe / web HandLandmarkCanvas.
struct HandSkeletonOverlay: View {
    let hands: [[HandLandmark]]
    let quality: TrackingQuality
    /// Front camera preview is mirrored — flip X to align dots with the hand.
    var mirrored: Bool = true

    private static let connections: [(Int, Int)] = [
        (0, 1), (1, 2), (2, 3), (3, 4),
        (0, 5), (5, 6), (6, 7), (7, 8),
        (0, 9), (9, 10), (10, 11), (11, 12),
        (0, 13), (13, 14), (14, 15), (15, 16),
        (0, 17), (17, 18), (18, 19), (19, 20),
        (5, 9), (9, 13), (13, 17),
    ]

    private static let fingertipIndices: Set<Int> = [4, 8, 12, 16, 20]

    var body: some View {
        GeometryReader { geo in
            Canvas { context, size in
                for hand in hands where hand.count >= 21 {
                    draw(hand: hand, in: &context, size: size)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .allowsHitTesting(false)
    }

    private func draw(hand: [HandLandmark], in context: inout GraphicsContext, size: CGSize) {
        let points: [CGPoint] = hand.map { lm in
            let x = mirrored ? (1 - lm.x) : lm.x
            return CGPoint(x: x * size.width, y: lm.y * size.height)
        }

        let stroke = skeletonColor.opacity(0.9)
        var path = Path()
        for (a, b) in Self.connections {
            guard a < points.count, b < points.count else { continue }
            path.move(to: points[a])
            path.addLine(to: points[b])
        }
        context.stroke(path, with: .color(stroke), style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))

        // Soft glow under bones
        context.stroke(
            path,
            with: .color(skeletonColor.opacity(0.25)),
            style: StrokeStyle(lineWidth: 8, lineCap: .round, lineJoin: .round)
        )

        for (i, p) in points.enumerated() {
            let isTip = Self.fingertipIndices.contains(i)
            let r: CGFloat = isTip ? 8 : 5
            let rect = CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2)
            context.fill(Circle().path(in: rect), with: .color(dotColor(isTip: isTip)))
            if isTip {
                context.stroke(
                    Circle().path(in: rect.insetBy(dx: -2, dy: -2)),
                    with: .color(Color.white.opacity(0.85)),
                    lineWidth: 1.5
                )
            }
        }
    }

    private var skeletonColor: Color {
        switch quality {
        case .locked: return AppTheme.accent
        case .weak: return Color.yellow
        case .lost: return Color.orange
        }
    }

    private func dotColor(isTip: Bool) -> Color {
        if isTip { return Color.white }
        switch quality {
        case .locked: return AppTheme.accent
        case .weak: return Color.yellow
        case .lost: return Color.orange
        }
    }
}
