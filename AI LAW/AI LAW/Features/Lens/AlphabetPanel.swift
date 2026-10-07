import AILawCore
import SwiftUI

/// Letters mode: current letter with its 3-second hold ring, written text, editing (web AlphabetWriteOverlay).
struct AlphabetPanel: View {
    @Bindable var model: LensViewModel
    @State private var pop = false

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                ZStack {
                    HoldRing(progress: model.alphabet.holdProgress, lineWidth: 5, color: Theme.locked)
                    Text(model.alphabet.current?.letter ?? "—")
                        .appFont(30, .black)
                        .foregroundStyle(.white)
                }
                .frame(width: 68, height: 68)
                .scaleEffect(pop ? 1.15 : 1)

                VStack(alignment: .leading, spacing: 4) {
                    Text("كتابة بالحروف").appFont(11, .bold).foregroundStyle(Theme.highlight)
                    Text(model.alphabet.text.isEmpty ? "ثبّت شكل الحرف 3 ثوانٍ…" : model.alphabet.text)
                        .appFont(model.alphabet.text.isEmpty ? 15 : 24, .bold)
                        .foregroundStyle(.white.opacity(model.alphabet.text.isEmpty ? 0.6 : 1))
                        .lineLimit(2)
                        .truncationMode(.head)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            HStack(spacing: 6) {
                small("حذف", "delete.left", model.alphabetBackspace)
                small("مسافة", "space", model.alphabetSpace)
                small("مسح", "trash", model.alphabetClear)
                Button {
                    model.sendAlphabet()
                } label: {
                    Label(model.alphabetSent ? "تم الإرسال ✓" : "إرسال", systemImage: "paperplane.fill")
                        .appFont(14, .bold)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .foregroundStyle(.white)
                        .background(model.alphabetSent ? Theme.locked : Theme.accent, in: .rect(cornerRadius: 14))
                }
                .buttonStyle(.plain)
                .disabled(model.alphabet.text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(14)
        .background(Theme.panel.opacity(0.9), in: .rect(cornerRadius: 22))
        .onChange(of: model.letterPulse) {
            withAnimation(.spring(duration: 0.15)) { pop = true }
            withAnimation(.spring(duration: 0.25).delay(0.15)) { pop = false }
        }
    }

    private func small(_ title: String, _ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .labelStyle(.iconOnly)
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 52, height: 40)
                .foregroundStyle(.white)
                .background(.white.opacity(0.14), in: .rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}
