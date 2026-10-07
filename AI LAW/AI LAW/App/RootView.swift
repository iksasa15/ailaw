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
                OnboardingView()
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
    }
}
