import AILawCore
import SwiftUI

/// Two-phone session: pick a role, find the other phone nearby, enter the dedicated screen
/// (web ScreenPick.jsx, with QR/server rooms replaced by MultipeerConnectivity).
struct SessionView: View {
    @Environment(AppEngines.self) private var engines
    @Environment(AppSettings.self) private var settings
    @State private var presented: DedicatedRole?

    private struct DedicatedRole: Identifiable {
        let role: Role
        var id: String { role.rawValue }
    }

    private var peer: PeerSession { engines.peer }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "جلسة جوالين", subtitle: "المحامي والشخص على جوالين — بدون إنترنت")
                stepsCard
                rolePicker
                statusCard
                VStack(spacing: 10) {
                    Button {
                        if let role = peer.role { presented = DedicatedRole(role: role) }
                    } label: {
                        Label("ادخل شاشتي", systemImage: "eyeglasses")
                    }
                    .buttonStyle(.appPrimary)
                    .disabled(peer.role == nil)

                    Button {
                        peer.stop()
                    } label: {
                        Label("إنهاء الجلسة", systemImage: "xmark.circle")
                    }
                    .buttonStyle(.appDanger)
                    .disabled(peer.state == .idle)
                }
            }
            .readableWidth()
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(AppBackground())
        .task {
            #if DEBUG
            // Launch arguments for two-simulator checks: -uiSessionRole lawyer|person [-uiAutoEnter YES]
            let defaults = UserDefaults.standard
            if peer.state == .idle, let raw = defaults.string(forKey: "uiSessionRole"), let role = Role(rawValue: raw) {
                peer.start(as: role)
                if defaults.bool(forKey: "uiAutoEnter") { presented = DedicatedRole(role: role) }
            }
            #endif
        }
        .fullScreenCover(item: $presented) { item in
            LensScreen(mode: .dedicated(item.role), onClose: { presented = nil })
                .environment(engines)
                .environment(settings)
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "ar@numbers=latn"))
                .environment(\.appFontScale, settings.data.fontScale)
        }
    }

    private var stepsCard: some View {
        SectionCard(title: "ثلاث خطوات", systemImage: "list.number") {
            step(1, "افتح التطبيق على الجوالين")
            step(2, "اختر «أنا المحامي» على جوال و«أنا الشخص» على الآخر")
            step(3, "انتظر «متصل» ثم اضغط «ادخل شاشتي»")
        }
    }

    private func step(_ n: Int, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)")
                .appFont(13, .bold)
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(Theme.accent, in: .circle)
            Text(text).appFont(15).foregroundStyle(Theme.ink)
        }
    }

    private var rolePicker: some View {
        HStack(spacing: 12) {
            roleButton(.lawyer, title: "أنا المحامي", icon: "briefcase.fill", hint: "يتكلم ويسمع إشارات الشخص")
            roleButton(.person, title: "أنا الشخص", icon: "hand.raised.fill", hint: "يشير ويرى كلام المحامي بالإشارة")
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private func roleButton(_ role: Role, title: String, icon: String, hint: String) -> some View {
        let selected = peer.role == role
        return Button {
            peer.start(as: role)
        } label: {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(selected ? .white : role.color)
                    .frame(width: 60, height: 60)
                    .background(selected ? role.color : role.color.opacity(0.12), in: .circle)
                Text(title).appFont(17, .bold).foregroundStyle(Theme.ink)
                Text(hint).appFont(12).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(16)
            .background(Theme.surface, in: .rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(selected ? role.color : Theme.ink.opacity(0.06), lineWidth: selected ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    private var statusCard: some View {
        SectionCard {
            HStack(spacing: 12) {
                statusIcon
                VStack(alignment: .leading, spacing: 2) {
                    Text(statusTitle).appFont(16, .bold).foregroundStyle(Theme.ink)
                    if let role = peer.role {
                        Text("دور هذا الجوال: \(role.label)").appFont(13).foregroundStyle(Theme.muted)
                    }
                }
                Spacer()
            }
        }
    }

    @ViewBuilder private var statusIcon: some View {
        switch peer.state {
        case .searching:
            ProgressView().controlSize(.regular).tint(Theme.accent).frame(width: 36, height: 36)
        case .connected:
            Image(systemName: "checkmark.circle.fill").font(.system(size: 30)).foregroundStyle(Theme.accentSoft)
        case .disconnected:
            Image(systemName: "exclamationmark.circle.fill").font(.system(size: 30)).foregroundStyle(Theme.danger)
        case .idle:
            Image(systemName: "iphone.gen3.radiowaves.left.and.right").font(.system(size: 26)).foregroundStyle(Theme.muted)
        }
    }

    private var statusTitle: String {
        switch peer.state {
        case .idle: "اختر دوراً للبدء"
        case .searching: "يبحث عن الجوال الآخر…"
        case .connected(let name): "متصل بـ \(name)"
        case .disconnected: "انقطع الاتصال — يعيد المحاولة…"
        }
    }
}
