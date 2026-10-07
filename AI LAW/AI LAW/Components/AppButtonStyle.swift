import SwiftUI

struct AppButtonStyle: ButtonStyle {
    enum Kind {
        case primary, secondary, danger
    }

    var kind: Kind = .primary
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .appFont(16, .bold)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity, minHeight: 48)
            .padding(.horizontal, 14)
            .foregroundStyle(foreground)
            .background(background, in: .rect(cornerRadius: 16))
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }

    private var foreground: Color {
        switch kind {
        case .primary, .danger: .white
        case .secondary: Theme.accent
        }
    }

    private var background: Color {
        switch kind {
        case .primary: Theme.accent
        case .secondary: Theme.accent.opacity(0.12)
        case .danger: Theme.danger
        }
    }
}

extension ButtonStyle where Self == AppButtonStyle {
    static var appPrimary: AppButtonStyle { AppButtonStyle(kind: .primary) }
    static var appSecondary: AppButtonStyle { AppButtonStyle(kind: .secondary) }
    static var appDanger: AppButtonStyle { AppButtonStyle(kind: .danger) }
}
