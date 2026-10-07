import AILawCore
import SwiftUI

/// Bottom glass dock of Lens toggles (web BottomBar).
struct LensControlsBar: View {
    @Bindable var model: LensViewModel
    @Environment(AppEngines.self) private var engines

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Circle()
                    .fill(engines.speech.status == .listening ? Theme.locked : .white.opacity(0.4))
                    .frame(width: 7, height: 7)
                Text(model.speechStatusText).appFont(12, .medium)
            }
            .foregroundStyle(.white.opacity(0.9))

            GlassEffectContainer(spacing: 6) {
                HStack(spacing: 4) {
                    toggle("استقبال", "ear", model.receiveOn, model.toggleReceive)
                    if !model.isDedicated {
                        toggle("إرسال", "hand.raised", model.sendOn, model.toggleSend)
                    }
                    toggle("أمان", "exclamationmark.shield", model.safetyOn, model.toggleSafety)
                    toggle("حروف", "character.textbox", model.spellLetters, model.toggleLetters)
                    toggle("ترجمة", "person.wave.2", model.translateVisible, model.toggleTranslate)
                    toggle(engines.camera.facing == .front ? "أمامية" : "خلفية",
                           "arrow.triangle.2.circlepath.camera", engines.camera.facing == .back, model.flipCamera)
                    toggle("مسح", "eraser", false, model.clear)
                }
                .padding(6)
                .glassEffect(.regular.tint(Theme.panel.opacity(0.4)), in: .rect(cornerRadius: 26))
            }
        }
    }

    private func toggle(_ title: String, _ icon: String, _ on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: icon).font(.system(size: 17, weight: .semibold))
                Text(title).appFont(10, .bold).lineLimit(1).minimumScaleFactor(0.8)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(on ? Theme.accent : .clear, in: .rect(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}
