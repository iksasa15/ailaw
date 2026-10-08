import AILawCore
import SwiftUI

/// «سجل المحادثة»: every phrase said or signed on this screen, shareable as text.
struct ConversationLogSheet: View {
    let log: ConversationLog
    let onClear: () -> Void
    @Environment(\.dismiss) private var dismiss

    private static let time: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm:ss"
        return f
    }()

    var body: some View {
        NavigationStack {
            Group {
                if log.entries.isEmpty {
                    ContentUnavailableView {
                        Label {
                            Text("لا توجد عبارات بعد").appFont(18, .bold)
                        } icon: {
                            Image(systemName: "text.bubble")
                        }
                    } description: {
                        Text("كل ما يقوله المحامي أو يشير به الشخص يظهر هنا.").appFont(14)
                    }
                } else {
                    ScrollViewReader { proxy in
                        List(log.entries) { entry in
                            row(entry).id(entry.id)
                        }
                        .listStyle(.plain)
                        .onAppear { proxy.scrollTo(log.entries.last?.id, anchor: .bottom) }
                    }
                }
            }
            .navigationTitle("سجل المحادثة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
                ToolbarItemGroup(placement: .primaryAction) {
                    if !log.entries.isEmpty {
                        ShareLink(item: log.exportText(), subject: Text("سجل المحادثة")) {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .accessibilityLabel("مشاركة السجل")
                        Button(role: .destructive) {
                            onClear()
                        } label: {
                            Image(systemName: "trash")
                        }
                        .accessibilityLabel("مسح السجل")
                    }
                }
            }
        }
    }

    private func row(_ entry: ConversationEntry) -> some View {
        HStack(alignment: .top, spacing: 10) {
            RoleTag(role: entry.role, long: true)
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.text).appFont(17, .medium).foregroundStyle(Theme.ink)
                Text(Self.time.string(from: Date(timeIntervalSince1970: Double(entry.at) / 1000)))
                    .appFont(11)
                    .foregroundStyle(Theme.muted)
                    .monospacedDigit()
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }
}

/// «اكتب وانطق»: the person types (or taps a ready reply); the phone speaks it, or sends it
/// to the lawyer phone in a session.
struct TypeToSpeakSheet: View {
    let phrases: [Int: String]
    let onSend: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @FocusState private var focused: Bool

    private let quickReplies = ["نعم", "لا", "شكراً", "لم أفهم، أعد من فضلك", "انتظر لحظة من فضلك", "أحتاج مساعدة"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 8) {
                        TextField("اكتب ما تريد قوله…", text: $text, axis: .vertical)
                            .appFont(18)
                            .lineLimit(1...4)
                            .focused($focused)
                            .padding(12)
                            .background(Theme.bg, in: .rect(cornerRadius: 16))
                            .submitLabel(.send)
                            .onSubmit(send)
                        Button(action: send) {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 50, height: 50)
                                .background(Theme.accent, in: .circle)
                        }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityLabel("إرسال")
                    }

                    section("ردود سريعة", quickReplies)
                    section("عبارات القضية", (1...10).compactMap { phrases[$0] })
                }
                .padding(16)
            }
            .background(AppBackground())
            .navigationTitle("اكتب وانطق")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .onAppear { focused = true }
        }
    }

    private func section(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).appFont(14, .bold).foregroundStyle(Theme.muted)
            FlowLayout(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    Button {
                        onSend(item)
                        dismiss()
                    } label: {
                        Text(item)
                            .appFont(15, .medium)
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(Theme.accent.opacity(0.12), in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func send() {
        let message = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        onSend(message)
        text = ""
        dismiss()
    }
}

/// Wraps chips onto as many lines as needed (respects RTL through the layout direction).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            maxX = max(maxX, x - spacing)
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: min(maxX, width), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
