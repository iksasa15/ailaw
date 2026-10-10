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
            Image("BrandLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 220)
                .accessibilityLabel("المحامون العرب")
                .padding(.bottom, 24)
            Text("منصة عدالة للصم والبكم").appFont(15, .bold).foregroundStyle(Theme.accent2)
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
        .frame(maxWidth: 520)
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
        .frame(maxWidth: 520)
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
