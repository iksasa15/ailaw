import AILawCore
import SwiftUI

enum AppTab: String, Hashable {
    case lens, session, lab, more
}

struct RootView: View {
    @Environment(AppSettings.self) private var settings
    // Launch argument `-uiTab lens|session|lab|more` (simulator smoke checks).
    @State private var tab = AppTab(rawValue: UserDefaults.standard.string(forKey: "uiTab") ?? "") ?? .lens

    var body: some View {
        Group {
            if settings.data.onboarded {
                tabs
            } else {
                OnboardingPlaceholder()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .environment(\.locale, Locale(identifier: "ar@numbers=latn"))
        .environment(\.appFontScale, settings.data.fontScale)
        .tint(Theme.accent)
    }

    private var tabs: some View {
        TabView(selection: $tab) {
            Tab("عدسة", systemImage: "eyeglasses", value: AppTab.lens) {
                CameraCheckScreen()
            }
            Tab("جلسة", systemImage: "iphone.gen3.radiowaves.left.and.right", value: AppTab.session) {
                PlaceholderScreen(title: "جلسة")
            }
            Tab("معمل", systemImage: "flask", value: AppTab.lab) {
                LabScreen()
            }
            Tab("المزيد", systemImage: "ellipsis.circle", value: AppTab.more) {
                PlaceholderScreen(title: "المزيد")
            }
        }
    }
}

private struct PlaceholderScreen: View {
    let title: String

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            Text(title)
                .appFont(34, .bold)
                .foregroundStyle(Theme.ink)
        }
    }
}

private struct OnboardingPlaceholder: View {
    @Environment(AppSettings.self) private var settings

    var body: some View {
        VStack(spacing: 20) {
            Text("النظارة الذكية").appFont(40, .bold)
            Button("ابدأ الآن") { settings.data.onboarded = true }
                .appFont(18, .bold)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg)
    }
}

/// Temporary Lens tab (Task 11): camera + skeleton + debug numbers. Replaced by LensView.
private struct CameraCheckScreen: View {
    @Environment(AppEngines.self) private var engines

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let card = PermissionCard.camera(engines.camera.status, retry: { Task { await engines.camera.start() } }) {
                card
            } else {
                CameraPreview(session: engines.camera.session).ignoresSafeArea()
                HandSkeletonView(hands: engines.hands.hands, quality: engines.hands.quality, bufferSize: engines.camera.bufferSize)
                    .ignoresSafeArea()
                VStack {
                    DebugHUD(hands: engines.hands.hands, quality: engines.hands.quality, fps: engines.hands.fps)
                    Spacer()
                }
                .padding()
            }
        }
        .task {
            await engines.camera.start()
            engines.hands.attach(to: engines.camera)
        }
        .onDisappear {
            engines.hands.detach()
            engines.camera.stop()
        }
    }
}
