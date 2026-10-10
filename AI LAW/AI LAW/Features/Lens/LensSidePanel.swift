import AILawCore
import SwiftUI

/// iPad landscape: everything that is read — the sign translator, the remote person's phrase,
/// the speech caption, letters mode and the live conversation — in a fixed column beside the
/// camera, so the camera itself stays clear.
struct LensSidePanel: View {
    @Bindable var model: LensViewModel
    @Environment(AppEngines.self) private var engines
    @Environment(AppSettings.self) private var settings

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.coachVisible {
                SignCoachView(clips: model.signClips, token: model.signToken)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
            if let remote = model.remotePerson, model.mode == .dedicated(.lawyer) {
                RemotePersonCard(phrase: remote)
            }
            caption
            if model.spellLetters && model.sendOn {
                AlphabetPanel(model: model)
                    .transition(.opacity)
            }
            conversation
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background { background }
        .animation(.easeInOut(duration: 0.25), value: model.coachVisible)
        .animation(.easeInOut(duration: 0.2), value: model.spellLetters)
    }

    @ViewBuilder private var caption: some View {
        if model.mode == .dedicated(.person) {
            if model.receiveOn, let phrase = model.lawyerPhrase {
                CaptionBubble(text: phrase.text, partial: false, opacity: settings.data.overlayOpacity)
            }
        } else if model.receiveOn && !engines.speech.text.isEmpty {
            CaptionBubble(text: engines.speech.text, partial: engines.speech.isPartial,
                          opacity: settings.data.overlayOpacity, onClear: model.clear)
        }
    }

    /// The conversation so far, newest at the bottom (the full log with sharing stays in the sheet).
    private var conversation: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "text.bubble.fill")
                Text("المحادثة")
                Spacer()
                if !model.log.entries.isEmpty {
                    Text("\(model.log.entries.count)").monospacedDigit().foregroundStyle(.white.opacity(0.6))
                }
            }
            .appFont(13, .bold)
            .foregroundStyle(Theme.highlight)

            if model.log.entries.isEmpty {
                Text("كل ما يقوله المحامي أو يشير به الشخص يظهر هنا.")
                    .appFont(14)
                    .foregroundStyle(.white.opacity(0.55))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        ForEach(model.log.entries) { entry in
                            HStack(alignment: .top, spacing: 8) {
                                RoleTag(role: entry.role, long: true)
                                Text(entry.text)
                                    .appFont(16, .medium)
                                    .foregroundStyle(.white)
                                    .fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 0)
                            }
                        }
                    }
                }
                .scrollIndicators(.hidden)
                .defaultScrollAnchor(.bottom)
                .defaultScrollAnchor(.bottom, for: .sizeChanges)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(.white.opacity(0.06), in: .rect(cornerRadius: 20))
    }

    private var background: some View {
        ZStack {
            Color(hex: 0x0B1630)
            LinearGradient(colors: [Theme.accent.opacity(0.22), .clear], startPoint: .top, endPoint: .center)
        }
        .overlay(alignment: .leading) {
            // Hairline against the camera.
            Rectangle().fill(.white.opacity(0.1)).frame(width: 1)
        }
        .ignoresSafeArea()
    }
}
