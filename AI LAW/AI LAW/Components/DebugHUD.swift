import AILawCore
import SwiftUI

/// Raw tracking numbers for tuning thresholds on the device (long-press the tracking chip).
struct DebugHUD: View {
    let hands: [HandLandmarks]
    let quality: TrackingQuality
    let fps: Double
    var onInject: ((Int) -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("quality: \(quality.rawValue)  fps: \(Int(fps))")
            ForEach(Array(hands.enumerated()), id: \.offset) { i, hand in
                let flags = FingerCounter.flags(hand)
                Text("hand \(i + 1): \(flags.pattern)  count \(FingerCounter.count(hand))")
            }
            Text("total: \(FingerCounter.count(hands: hands))  letter: \(AlphabetClassifier.classify(hands.first)?.letter ?? "—")")
            #if DEBUG
            if let onInject {
                HStack(spacing: 4) {
                    ForEach(1...10, id: \.self) { n in
                        Button("\(n)") { onInject(n) }
                            .frame(width: 26, height: 26)
                            .background(.white.opacity(0.18), in: .rect(cornerRadius: 6))
                    }
                }
                .padding(.top, 4)
            }
            #endif
        }
        .font(.system(size: 12, design: .monospaced))
        .foregroundStyle(.white)
        .padding(10)
        .background(.black.opacity(0.6), in: .rect(cornerRadius: 12))
        .environment(\.layoutDirection, .leftToRight)
    }
}
