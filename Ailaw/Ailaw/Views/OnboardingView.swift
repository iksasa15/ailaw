import SwiftUI

struct OnboardingView: View {
    @Environment(AppSettings.self) private var settings

    private let steps: [(title: String, body: String)] = [
        ("الصلاحيات", "يحتاج التطبيق إلى الكاميرا والمايكروفون لمحاكاة عدسة النظارة الذكية."),
        ("الاتجاهان + الأمان", "استقبال الكلام كنص، إرسال الإشارة كصوت، وتنبيه بصري عند أصوات الخطر."),
        ("جاهز للعدسة", "يمكنك تشغيل المسارات معاً من الشريط السفلي وضبط الخادم من الإعدادات."),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("النظارة الذكية")
                    .font(AppTheme.brandFont(14, weight: .semibold))
                    .foregroundStyle(AppTheme.accent)
                Text("مرحباً بك")
                    .font(AppTheme.brandFont(32, weight: .bold))

                VStack(spacing: 12) {
                    ForEach(steps, id: \.title) { step in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(step.title)
                                .font(AppTheme.brandFont(18, weight: .semibold))
                            Text(step.body)
                                .font(AppTheme.brandFont(15))
                                .foregroundStyle(AppTheme.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(AppTheme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
                .padding(.top, 24)
            }

            Spacer()

            Button {
                settings.onboarded = true
            } label: {
                Text("ابدأ الآن")
                    .font(AppTheme.brandFont(18, weight: .bold))
                    .foregroundStyle(AppTheme.accentInk)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(20)
        .ailawScreen()
    }
}
