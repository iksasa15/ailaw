import SwiftUI

struct SyncBadge: View {
    enum State {
        case synced
        case waiting
        case offline
    }

    let state: State

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(AppTheme.brandFont(12, weight: .semibold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.black.opacity(0.45))
        .clipShape(Capsule())
    }

    private var label: String {
        switch state {
        case .synced: return "متزامن"
        case .waiting: return "بانتظار الطرف الآخر"
        case .offline: return "غير متصل بالخادم"
        }
    }

    private var color: Color {
        switch state {
        case .synced: return AppTheme.accent
        case .waiting: return Color.yellow
        case .offline: return AppTheme.danger
        }
    }
}
