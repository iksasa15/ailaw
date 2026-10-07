import SwiftUI

struct PageHeader: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).appFont(30, .black).foregroundStyle(Theme.ink)
            if let subtitle {
                Text(subtitle).appFont(15).foregroundStyle(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }
}
