import AILawCore
import SwiftUI

/// Role chip with the hold-to-switch ring (web RoleBadge).
struct RoleChip: View {
    let role: Role
    let holdProgress: Double
    let pulse: Int
    var holdSeconds: Double = 3
    var onTap: (() -> Void)?

    var body: some View {
        Button { onTap?() } label: {
            HStack(spacing: 8) {
                ZStack {
                    HoldRing(progress: holdProgress, lineWidth: 3)
                    Image(systemName: role == .lawyer ? "briefcase.fill" : "person.fill")
                        .font(.system(size: 10, weight: .bold))
                }
                .frame(width: 24, height: 24)
                VStack(alignment: .leading, spacing: 0) {
                    Text(role.modeAnnouncement).appFont(14, .bold)
                    if holdProgress > 0.02 {
                        Text("تثبيت الدور… \(Int((holdProgress * holdSeconds).rounded(.up)))/\(Int(holdSeconds.rounded()))").appFont(10)
                    } else if onTap != nil {
                        Text("تبديل").appFont(10).opacity(0.8)
                    }
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .glassEffect(.regular.tint(role.color.opacity(0.6)).interactive(), in: .capsule)
        }
        .buttonStyle(.plain)
        .allowsHitTesting(onTap != nil)
        .symbolEffect(.bounce, value: pulse)
        .scaleEffect(1)
        .animation(.spring(duration: 0.3), value: pulse)
    }
}

/// The recognized sign, big and centered, with replay (web SignBadge).
struct ResultBadge: View {
    let result: SignResult
    let caption: String?
    let pulse: Int
    let onReplay: () -> Void
    @State private var pop = false

    var body: some View {
        VStack(spacing: 10) {
            if let caption {
                Text(caption).appFont(13, .bold).foregroundStyle(Theme.highlight)
            }
            Text(result.display)
                .appFont(30, .black)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .minimumScaleFactor(0.6)
            HStack(spacing: 12) {
                Capsule()
                    .fill(.white.opacity(0.2))
                    .frame(width: 110, height: 6)
                    .overlay(alignment: .leading) {
                        Capsule().fill(result.accepted ? Theme.locked : Theme.weak)
                            .frame(width: 110 * max(0.05, min(1, result.confidence)), height: 6)
                    }
                    .environment(\.layoutDirection, .leftToRight)
                Button(action: onReplay) {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 40, height: 40)
                        .glassEffect(.regular.tint(Theme.accent.opacity(0.6)).interactive(), in: .circle)
                }
                .accessibilityLabel("إعادة النطق")
            }
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 16)
        .frame(maxWidth: 330)
        .glassEffect(.regular.tint(Theme.panel.opacity(0.55)), in: .rect(cornerRadius: 26))
        .opacity(result.accepted ? 1 : 0.7)
        .scaleEffect(pop ? 1.08 : 1)
        .onChange(of: pulse) {
            withAnimation(.spring(duration: 0.18)) { pop = true }
            withAnimation(.spring(duration: 0.3).delay(0.18)) { pop = false }
        }
    }
}

/// Dashed frame shown while no hand is tracked (web HandGuide).
struct HandGuide: View {
    var body: some View {
        VStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 60)
                .strokeBorder(.white.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [8, 8]))
                .frame(width: 200, height: 240)
                .overlay {
                    Image(systemName: "hand.raised")
                        .font(.system(size: 56, weight: .light))
                        .foregroundStyle(.white.opacity(0.35))
                }
            Text("ضع راحة يدك هنا").appFont(15, .medium).foregroundStyle(.white.opacity(0.8))
        }
        .allowsHitTesting(false)
    }
}

/// Live speech caption (web CaptionBubble).
struct CaptionBubble: View {
    let text: String
    let partial: Bool
    let opacity: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("كلام المحامي").appFont(11, .bold).foregroundStyle(Theme.highlight)
            Text(text)
                .appFont(19, .medium)
                .foregroundStyle(.white.opacity(partial ? 0.75 : 1))
                .lineLimit(3)
                .truncationMode(.head)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(Theme.panel.opacity(min(0.95, opacity + 0.25)), in: .rect(cornerRadius: 20))
    }
}

/// On the lawyer phone: what the person signed (web "الشخص بالإشارة").
struct RemotePersonCard: View {
    let phrase: ScenePhrase

    var body: some View {
        VStack(spacing: 4) {
            Text("الشخص بالإشارة").appFont(12, .bold).foregroundStyle(Theme.highlight)
            Text(phrase.fingers.map { "\($0) أصابع · \(phrase.text)" } ?? phrase.text)
                .appFont(19, .bold)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Theme.panel.opacity(0.92), in: .rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.accent.opacity(0.5)))
    }
}

/// Full-screen danger flash (web AlertToast + alert-flash).
struct DangerOverlay: View {
    let alert: LensViewModel.SafetyAlert
    let onDismiss: () -> Void

    private var label: String {
        switch alert {
        case .sound(let danger): danger.label
        case .obstacle: "حاجز قريب — انتبه!"
        }
    }

    var body: some View {
        ZStack {
            Theme.danger
                .phaseAnimator([0.18, 0.5]) { content, phase in
                    content.opacity(phase)
                } animation: { _ in .easeInOut(duration: 0.35) }
            RoundedRectangle(cornerRadius: 44)
                .strokeBorder(Theme.danger, lineWidth: 8)
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 64, weight: .bold))
                    .symbolEffect(.pulse)
                Text("تنبيه خطر").appFont(34, .black)
                Text(label).appFont(22, .bold)
                Text("اضغط للإخفاء").appFont(14).opacity(0.85)
            }
            .foregroundStyle(.white)
            .padding(28)
            .background(Theme.danger.opacity(0.85), in: .rect(cornerRadius: 28))
        }
        .ignoresSafeArea()
        .contentShape(.rect)
        .onTapGesture(perform: onDismiss)
        .transition(.opacity)
    }
}
