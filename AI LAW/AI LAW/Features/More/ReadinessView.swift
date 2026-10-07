import AILawCore
import SwiftUI

/// Pre-presentation checklist with how to fix each missing item.
struct ReadinessView: View {
    @Environment(AppEngines.self) private var engines

    private var checker: ReadinessChecker { engines.readiness }

    var body: some View {
        MorePage(title: "فحص الجاهزية", subtitle: "تأكد قبل العرض أن كل شيء جاهز") {
            SectionCard {
                HStack(spacing: 12) {
                    Image(systemName: checker.allOK ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(checker.allOK ? Theme.accentSoft : Theme.weak)
                    Text(checker.allOK ? "جاهز للعرض" : "\(checker.failingCount) بنود تحتاج إصلاح")
                        .appFont(20, .bold)
                        .foregroundStyle(Theme.ink)
                }
            }
            ForEach(checker.items) { item in
                SectionCard {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: item.ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(item.ok ? Theme.accent : Theme.danger)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title).appFont(16, .bold).foregroundStyle(Theme.ink)
                            if !item.ok {
                                Text(item.fix).appFont(13).foregroundStyle(Theme.muted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer()
                    }
                }
            }
            Button {
                refresh()
            } label: {
                Label("إعادة الفحص", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.appPrimary)
        }
        .onAppear(perform: refresh)
    }

    private func refresh() {
        checker.refresh(peer: engines.peer, speak: engines.speak)
    }
}
