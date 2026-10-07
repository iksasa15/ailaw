import Foundation

/// Persisted app settings (port of web SettingsContext defaults + phrase-pack migration).
public struct SettingsData: Codable, Equatable, Sendable {
    public static let currentPhrasePack = "accident-case-v1"

    public var fontScale = 1.0
    public var overlayOpacity = 0.55
    public var confidence = 0.38
    public var receiveEnabled = true
    public var sendEnabled = true
    public var safetyEnabled = true
    public var arslEnabled = false
    public var onboarded = false
    public var phrasePack = SettingsData.currentPhrasePack
    public var lawyerPhrases = PhraseBook.defaultLawyer
    public var personPhrases = PhraseBook.defaultPerson

    public init() {}

    private enum CodingKeys: String, CodingKey {
        case fontScale, overlayOpacity, confidence, receiveEnabled, sendEnabled, safetyEnabled
        case arslEnabled, onboarded, phrasePack, lawyerPhrases, personPhrases
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = SettingsData()
        fontScale = try c.decodeIfPresent(Double.self, forKey: .fontScale) ?? d.fontScale
        overlayOpacity = try c.decodeIfPresent(Double.self, forKey: .overlayOpacity) ?? d.overlayOpacity
        confidence = try c.decodeIfPresent(Double.self, forKey: .confidence) ?? d.confidence
        receiveEnabled = try c.decodeIfPresent(Bool.self, forKey: .receiveEnabled) ?? d.receiveEnabled
        sendEnabled = try c.decodeIfPresent(Bool.self, forKey: .sendEnabled) ?? d.sendEnabled
        safetyEnabled = try c.decodeIfPresent(Bool.self, forKey: .safetyEnabled) ?? d.safetyEnabled
        arslEnabled = try c.decodeIfPresent(Bool.self, forKey: .arslEnabled) ?? d.arslEnabled
        onboarded = try c.decodeIfPresent(Bool.self, forKey: .onboarded) ?? d.onboarded
        phrasePack = try c.decodeIfPresent(String.self, forKey: .phrasePack) ?? d.phrasePack
        lawyerPhrases = try c.decodeIfPresent([Int: String].self, forKey: .lawyerPhrases) ?? d.lawyerPhrases
        personPhrases = try c.decodeIfPresent([Int: String].self, forKey: .personPhrases) ?? d.personPhrases
    }

    /// Defaults for nil or unreadable data. A different phrase pack resets the phrase lists;
    /// otherwise custom phrases are merged over the defaults.
    public static func decode(_ data: Data?) -> SettingsData {
        guard let data, var s = try? JSONDecoder().decode(SettingsData.self, from: data) else {
            return SettingsData()
        }
        if s.phrasePack != currentPhrasePack {
            s.lawyerPhrases = PhraseBook.defaultLawyer
            s.personPhrases = PhraseBook.defaultPerson
        } else {
            s.lawyerPhrases = PhraseBook.merge(s.lawyerPhrases, defaults: PhraseBook.defaultLawyer)
            s.personPhrases = PhraseBook.merge(s.personPhrases, defaults: PhraseBook.defaultPerson)
        }
        s.phrasePack = currentPhrasePack
        return s
    }

    public func encoded() -> Data {
        (try? JSONEncoder().encode(self)) ?? Data()
    }

    /// Phrases in use; an entry emptied in Settings falls back to its default.
    public var phraseBook: PhraseBook {
        PhraseBook(lawyer: PhraseBook.merge(lawyerPhrases, defaults: PhraseBook.defaultLawyer),
                   person: PhraseBook.merge(personPhrases, defaults: PhraseBook.defaultPerson))
    }
}
