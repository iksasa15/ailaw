import SwiftUI

struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @State private var apiDraft = ""
    @State private var healthText: String?
    @State private var checking = false

    var body: some View {
        @Bindable var settings = settings
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("⚙️ الإعدادات")
                    .font(AppTheme.brandFont(26, weight: .bold))

                VStack(alignment: .leading, spacing: 10) {
                    Text("عنوان Backend")
                        .font(AppTheme.brandFont(13))
                        .foregroundStyle(AppTheme.muted)
                    TextField("http://192.168.x.x:8000", text: $apiDraft)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .padding(14)
                        .background(AppTheme.card)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(AppTheme.cardBorder, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    Button {
                        Task { await saveAndCheck() }
                    } label: {
                        HStack {
                            if checking { ProgressView().tint(AppTheme.accentInk) }
                            Text("حفظ وفحص /health")
                                .font(AppTheme.brandFont(16, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.accentInk)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(checking)

                    if let healthText {
                        Text(healthText)
                            .font(AppTheme.brandFont(13))
                            .foregroundStyle(AppTheme.muted)
                    }
                }

                phraseEditor(
                    title: "قائمة المحامي",
                    emoji: "⚖️",
                    phrases: Binding(
                        get: { settings.lawyerPhrases },
                        set: { settings.lawyerPhrases = $0 }
                    ),
                    onReset: { settings.lawyerPhrases = PhraseDefaults.lawyer }
                )

                phraseEditor(
                    title: "قائمة الشخص",
                    emoji: "👤",
                    phrases: Binding(
                        get: { settings.personPhrases },
                        set: { settings.personPhrases = $0 }
                    ),
                    onReset: { settings.personPhrases = PhraseDefaults.person }
                )

                sliderRow("حجم النص", value: $settings.fontScale, range: 0.8...1.6, step: 0.1)
                sliderRow("شفافية خلفية النص", value: $settings.overlayOpacity, range: 0.2...0.85, step: 0.05)
                sliderRow("عتبة ثقة الإشارة", value: $settings.confidence, range: 0.2...0.9, step: 0.05)

                Button {
                    settings.reset()
                    apiDraft = settings.resolvedApiBase
                    healthText = nil
                } label: {
                    Text("إعادة تعيين الإعدادات")
                        .font(AppTheme.brandFont(15, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding(20)
            .padding(.bottom, 30)
        }
        .ailawScreen()
        .onAppear {
            apiDraft = settings.apiBase.isEmpty ? settings.resolvedApiBase : settings.apiBase
        }
    }

    private func saveAndCheck() async {
        checking = true
        defer { checking = false }
        let cleaned = apiDraft.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        settings.apiBase = cleaned
        let api = APIClient(settings: settings)
        do {
            let h = try await api.checkHealth()
            let whisper = h.whisper == true ? "Whisper ✓" : "Whisper ✗"
            let arsl = h.arsl_engine ?? "?"
            let yam = h.yamnet == true ? "YAMNet ✓" : "YAMNet ✗"
            healthText = "الحالة: متصل ✓ — \(whisper) · \(arsl) · \(yam)"
        } catch {
            healthText = "الحالة: غير متصل — \(error.localizedDescription)"
        }
    }

    private func phraseEditor(
        title: String,
        emoji: String,
        phrases: Binding<[Int: String]>,
        onReset: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("\(emoji) \(title)")
                    .font(AppTheme.brandFont(17, weight: .bold))
                Spacer()
                Button("افتراضي", action: onReset)
                    .font(AppTheme.brandFont(12, weight: .semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Capsule())
            }
            Text("عدّل النص لكل رقم أصابع (1–10)")
                .font(AppTheme.brandFont(12))
                .foregroundStyle(AppTheme.muted)

            ForEach(1...10, id: \.self) { n in
                HStack(spacing: 8) {
                    Text("\(n)")
                        .font(AppTheme.brandFont(14, weight: .bold))
                        .foregroundStyle(AppTheme.accent)
                        .frame(width: 24)
                    TextField("عبارة رقم \(n)", text: Binding(
                        get: { phrases.wrappedValue[n] ?? "" },
                        set: { phrases.wrappedValue[n] = $0 }
                    ))
                    .padding(10)
                    .background(AppTheme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
        .padding(14)
        .background(AppTheme.card)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func sliderRow(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(title) (\(String(format: "%.2f", value.wrappedValue)))")
                .font(AppTheme.brandFont(13))
                .foregroundStyle(AppTheme.muted)
            Slider(value: value, in: range, step: step)
                .tint(AppTheme.accent)
        }
    }
}
