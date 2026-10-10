import SwiftUI
import UIKit

/// «المحامون العرب» palette from the logo (blue, purple, orange), shared with the web platform.
enum Theme {
    static let accent = Color(hex: 0x136FB0) // logo blue: primary, the person
    static let accentSoft = Color(hex: 0x1C86C2)
    static let accent2 = Color(hex: 0xA22897) // logo purple: the lawyer
    static let danger = Color(hex: 0xDC2626)
    static let highlight = Color(hex: 0xF9BD29) // logo orange: highlights on dark
    static let locked = Color(hex: 0x3ECF8E)
    static let weak = Color(hex: 0xFBBF24)

    static let ink = Color(light: 0x0B1C24, dark: 0xE8F1F4)
    static let bg = Color(light: 0xE8F1F4, dark: 0x0B1C24)
    static let muted = Color(light: 0x4A6570, dark: 0x9DB4BD)
    static let surface = Color(light: 0xFFFFFF, lightOpacity: 0.78, dark: 0x152A33, darkOpacity: 0.85)

    /// Dark panel used over the camera in both modes.
    static let panel = Color(hex: 0x0B1C24)
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }

    init(light: UInt32, lightOpacity: Double = 1, dark: UInt32, darkOpacity: Double = 1) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: dark, opacity: darkOpacity))
                : UIColor(Color(hex: light, opacity: lightOpacity))
        })
    }
}

enum ThemeWeight {
    case light, regular, medium, bold, black

    var fontName: String {
        switch self {
        case .light: "thmanyahsans-Light"
        case .regular: "thmanyahsans-Regular"
        case .medium: "thmanyahsans-Medium"
        case .bold: "thmanyahsans-Bold"
        case .black: "thmanyahsans-Black"
        }
    }
}

extension EnvironmentValues {
    /// User font-size multiplier from Settings.
    @Entry var appFontScale: CGFloat = 1
}

private struct AppFontModifier: ViewModifier {
    @Environment(\.appFontScale) private var scale
    let size: CGFloat
    let weight: ThemeWeight

    func body(content: Content) -> some View {
        content.font(.custom(weight.fontName, fixedSize: size * scale))
    }
}

extension View {
    func appFont(_ size: CGFloat, _ weight: ThemeWeight = .regular) -> some View {
        modifier(AppFontModifier(size: size, weight: weight))
    }
}
