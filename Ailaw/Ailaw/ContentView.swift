import SwiftUI

struct ContentView: View {
    @Environment(AppSettings.self) private var settings
    @State private var tab: AppTab = .lens

    enum AppTab: Hashable {
        case lens, screens, guide, about, settings
    }

    var body: some View {
        Group {
            if settings.onboarded {
                TabView(selection: $tab) {
                    HomeView()
                        .tabItem { Label("العدسة", systemImage: "eyeglasses") }
                        .tag(AppTab.lens)

                    ScreensView()
                        .tabItem { Label("شاشتين", systemImage: "rectangle.split.2x1") }
                        .tag(AppTab.screens)

                    GuideView()
                        .tabItem { Label("تعليمات", systemImage: "book") }
                        .tag(AppTab.guide)

                    AboutView()
                        .tabItem { Label("عن المشروع", systemImage: "info.circle") }
                        .tag(AppTab.about)

                    SettingsView()
                        .tabItem { Label("إعدادات", systemImage: "gearshape") }
                        .tag(AppTab.settings)
                }
                .tint(AppTheme.accent)
            } else {
                OnboardingView()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
        .environment(AppSettings())
}
