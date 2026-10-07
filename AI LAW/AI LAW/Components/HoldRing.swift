import SwiftUI

/// Circular progress for "hold to confirm" gestures (role switch, letters).
struct HoldRing: View {
    let progress: Double
    var lineWidth: CGFloat = 4
    var color: Color = Theme.highlight

    var body: some View {
        ZStack {
            Circle().stroke(.white.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: max(0, min(1, progress)))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 0.12), value: progress)
        }
        .environment(\.layoutDirection, .leftToRight)
    }
}
