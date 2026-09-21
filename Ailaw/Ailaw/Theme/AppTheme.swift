import SwiftUI

enum AppTheme {
    static let background = Color("AppThemeBackground")
    static let accent = Color("AppAccent")
    static let lawyer = Color("LawyerBlue")
    static let danger = Color("DangerRed")
    static let text = Color(red: 0.957, green: 0.969, blue: 0.984)
    static let muted = Color(red: 0.718, green: 0.761, blue: 0.839)
    static let accentInk = Color(red: 0.024, green: 0.125, blue: 0.086)
    static let card = Color.white.opacity(0.05)
    static let cardBorder = Color.white.opacity(0.12)

    static func brandFont(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
}

struct ScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.background.ignoresSafeArea())
            .foregroundStyle(AppTheme.text)
            .environment(\.layoutDirection, .rightToLeft)
    }
}

extension View {
    func ailawScreen() -> some View {
        modifier(ScreenBackground())
    }
}
