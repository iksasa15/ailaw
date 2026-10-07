import SwiftUI

/// Rounded surface card for the light screens.
struct SectionCard<Content: View>: View {
    var title: String?
    var systemImage: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                HStack(spacing: 8) {
                    if let systemImage {
                        Image(systemName: systemImage)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.accent)
                    }
                    Text(title).appFont(18, .bold).foregroundStyle(Theme.ink)
                }
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.surface, in: .rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ink.opacity(0.06)))
        .shadow(color: Theme.panel.opacity(0.06), radius: 16, y: 8)
    }
}

/// Soft brand gradient behind the light screens.
struct AppBackground: View {
    var body: some View {
        ZStack {
            Theme.bg
            RadialGradient(colors: [Theme.accent.opacity(0.18), .clear], center: .top, startRadius: 0, endRadius: 420)
            RadialGradient(colors: [Theme.accent2.opacity(0.10), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 360)
        }
        .ignoresSafeArea()
    }
}
