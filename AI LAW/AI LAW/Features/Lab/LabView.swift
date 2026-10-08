import AILawCore
import SwiftUI

struct LabScreen: View {
    @Environment(AppEngines.self) private var engines
    @State private var model: LabViewModel?

    var body: some View {
        Group {
            if let model {
                LabView(model: model)
            } else {
                AppBackground().onAppear { model = LabViewModel(engines: engines) }
            }
        }
    }
}

struct LabView: View {
    @Bindable var model: LabViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "المعمل", subtitle: "سيناريو قضية واقعي + مترجم إشارة")
                if sizeClass == .regular {
                    // iPad: the controls in one column, the long step list beside them.
                    HStack(alignment: .top, spacing: 16) {
                        VStack(spacing: 16) {
                            scenarioCard
                            translatorCard
                            manualCard
                        }
                        .frame(maxWidth: .infinity)
                        stepsCard.frame(maxWidth: .infinity)
                    }
                } else {
                    scenarioCard
                    translatorCard
                    stepsCard
                    manualCard
                }
            }
            .readableWidth(AppLayout.wide)
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(AppBackground())
        .onDisappear { model.onDisappear() }
    }

    // MARK: Scenario

    private var scenarioCard: some View {
        SectionCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(CaseScenario.title).appFont(18, .bold).foregroundStyle(Theme.ink)
                    Text(CaseScenario.subtitle).appFont(13).foregroundStyle(Theme.muted)
                }
                Spacer()
                Text(model.stepIndex < 0 ? "0/\(model.lines.count)" : "\(model.stepIndex + 1)/\(model.lines.count)")
                    .appFont(14, .bold)
                    .foregroundStyle(Theme.accent)
                    .monospacedDigit()
            }
            ProgressView(value: model.progress).tint(Theme.accent)

            currentLine

            HStack(spacing: 8) {
                Button(model.autoPlayTitle) { model.toggleAutoPlay() }
                    .buttonStyle(model.autoPlay ? .appDanger : .appPrimary)
                Button("التالي") { model.next() }
                    .buttonStyle(.appSecondary)
                    .disabled(model.isLastStep)
                Button("إعادة") { model.reset() }
                    .buttonStyle(.appSecondary)
                    .frame(maxWidth: 90)
            }
        }
    }

    private var stepsCard: some View {
        SectionCard(title: "خطوات الجلسة", systemImage: "list.number") {
            VStack(spacing: 6) {
                ForEach(Array(model.lines.enumerated()), id: \.offset) { i, line in
                    Button { model.tapLine(i) } label: { lineRow(i, line) }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder private var currentLine: some View {
        if let line = model.current {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    RoleTag(role: line.role, long: true)
                    Text("\(FingerEmoji.byCount[line.fingers] ?? "") · \(line.fingers) أصابع")
                        .appFont(13, .medium)
                        .foregroundStyle(Theme.muted)
                }
                Text(line.text).appFont(22, .bold).foregroundStyle(Theme.ink)
                Text(line.role == .person ? "ارفع \(line.fingers) أصابع — يُنطق للمحامي." : "يظهر للموكّل كمترجم إشارة أدناه.")
                    .appFont(13)
                    .foregroundStyle(Theme.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(line.role.color.opacity(0.1), in: .rect(cornerRadius: 16))
            .animation(.easeOut, value: model.stepIndex)
        } else {
            Text("اضغط «تشغيل السيناريو» لمشاهدة جلسة حادث مروري كاملة.")
                .appFont(14)
                .foregroundStyle(Theme.muted)
        }
    }

    private func lineRow(_ i: Int, _ line: ScenarioLine) -> some View {
        let active = i == model.stepIndex
        let done = i < model.stepIndex
        return HStack(spacing: 10) {
            Text("\(line.fingers)")
                .appFont(13, .bold)
                .monospacedDigit()
                .frame(width: 28, height: 28)
                .foregroundStyle(active ? .white : line.role.color)
                .background(active ? line.role.color : line.role.color.opacity(0.12), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(line.role.label).appFont(11, .bold).foregroundStyle(line.role.color)
                Text(line.text).appFont(15, active ? .bold : .regular).foregroundStyle(Theme.ink)
            }
            Spacer()
            if done {
                Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.accentSoft)
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(active ? line.role.color.opacity(0.08) : .clear, in: .rect(cornerRadius: 12))
        .contentShape(.rect)
    }

    // MARK: Translator

    private var translatorCard: some View {
        SectionCard(title: "مترجم الإشارة (للموكّل)", systemImage: "hand.wave.fill") {
            Toggle(isOn: $model.spellLetters) {
                Text("تهجئة بالحروف").appFont(15, .medium).foregroundStyle(Theme.ink)
            }
            .tint(Theme.accent)
            SignCoachView(clips: model.clips, token: model.clipsToken)
            if let person = model.personLine {
                Text("الشخص: \(person.fingers) أصابع · \(person.text)")
                    .appFont(15, .bold)
                    .foregroundStyle(Theme.accent)
            }
        }
    }

    // MARK: Manual lawyer test

    private var manualCard: some View {
        SectionCard(title: "اختبار يدوي للمحامي", systemImage: "mic.fill") {
            HStack(spacing: 10) {
                Button {
                    Task { await model.toggleListening() }
                } label: {
                    Label(model.listening ? "إيقاف" : "استمع", systemImage: model.listening ? "stop.fill" : "mic.fill")
                }
                .buttonStyle(model.listening ? .appDanger : .appPrimary)
                .frame(maxWidth: 150)
                Text(model.micStatus).appFont(13).foregroundStyle(Theme.muted)
                Spacer()
            }
            HStack(spacing: 8) {
                TextField("اكتب كلام المحامي…", text: $model.draft)
                    .appFont(16)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 48)
                    .background(Theme.bg, in: .rect(cornerRadius: 14))
                    .submitLabel(.send)
                    .onSubmit { model.push(model.draft) }
                Button("ترجم") { model.push(model.draft) }
                    .buttonStyle(.appPrimary)
                    .frame(maxWidth: 90)
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), spacing: 8) {
                ForEach(1...10, id: \.self) { n in
                    Button("\(n)") { model.push(PhraseBook.defaultLawyer[n] ?? "", fingers: n) }
                        .buttonStyle(.appSecondary)
                }
            }
        }
    }
}
