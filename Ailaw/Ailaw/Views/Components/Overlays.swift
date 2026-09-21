import AVFoundation
import SwiftUI

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.videoPreviewLayer.session = session
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var videoPreviewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}

struct CaptionBubble: View {
    let text: String
    let opacity: Double
    let fontScale: Double

    var body: some View {
        if !text.isEmpty {
            Text(text)
                .font(AppTheme.brandFont(18 * fontScale, weight: .semibold))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: 340)
                .background(Color.black.opacity(opacity))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .foregroundStyle(AppTheme.text)
        }
    }
}

struct SignBadge: View {
    let text: String
    let role: UserRole

    var body: some View {
        VStack(spacing: 6) {
            Text(role.emoji + " " + role.label)
                .font(AppTheme.brandFont(13, weight: .semibold))
                .foregroundStyle(role == .lawyer ? AppTheme.lawyer : AppTheme.accent)
            Text(text)
                .font(AppTheme.brandFont(22, weight: .bold))
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct TrackingBadge: View {
    let quality: TrackingQuality
    let fingers: Int

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(quality.label)
                .font(AppTheme.brandFont(13, weight: .semibold))
            if fingers > 0 {
                Text("· \(fingers)")
                    .font(AppTheme.brandFont(13, weight: .bold))
                    .foregroundStyle(AppTheme.accent)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.45))
        .clipShape(Capsule())
    }

    private var color: Color {
        switch quality {
        case .lost: return .orange
        case .weak: return .yellow
        case .locked: return AppTheme.accent
        }
    }
}

struct RoleBadge: View {
    let role: UserRole
    let holdProgress: Double
    let canToggle: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 10) {
                Text("\(role.emoji) وضع \(role.label)")
                    .font(AppTheme.brandFont(14, weight: .bold))
                if canToggle {
                    Button("تبديل", action: onToggle)
                        .font(AppTheme.brandFont(12, weight: .semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            if holdProgress > 0 && holdProgress < 1 {
                ProgressView(value: holdProgress)
                    .tint(AppTheme.accent)
                    .frame(width: 140)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.45))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct AlertToast: View {
    let title: String
    let kind: Kind
    let onDismiss: () -> Void

    enum Kind { case danger, obstacle }

    var body: some View {
        ZStack {
            (kind == .danger ? AppTheme.danger : Color.orange)
                .opacity(0.55)
                .ignoresSafeArea()
            VStack(spacing: 12) {
                Text(kind == .danger ? "🚨" : "⚠️")
                    .font(.system(size: 44))
                Text(title)
                    .font(AppTheme.brandFont(22, weight: .bold))
                    .multilineTextAlignment(.center)
                Text("اضغط للإخفاء")
                    .font(AppTheme.brandFont(13))
                    .foregroundStyle(AppTheme.muted)
            }
            .padding(24)
        }
        .onTapGesture(perform: onDismiss)
    }
}

struct SignCoachAvatar: View {
    let text: String?

    private var gestures: [String] {
        guard let text, !text.isEmpty else { return ["👋"] }
        // Approximate emoji sequence for coaching
        let map: [Character: String] = [
            "ا": "👆", "أ": "👆", "إ": "👆", "آ": "👆",
            "ب": "✊", "ت": "✋", "ث": "🖐",
            "ج": "🤙", "ح": "🤚", "خ": "🖖",
            "د": "👉", "ذ": "👈", "ر": "🤞", "ز": "🤟",
            "س": "🤏", "ش": "👌", "ص": "👊", "ض": "💪",
            "ط": "🤘", "ظ": "✌️", "ع": "☝️", "غ": "👐",
            "ف": "🤲", "ق": "👏", "ك": "🫵", "ل": "👍",
            "م": "👎", "ن": "🖖", "ه": "👋", "و": "🤙", "ي": "👉",
        ]
        var out: [String] = []
        for ch in text.prefix(8) {
            if let g = map[ch] { out.append(g) }
        }
        return out.isEmpty ? ["👋"] : out
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(Array(gestures.enumerated()), id: \.offset) { _, g in
                    Text(g).font(.system(size: 28))
                }
            }
            if let text, !text.isEmpty {
                Text(text)
                    .font(AppTheme.brandFont(12, weight: .medium))
                    .foregroundStyle(AppTheme.muted)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            } else {
                Text("بانتظار إشارة المحامي")
                    .font(AppTheme.brandFont(12))
                    .foregroundStyle(AppTheme.muted)
            }
        }
        .padding(12)
        .frame(maxWidth: 280)
        .background(Color.black.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct LensBottomBar: View {
    @Binding var receiveOn: Bool
    @Binding var sendOn: Bool
    @Binding var safetyOn: Bool
    let onClear: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            toggle("استقبال", isOn: $receiveOn, active: AppTheme.accent)
            toggle("إرسال", isOn: $sendOn, active: AppTheme.lawyer)
            toggle("أمان", isOn: $safetyOn, active: AppTheme.danger)
            Button(action: onClear) {
                Text("مسح")
                    .font(AppTheme.brandFont(13, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    private func toggle(_ title: String, isOn: Binding<Bool>, active: Color) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            Text(title)
                .font(AppTheme.brandFont(13, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isOn.wrappedValue ? active.opacity(0.85) : Color.white.opacity(0.1))
                .foregroundStyle(isOn.wrappedValue ? AppTheme.accentInk : AppTheme.text)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
