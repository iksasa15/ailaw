import AILawCore
import SwiftUI

struct MoreView: View {
    enum Page: String, Hashable {
        case guide, settings, readiness, about
    }

    // Launch argument `-uiMorePage guide|settings|readiness|about` (simulator smoke checks).
    @State private var path: [Page] = UserDefaults.standard.string(forKey: "uiMorePage").flatMap(Page.init).map { [$0] } ?? []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(spacing: 12) {
                    PageHeader(title: "المزيد", subtitle: "أدلة وإعدادات التطبيق")
                    row(.guide, "التعليمات", "كيف تستخدم العدسة والإشارات والأمان", "book.fill")
                    row(.settings, "الإعدادات", "العبارات، حجم النص، والحساسية", "gearshape.fill")
                    row(.readiness, "فحص الجاهزية", "تأكد أن كل شيء جاهز قبل العرض", "checklist.checked")
                    row(.about, "عن المشروع", "نظرة عامة ومفردات الديمو", "info.circle.fill")
                }
                .padding(16)
            }
            .background(AppBackground())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Page.self) { page in
                switch page {
                case .guide: GuideView()
                case .settings: SettingsView()
                case .readiness: ReadinessView()
                case .about: AboutView()
                }
            }
        }
    }

    private func row(_ page: Page, _ title: String, _ body: String, _ icon: String) -> some View {
        NavigationLink(value: page) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Theme.accent, in: .rect(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).appFont(18, .bold).foregroundStyle(Theme.ink)
                    Text(body).appFont(13).foregroundStyle(Theme.muted)
                }
                Spacer()
                Image(systemName: "chevron.forward").foregroundStyle(Theme.muted)
            }
            .padding(14)
            .background(Theme.surface, in: .rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ink.opacity(0.06)))
        }
        .buttonStyle(.plain)
    }
}

/// Shared scroll container for the pushed More screens.
struct MorePage<Content: View>: View {
    let title: String
    var subtitle: String?
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: title, subtitle: subtitle)
                content
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(AppBackground())
        .navigationBarTitleDisplayMode(.inline)
    }
}
