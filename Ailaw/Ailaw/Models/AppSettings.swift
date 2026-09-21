import Foundation
import SwiftUI

enum UserRole: String, Codable, CaseIterable, Identifiable {
    case lawyer
    case person

    var id: String { rawValue }

    var label: String {
        switch self {
        case .lawyer: return "محامي"
        case .person: return "شخص"
        }
    }

    var emoji: String {
        switch self {
        case .lawyer: return "⚖️"
        case .person: return "👤"
        }
    }
}

enum PhraseDefaults {
    static let lawyer: [Int: String] = [
        1: "أنا محاميك، تفضّل",
        2: "ما تفاصيل القضية؟",
        3: "متى حدث ذلك؟",
        4: "هل لديك شهود؟",
        5: "أين الدليل؟",
        6: "سأراجع أوراقك",
        7: "لا تخف، سأدافع عنك",
        8: "نحتاج مستندات إضافية",
        9: "وقّع التوكيل من فضلك",
        10: "القضية تحت المتابعة",
    ]

    static let person: [Int: String] = [
        1: "عندي قضية",
        2: "اتُهمت ظلماً",
        3: "حدث ذلك الأسبوع الماضي",
        4: "لدي شهود",
        5: "عندي دليل صورة",
        6: "أحتاج محامياً",
        7: "أنا خائف من النتيجة",
        8: "لم أفعل شيئاً خطأ",
        9: "ساعدني من فضلك",
        10: "شكراً لك",
    ]

    static func merge(_ custom: [Int: String], defaults: [Int: String]) -> [Int: String] {
        var out = defaults
        for i in 1...10 {
            if let raw = custom[i]?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty {
                out[i] = raw
            }
        }
        return out
    }

    static func phrases(for role: UserRole, lawyer: [Int: String], person: [Int: String]) -> [Int: String] {
        role == .lawyer
            ? merge(lawyer, defaults: Self.lawyer)
            : merge(person, defaults: Self.person)
    }
}

@Observable
final class AppSettings {
    private let defaults = UserDefaults.standard
    private let storageKey = "sg-settings"
    private let phrasePack = "case-story-v1"

    var apiBase: String = "" {
        didSet { persist() }
    }
    var language: String = "ar" {
        didSet { persist() }
    }
    var fontScale: Double = 1.0 {
        didSet { persist() }
    }
    var overlayOpacity: Double = 0.55 {
        didSet { persist() }
    }
    var confidence: Double = 0.38 {
        didSet { persist() }
    }
    var receiveEnabled: Bool = true {
        didSet { persist() }
    }
    var sendEnabled: Bool = true {
        didSet { persist() }
    }
    var safetyEnabled: Bool = true {
        didSet { persist() }
    }
    var onboarded: Bool = false {
        didSet { persist() }
    }
    var lawyerPhrases: [Int: String] = PhraseDefaults.lawyer {
        didSet { persist() }
    }
    var personPhrases: [Int: String] = PhraseDefaults.person {
        didSet { persist() }
    }

    var resolvedApiBase: String {
        let trimmed = apiBase.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if trimmed.isEmpty { return "http://localhost:8000" }
        return trimmed
    }

    init() {
        load()
    }

    func reset() {
        apiBase = ""
        language = "ar"
        fontScale = 1.0
        overlayOpacity = 0.55
        confidence = 0.38
        receiveEnabled = true
        sendEnabled = true
        safetyEnabled = true
        lawyerPhrases = PhraseDefaults.lawyer
        personPhrases = PhraseDefaults.person
        // keep onboarded
        persist()
    }

    private func load() {
        guard let data = defaults.data(forKey: storageKey),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            if let legacy = defaults.string(forKey: "apiBase"), !legacy.isEmpty {
                apiBase = legacy
            }
            return
        }

        apiBase = json["apiBase"] as? String ?? ""
        language = json["language"] as? String ?? "ar"
        fontScale = json["fontScale"] as? Double ?? 1.0
        overlayOpacity = json["overlayOpacity"] as? Double ?? 0.55
        confidence = json["confidence"] as? Double ?? 0.38
        receiveEnabled = json["receiveEnabled"] as? Bool ?? true
        sendEnabled = json["sendEnabled"] as? Bool ?? true
        safetyEnabled = json["safetyEnabled"] as? Bool ?? true
        onboarded = json["onboarded"] as? Bool ?? false

        let pack = json["phrasePack"] as? String
        if pack != phrasePack {
            lawyerPhrases = PhraseDefaults.lawyer
            personPhrases = PhraseDefaults.person
        } else {
            lawyerPhrases = Self.decodePhrases(json["lawyerPhrases"]) ?? PhraseDefaults.lawyer
            personPhrases = Self.decodePhrases(json["personPhrases"]) ?? PhraseDefaults.person
        }

        if apiBase.isEmpty, let legacy = defaults.string(forKey: "apiBase") {
            apiBase = legacy
        }
    }

    private func persist() {
        let payload: [String: Any] = [
            "apiBase": apiBase,
            "language": language,
            "fontScale": fontScale,
            "overlayOpacity": overlayOpacity,
            "confidence": confidence,
            "receiveEnabled": receiveEnabled,
            "sendEnabled": sendEnabled,
            "safetyEnabled": safetyEnabled,
            "onboarded": onboarded,
            "phrasePack": phrasePack,
            "lawyerPhrases": Self.encodePhrases(lawyerPhrases),
            "personPhrases": Self.encodePhrases(personPhrases),
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            defaults.set(data, forKey: storageKey)
        }
        if !apiBase.isEmpty {
            defaults.set(apiBase, forKey: "apiBase")
        }
    }

    private static func encodePhrases(_ map: [Int: String]) -> [String: String] {
        Dictionary(uniqueKeysWithValues: map.map { (String($0.key), $0.value) })
    }

    private static func decodePhrases(_ any: Any?) -> [Int: String]? {
        guard let dict = any as? [String: String] else { return nil }
        var out: [Int: String] = [:]
        for (k, v) in dict {
            if let i = Int(k) { out[i] = v }
        }
        return out.isEmpty ? nil : out
    }
}
