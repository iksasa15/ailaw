import Foundation

/// Finger-count phrases (1–10) for each role — traffic accident case.
/// Defaults are verbatim from web/src/hooks/useFingerPhrases.js.
public struct PhraseBook: Equatable, Sendable {
    public static let defaultLawyer: [Int: String] = [
        1: "السلام عليكم، أنا محاميك",
        2: "ماذا حدث بالضبط؟",
        3: "أين وقع الحادث؟",
        4: "هل لديك تقرير شرطة؟",
        5: "من كان يقود السيارة؟",
        6: "هل أصيب أحد؟",
        7: "سنطالب بالتعويض",
        8: "أحضر أوراق التأمين",
        9: "لا تتحدث مع الطرف الآخر",
        10: "سأتابع القضية غداً",
    ]

    public static let defaultPerson: [Int: String] = [
        1: "تعرضت لحادث سيارة",
        2: "اصطدم بي من الخلف",
        3: "الحادث عند الإشارة",
        4: "معي تقرير المرور",
        5: "أنا كنت أقود",
        6: "أصبت في رقبتي",
        7: "أريد تعويضاً عادلاً",
        8: "التأمين رفض الدفع",
        9: "الطرف الآخر يهددني",
        10: "أعتمد عليك",
    ]

    public var lawyer: [Int: String]
    public var person: [Int: String]

    public init(lawyer: [Int: String] = defaultLawyer, person: [Int: String] = defaultPerson) {
        self.lawyer = lawyer
        self.person = person
    }

    /// Port of `mergePhraseMap`: custom values are trimmed; empty ones fall back to the default.
    public static func merge(_ custom: [Int: String]?, defaults: [Int: String]) -> [Int: String] {
        var out = defaults
        guard let custom else { return out }
        for n in 1...10 {
            let trimmed = custom[n]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !trimmed.isEmpty { out[n] = trimmed }
        }
        return out
    }

    public func phrase(for role: Role, fingers: Int) -> String? {
        switch role {
        case .lawyer: lawyer[fingers]
        case .person: person[fingers]
        }
    }
}
