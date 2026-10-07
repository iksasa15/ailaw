import AILawCore
import AVFoundation
import SwiftUI

/// First launch: brand, one-line promise, then each permission explained and requested in turn.
struct OnboardingView: View {
    @Environment(AppSettings.self) private var settings
    @Environment(AppEngines.self) private var engines
    @State private var step: Int?

    private struct PermissionStep {
        let icon: String
        let title: String
        let body: String
    }

    private let steps = [
        PermissionStep(icon: "camera.fill", title: "الكاميرا",
                       body: "تلتقط إشارات يدك وعدد أصابعك، وتنبّهك للحواجز القريبة."),
        PermissionStep(icon: "mic.fill", title: "المايك",
                       body: "يحوّل كلام المحامي إلى نص وإشارات، ويرصد أصوات الخطر مثل الصفارات."),
        PermissionStep(icon: "waveform", title: "التعرف على الكلام",
                       body: "يتم على جهازك بالكامل — لا يُرسل أي صوت إلى الإنترنت."),
        PermissionStep(icon: "iphone.gen3.radiowaves.left.and.right", title: "الشبكة المحلية",
                       body: "لربط جوال المحامي بجوال الشخص مباشرة في جلسة الجوالين."),
    ]

    var body: some View {
        ZStack {
            AppBackground()
            if let step {
                permissionCard(step)
                    .id(step)
                    .transition(.asymmetric(insertion: .move(edge: .leading).combined(with: .opacity),
                                            removal: .move(edge: .trailing).combined(with: .opacity)))
            } else {
                welcome.transition(.opacity)
            }
        }
        .animation(.spring(duration: 0.4), value: step)
    }

    private var welcome: some View {
        VStack(spacing: 0) {
            Spacer()
            LogoMark()
                .frame(width: 96, height: 96)
                .background(.white.opacity(0.85), in: .rect(cornerRadius: 28))
                .shadow(color: Theme.accent.opacity(0.2), radius: 24, y: 12)
                .padding(.bottom, 28)
            Text("عدسة مساعدة للصم").appFont(14, .bold).foregroundStyle(Theme.accent)
            Text("النظارة الذكية").appFont(44, .black).foregroundStyle(Theme.ink).padding(.top, 6)
            Text("كلام المحامي يصبح إشارة مرئية — وإشارتك تُسمَع صوتاً واضحاً.")
                .appFont(17)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 300)
                .padding(.top, 14)
            Spacer()
            Button("ابدأ الآن") { step = 0 }
                .buttonStyle(.appPrimary)
            Text("كل المعالجة على جهازك — بدون إنترنت")
                .appFont(12)
                .foregroundStyle(Theme.muted)
                .padding(.top, 12)
        }
        .padding(24)
    }

    private func permissionCard(_ index: Int) -> some View {
        let item = steps[index]
        return VStack(spacing: 18) {
            Spacer()
            Text("\(index + 1) / \(steps.count)").appFont(13, .bold).foregroundStyle(Theme.accent).monospacedDigit()
            Image(systemName: item.icon)
                .font(.system(size: 40, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 96, height: 96)
                .background(Theme.accent, in: .circle)
            Text(item.title).appFont(28, .black).foregroundStyle(Theme.ink)
            Text(item.body)
                .appFont(17)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)
            Spacer()
            Button("سماح") { Task { await request(index) } }
                .buttonStyle(.appPrimary)
            Button("تخطي") { advance(from: index) }
                .buttonStyle(.appSecondary)
        }
        .padding(24)
    }

    private func request(_ index: Int) async {
        switch index {
        case 0:
            _ = await AVCaptureDevice.requestAccess(for: .video)
        case 1:
            _ = await AVAudioApplication.requestRecordPermission()
        case 2:
            _ = await SpeechEngine.requestAuthorization()
        default:
            // Briefly advertise/browse so iOS shows the local-network prompt now, not mid-demo.
            engines.peer.start(as: .person)
            try? await Task.sleep(for: .seconds(2))
            engines.peer.stop()
        }
        advance(from: index)
    }

    private func advance(from index: Int) {
        if index + 1 < steps.count {
            step = index + 1
        } else {
            settings.data.onboarded = true
        }
    }
}

/// Two lenses joined by a bridge — the web logo.
struct LogoMark: View {
    var body: some View {
        Canvas { context, size in
            let r = size.width * 0.15
            let y = size.height / 2
            let left = CGPoint(x: size.width * 0.28, y: y)
            let right = CGPoint(x: size.width * 0.72, y: y)
            let line = StrokeStyle(lineWidth: size.width * 0.04)
            context.stroke(Path(ellipseIn: CGRect(x: left.x - r, y: y - r, width: r * 2, height: r * 2)),
                           with: .color(Theme.accent2), style: line)
            context.stroke(Path(ellipseIn: CGRect(x: right.x - r, y: y - r, width: r * 2, height: r * 2)),
                           with: .color(Theme.accent), style: line)
            var bridge = Path()
            bridge.move(to: CGPoint(x: left.x + r + 2, y: y))
            bridge.addLine(to: CGPoint(x: right.x - r - 2, y: y))
            context.stroke(bridge, with: .color(Theme.ink), style: StrokeStyle(lineWidth: size.width * 0.035, lineCap: .round))
        }
        .environment(\.layoutDirection, .leftToRight)
    }
}
