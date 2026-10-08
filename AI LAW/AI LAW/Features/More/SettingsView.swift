import AILawCore
import SwiftUI

/// Phrase lists, text size, overlay, sensitivity, readiness, reset (web Settings.jsx without server/PWA).
struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @State private var confirmReset = false

    var body: some View {
        @Bindable var settings = settings
        MorePage(title: "الإعدادات", subtitle: "العبارات والعرض") {
            SectionCard(title: "التعرف على الإشارة", systemImage: "hand.raised.fill") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("سرعة التعرف").appFont(15, .medium).foregroundStyle(Theme.ink)
                    Picker("سرعة التعرف", selection: $settings.data.recognitionSpeed) {
                        ForEach(RecognitionSpeed.allCases, id: \.self) { speed in
                            Text(speed.label).tag(speed)
                        }
                    }
                    .pickerStyle(.segmented)
                    Text(speedHint(settings.data.recognitionSpeed))
                        .appFont(12)
                        .foregroundStyle(Theme.muted)
                }
                slider("حساسية التعرف", value: $settings.data.confidence, range: 0.2...0.8, step: 0.02,
                       format: { String(format: "%.2f", $0) })
                Toggle(isOn: $settings.data.arslEnabled) {
                    Text("تمييز كلمات ArSL (تجريبي)").appFont(15, .medium).foregroundStyle(Theme.ink)
                }
                .tint(Theme.accent)
            }

            phraseEditor("قائمة المحامي", phrases: $settings.data.lawyerPhrases, defaults: PhraseBook.defaultLawyer)
            phraseEditor("قائمة الشخص", phrases: $settings.data.personPhrases, defaults: PhraseBook.defaultPerson)

            SectionCard(title: "العرض", systemImage: "textformat.size") {
                slider("حجم الخط", value: $settings.data.fontScale, range: 0.85...1.4, step: 0.05,
                       format: { "\(Int(($0 * 100).rounded()))%" })
                slider("شفافية العدسة", value: $settings.data.overlayOpacity, range: 0.3...0.9, step: 0.05,
                       format: { "\(Int(($0 * 100).rounded()))%" })
            }

            NavigationLink {
                ReadinessView()
            } label: {
                Label("فحص الجاهزية", systemImage: "checklist.checked")
            }
            .buttonStyle(.appSecondary)

            Button("إعادة الضبط") { confirmReset = true }
                .buttonStyle(.appDanger)
                .confirmationDialog("إعادة كل الإعدادات والعبارات إلى الوضع الافتراضي؟", isPresented: $confirmReset,
                                    titleVisibility: .visible) {
                    Button("إعادة الضبط", role: .destructive) { settings.resetAll() }
                    Button("إلغاء", role: .cancel) {}
                }
        }
    }

    private func speedHint(_ speed: RecognitionSpeed) -> String {
        let t = RecognitionTuning.preset(speed)
        let accept = String(format: "%.1f", t.acceptLocked)
        let letter = String(format: "%.1f", t.letterHold)
        let role = String(format: "%.1f", t.roleHold)
        return "قبول العبارة بعد \(accept) ث · الحرف بعد \(letter) ث · تبديل الدور بعد \(role) ث"
    }

    private func phraseEditor(_ title: String, phrases: Binding<[Int: String]>, defaults: [Int: String]) -> some View {
        SectionCard {
            HStack {
                Text(title).appFont(18, .bold).foregroundStyle(Theme.ink)
                Spacer()
                Button("استرجاع الافتراضي") { phrases.wrappedValue = defaults }
                    .appFont(13, .bold)
                    .tint(Theme.accent)
            }
            ForEach(1...10, id: \.self) { n in
                HStack(spacing: 10) {
                    Text("\(n)")
                        .appFont(13, .bold)
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(Theme.accent, in: .circle)
                    TextField(defaults[n] ?? "", text: Binding(
                        get: { phrases.wrappedValue[n] ?? "" },
                        set: { phrases.wrappedValue[n] = $0 }
                    ))
                    .appFont(15)
                    .padding(.horizontal, 10)
                    .frame(minHeight: 40)
                    .background(Theme.bg, in: .rect(cornerRadius: 12))
                    .onSubmit { restoreIfEmpty(phrases, n, defaults) }
                }
            }
        }
    }

    /// An emptied field falls back to the default phrase (web mergePhraseMap).
    private func restoreIfEmpty(_ phrases: Binding<[Int: String]>, _ n: Int, _ defaults: [Int: String]) {
        if (phrases.wrappedValue[n] ?? "").trimmingCharacters(in: .whitespaces).isEmpty {
            phrases.wrappedValue[n] = defaults[n]
        }
    }

    private func slider(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double,
                        format: @escaping (Double) -> String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title).appFont(15, .medium).foregroundStyle(Theme.ink)
                Spacer()
                Text(format(value.wrappedValue)).appFont(14, .bold).foregroundStyle(Theme.accent).monospacedDigit()
            }
            Slider(value: value, in: range, step: step).tint(Theme.accent)
        }
    }
}
