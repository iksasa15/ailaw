import AILawCore
import SwiftUI
import UIKit

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
                OnboardingView()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .environment(\.locale, Locale(identifier: "ar@numbers=latn"))
        .environment(\.appFontScale, settings.data.fontScale)
        .tint(Theme.accent)
        #if DEBUG
        .task {
            // Launch argument `-uiLandscape YES` (iPad simulator screenshots). iPadOS only honours it for
            // a full-screen-only build: xcodebuild … INFOPLIST_KEY_UIRequiresFullScreen=YES.
            if UserDefaults.standard.bool(forKey: "uiLandscape"),
               let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                try? await Task.sleep(for: .seconds(0.5))
                scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight)) { _ in }
            }
        }
        #endif
    }

    private var tabs: some View {
        TabView(selection: $tab) {
            Tab("عدسة", systemImage: "eyeglasses", value: AppTab.lens) {
                LensScreen(mode: .solo)
            }
            Tab("جلسة", systemImage: "iphone.gen3.radiowaves.left.and.right", value: AppTab.session) {
                SessionView()
            }
            Tab("معمل", systemImage: "flask", value: AppTab.lab) {
                LabScreen()
            }
            Tab("المزيد", systemImage: "ellipsis.circle", value: AppTab.more) {
                MoreView()
            }
        }
        // iPhone: bottom tab bar. iPad: top tab bar that can expand into a sidebar.
        .tabViewStyle(.sidebarAdaptable)
    }
}
