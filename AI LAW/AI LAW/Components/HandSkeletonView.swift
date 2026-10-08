import AILawCore
import SwiftUI

/// Draws tracked hands over the aspect-filled camera preview.
struct HandSkeletonView: View {
    let hands: [HandLandmarks]
    let quality: TrackingQuality
    let bufferSize: CGSize

    static let bones: [(Int, Int)] = [
        (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12),
        (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
    ]
    private static let tips: Set<Int> = [4, 8, 12, 16, 20]

    var body: some View {
        Canvas { context, size in
            let color = quality == .locked ? Theme.locked : Theme.weak
            for hand in hands {
                let pts = hand.points.map { map($0, in: size) }
                var path = Path()
                for (a, b) in Self.bones {
                    path.move(to: pts[a])
                    path.addLine(to: pts[b])
                }
                context.stroke(path, with: .color(color.opacity(0.9)), style: StrokeStyle(lineWidth: quality == .locked ? 3 : 2.4, lineCap: .round))
                for (i, p) in pts.enumerated() {
                    let r: CGFloat = Self.tips.contains(i) ? 6 : 3.5
                    context.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2)), with: .color(color))
                }
            }
        }
        .allowsHitTesting(false)
        // Camera space is never mirrored by the RTL layout.
        .environment(\.layoutDirection, .leftToRight)
    }

    /// Landmark (image-width units on both axes) → view point under aspect-fill.
    private func map(_ p: Point3, in size: CGSize) -> CGPoint {
        let scale = max(size.width / bufferSize.width, size.height / bufferSize.height)
        let offX = (size.width - bufferSize.width * scale) / 2
        let offY = (size.height - bufferSize.height * scale) / 2
        return CGPoint(x: p.x * bufferSize.width * scale + offX, y: p.y * bufferSize.width * scale + offY)
    }
}
