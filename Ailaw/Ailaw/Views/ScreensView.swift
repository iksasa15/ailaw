import SwiftUI
import UIKit

struct ScreensView: View {
    @Environment(AppSettings.self) private var settings
    @Environment(PairingCoordinator.self) private var pairing

    @State private var openRole: UserRole?
    @State private var apiDraft = ""
    @State private var healthOK: Bool?
    @State private var healthDetail: String?
    @State private var checking = false
    @State private var hostMode: UserRole?
    @State private var pasteText = ""
    @State private var showScanner = false
    @State private var copied = false
    @State private var joinError: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                stepsCard
                apiCard
                roleButtons
                if let hostMode {
                    inviteCard(for: hostMode)
                }
                joinCard
            }
            .padding(20)
            .padding(.bottom, 28)
        }
        .ailawScreen()
        .onAppear {
            apiDraft = settings.apiBase.isEmpty ? settings.resolvedApiBase : settings.apiBase
            if apiDraft.contains("localhost") {
                // Hint: phones can't reach Mac localhost
            }
            Task { await checkHealth() }
            if let role = pairing.consumePendingRole() {
                openRole = role
            }
        }
        .onChange(of: pairing.pendingRole) { _, role in
            if let role {
                openRole = pairing.consumePendingRole() ?? role
            }
        }
        .fullScreenCover(item: $openRole) { role in
            NavigationStack {
                HomeView(lockedRole: role)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("إغلاق") { openRole = nil }
                        }
                    }
            }
        }
        .fullScreenCover(isPresented: $showScanner) {
            QRScannerView(
                onCode: { code in
                    showScanner = false
                    applyJoin(code)
                },
                onCancel: { showScanner = false }
            )
            .ignoresSafeArea()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("النظارة الذكية · قضية")
                .font(AppTheme.brandFont(13, weight: .semibold))
                .foregroundStyle(AppTheme.accent)
            Text("ربط جوالين")
                .font(AppTheme.brandFont(26, weight: .bold))
            Text("جوال للمحامي وجوال للشخص — نفس الواي فاي ونفس الخادم.")
                .font(AppTheme.brandFont(14))
                .foregroundStyle(AppTheme.muted)
        }
    }

    private var stepsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("ثلاث خطوات")
                .font(AppTheme.brandFont(16, weight: .bold))
            stepRow(1, "شغّل الـ Backend على الماك والجوالان على نفس الواي فاي.")
            stepRow(2, "على جوال المحامي: افحص الاتصال ثم اضغط «أنا المحامي» وأرِ الـ QR للطرف الآخر.")
            stepRow(3, "على جوال الشخص: امسح الدعوة أو الصق الرابط — تُفتح شاشته تلقائياً.")
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func stepRow(_ n: Int, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)")
                .font(AppTheme.brandFont(13, weight: .bold))
                .foregroundStyle(AppTheme.accentInk)
                .frame(width: 22, height: 22)
                .background(AppTheme.accent)
                .clipShape(Circle())
            Text(text)
                .font(AppTheme.brandFont(13))
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var apiCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("عنوان الخادم (API)")
                .font(AppTheme.brandFont(13))
                .foregroundStyle(AppTheme.muted)
            TextField("http://192.168.x.x:8000", text: $apiDraft)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .padding(12)
                .background(AppTheme.background)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Button {
                Task { await saveAndCheck() }
            } label: {
                HStack {
                    if checking { ProgressView().tint(AppTheme.accentInk) }
                    Text(checking ? "جاري الفحص…" : "حفظ وفحص الاتصال")
                        .font(AppTheme.brandFont(15, weight: .bold))
                }
                .foregroundStyle(AppTheme.accentInk)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(checking)

            HStack(spacing: 8) {
                Circle()
                    .fill(healthOK == true ? AppTheme.accent : (healthOK == false ? AppTheme.danger : Color.gray))
                    .frame(width: 10, height: 10)
                Text(healthDetail ?? "لم يُفحص بعد")
                    .font(AppTheme.brandFont(13))
                    .foregroundStyle(AppTheme.muted)
            }

            if apiDraft.contains("localhost") || apiDraft.contains("127.0.0.1") {
                Text("تنبيه: على الجوال استخدم IP الماك (مثل 192.168.x.x) وليس localhost.")
                    .font(AppTheme.brandFont(12, weight: .medium))
                    .foregroundStyle(Color.orange)
            }
        }
        .padding(14)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var roleButtons: some View {
        VStack(spacing: 12) {
            Button {
                hostMode = .lawyer
                openRole = .lawyer
            } label: {
                screenCard(
                    emoji: "⚖️",
                    title: "أنا المحامي",
                    subtitle: "يفتح شاشة المحامي ويعرض QR لدعوة الشخص",
                    tint: AppTheme.lawyer
                )
            }
            .buttonStyle(.plain)

            Button {
                hostMode = .person
                openRole = .person
            } label: {
                screenCard(
                    emoji: "👤",
                    title: "أنا الشخص",
                    subtitle: "يفتح شاشة الشخص (يستقبل كلام المحامي كإشارة)",
                    tint: AppTheme.accent
                )
            }
            .buttonStyle(.plain)
        }
    }

    private func inviteCard(for host: UserRole) -> some View {
        let guest: UserRole = host == .lawyer ? .person : .lawyer
        let link = PairInvite.makeURL(apiBase: settings.resolvedApiBase, role: guest)?.absoluteString ?? ""

        return VStack(spacing: 14) {
            Text("دعوة الطرف الآخر (\(guest.label))")
                .font(AppTheme.brandFont(16, weight: .bold))
            if !link.isEmpty {
                QRCodeView(string: link, size: 200)
                Text(link)
                    .font(AppTheme.brandFont(11))
                    .foregroundStyle(AppTheme.muted)
                    .multilineTextAlignment(.center)
                    .textSelection(.enabled)

                Button {
                    UIPasteboard.general.string = link
                    copied = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
                } label: {
                    Text(copied ? "تم النسخ ✓" : "نسخ رابط الدعوة")
                        .font(AppTheme.brandFont(14, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.white.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var joinCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("الانضمام من جهاز آخر")
                .font(AppTheme.brandFont(16, weight: .bold))

            Button {
                showScanner = true
            } label: {
                Label("مسح رمز الدعوة QR", systemImage: "qrcode.viewfinder")
                    .font(AppTheme.brandFont(15, weight: .bold))
                    .foregroundStyle(AppTheme.accentInk)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)

            TextField("الصق رابط الدعوة أو عنوان API", text: $pasteText)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(12)
                .background(AppTheme.background)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Button {
                applyJoin(pasteText)
            } label: {
                Text("تطبيق والانضمام")
                    .font(AppTheme.brandFont(14, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.white.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)

            if let joinError {
                Text(joinError)
                    .font(AppTheme.brandFont(12))
                    .foregroundStyle(AppTheme.danger)
            }
        }
        .padding(14)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func screenCard(emoji: String, title: String, subtitle: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(emoji).font(.system(size: 34))
            Text(title).font(AppTheme.brandFont(20, weight: .bold))
            Text(subtitle)
                .font(AppTheme.brandFont(13))
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.15))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(tint.opacity(0.4), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func applyJoin(_ raw: String) {
        guard let invite = PairInvite.parseFlexible(raw) else {
            joinError = "رابط غير صالح. الصق دعوة ailaw:// أو عنوان http://IP:8000"
            return
        }
        joinError = nil
        pairing.apply(invite: invite.api, role: invite.role, settings: settings)
        apiDraft = invite.api
        hostMode = nil
        openRole = invite.role
        Task { await checkHealth() }
    }

    private func saveAndCheck() async {
        let cleaned = apiDraft.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        settings.apiBase = cleaned
        await checkHealth()
    }

    private func checkHealth() async {
        checking = true
        defer { checking = false }
        do {
            let h = try await APIClient(settings: settings).checkHealth()
            healthOK = h.status == "ok" || h.whisper != nil
            healthDetail = healthOK == true ? "متصل بالخادم ✓" : "استجابة غير متوقعة"
        } catch {
            healthOK = false
            healthDetail = "غير متصل — \(error.localizedDescription)"
        }
    }
}
