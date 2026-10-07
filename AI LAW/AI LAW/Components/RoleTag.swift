import AILawCore
import SwiftUI

/// Finger-count emoji used in the guide and the lab (web GestureArt.jsx).
enum FingerEmoji {
    static let byCount: [Int: String] = [
        1: "☝️", 2: "✌️", 3: "🤟", 4: "🖖", 5: "🖐️",
        6: "🖐️☝️", 7: "🖐️✌️", 8: "🖐️🤟", 9: "🖐️🖖", 10: "👐",
    ]
}

/// Small role capsule: lawyer in blue, person in teal.
struct RoleTag: View {
    let role: Role
    var long = false

    var body: some View {
        Text(long ? (role == .lawyer ? "المحامي" : "الشخص") : role.label)
            .appFont(12, .bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(role.color, in: .capsule)
    }
}

extension Role {
    var color: Color { self == .lawyer ? Theme.accent2 : Theme.accent }
}
