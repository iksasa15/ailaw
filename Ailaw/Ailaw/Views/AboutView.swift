import SwiftUI

struct AboutView: View {
    @Environment(AppSettings.self) private var settings
    @State private var words: [VocabWord] = []
    @State private var loadFailed = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("ℹ️ عن المشروع")
                    .font(AppTheme.brandFont(26, weight: .bold))

                Text("تطبيق يحاكي نظارة ذكية للصم والبكم: كاميرا ومايك الجوال كعدسة AR، تحويل الكلام إلى نص (Whisper)، ولغة الإشارة العربية إلى صوت (ArSL + TTS)، مع تنبيهات بصرية لأصوات الخطر (YAMNet).")
                    .font(AppTheme.brandFont(15))
                    .foregroundStyle(AppTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)

                sectionTitle("الاتجاهات")
                bullet("استقبال: كلام → نص على العدسة")
                bullet("إرسال: إشارة / أصابع → نطق مسموع")
                bullet("أمان: صفارة/إنذار → وميض + اهتزاز")

                sectionTitle("مفردات الديمو (10 كلمات)")
                if loadFailed {
                    Text("شغّل الـ Backend لعرض المفردات.")
                        .font(AppTheme.brandFont(13))
                        .foregroundStyle(AppTheme.muted)
                } else if words.isEmpty {
                    ProgressView().tint(AppTheme.accent)
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(words) { w in
                            Text(w.display)
                                .font(AppTheme.brandFont(14, weight: .medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(AppTheme.card)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                }

                sectionTitle("سيناريو فيديو الديمو")
                numbered("افتح التطبيق واسمح بالكاميرا والمايك.")
                numbered("شخص يتحدث → يظهر النص على الـ Overlay.")
                numbered("فعّل الإرسال وارفع الأصابع حسب العبارة → يُنطق الصوت.")
                numbered("شغّل صفارة تجريبية → وميض أحمر واهتزاز.")
            }
            .padding(20)
        }
        .ailawScreen()
        .task { await loadVocab() }
    }

    private func sectionTitle(_ t: String) -> some View {
        Text(t).font(AppTheme.brandFont(18, weight: .semibold))
    }

    private func bullet(_ t: String) -> some View {
        Text("• \(t)")
            .font(AppTheme.brandFont(14))
            .foregroundStyle(AppTheme.muted)
    }

    private func numbered(_ t: String) -> some View {
        Text(t)
            .font(AppTheme.brandFont(14))
            .foregroundStyle(AppTheme.muted)
    }

    private func loadVocab() async {
        do {
            let api = APIClient(settings: settings)
            let res = try await api.fetchVocab()
            words = res.words ?? []
            loadFailed = words.isEmpty
        } catch {
            loadFailed = true
        }
    }
}
