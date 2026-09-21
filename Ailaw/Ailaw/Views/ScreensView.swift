import SwiftUI

struct ScreensView: View {
    @State private var openRole: UserRole?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Text("النظارة الذكية · قضية")
                        .font(AppTheme.brandFont(13, weight: .semibold))
                        .foregroundStyle(AppTheme.accent)
                    Text("اختر الشاشة")
                        .font(AppTheme.brandFont(26, weight: .bold))
                    Text("افتح كل شاشة على جوال مختلف — لكل واحد كاميرا خاصة به.")
                        .font(AppTheme.brandFont(14))
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 12)

                Button {
                    openRole = .lawyer
                } label: {
                    screenCard(
                        emoji: "⚖️",
                        title: "شاشة المحامي",
                        subtitle: "كاميرا هذا الجهاز · عبارات المحامي · صوت",
                        tint: AppTheme.lawyer
                    )
                }
                .buttonStyle(.plain)

                Button {
                    openRole = .person
                } label: {
                    screenCard(
                        emoji: "👤",
                        title: "شاشة الشخص",
                        subtitle: "كاميرا هذا الجهاز · عبارات الشخص · أفتار يترجم كلام المحامي لإشارة",
                        tint: AppTheme.accent
                    )
                }
                .buttonStyle(.plain)

                Text("العدسة المشتركة متاحة من تبويب العدسة (تبديل الأدوار على جهاز واحد)")
                    .font(AppTheme.brandFont(13))
                    .foregroundStyle(AppTheme.muted)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
            }
            .padding(20)
        }
        .ailawScreen()
        .fullScreenCover(item: $openRole) { role in
            NavigationStack {
                HomeView(lockedRole: role)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("إغلاق") { openRole = nil }
                        }
                    }
            }
        }
    }

    private func screenCard(emoji: String, title: String, subtitle: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(emoji).font(.system(size: 34))
            Text(title).font(AppTheme.brandFont(20, weight: .bold))
            Text(subtitle)
                .font(AppTheme.brandFont(13))
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.15))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(tint.opacity(0.4), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

extension UserRole: Hashable {}
