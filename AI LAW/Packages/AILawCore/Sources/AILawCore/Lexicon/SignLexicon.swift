import Foundation

public enum SignClipKind: Sendable {
    case video
    case letter
}

/// One step of the sign translator: a bundled sign video or an alphabet letter image.
public struct SignClip: Equatable, Sendable {
    public let resource: String
    public let label: String
    public let kind: SignClipKind

    public init(resource: String, label: String, kind: SignClipKind) {
        self.resource = resource
        self.label = label
        self.kind = kind
    }

    public var fileName: String {
        kind == .video ? "\(resource).mp4" : "\(resource).jpg"
    }
}

/// Phrase → sign clips (port of web/src/data/signLexicon.js).
public enum SignLexicon {
    private static func S(_ file: String, _ label: String) -> SignClip {
        SignClip(resource: file, label: label, kind: .video)
    }

    private static func L(_ file: String, _ label: String) -> SignClip {
        SignClip(resource: file, label: label, kind: .letter)
    }

    /// Sign sequence for each lawyer phrase 1–10 (traffic accident case).
    public static let lawyerClips: [Int: [SignClip]] = [
        1: [S("word-hello", "السلام عليكم"), S("word-lawyer", "أنا محاميك")],
        2: [S("word-ask", "ماذا حدث"), S("lawyer-03b", "بالضبط")],
        3: [S("word-where", "أين"), S("lawyer-05", "وقع الحادث")],
        4: [S("word-ask", "هل لديك"), S("word-paper", "تقرير شرطة")],
        5: [S("word-you", "من كان"), S("lawyer-02", "يقود السيارة")],
        6: [S("word-ask", "هل أصيب"), S("word-you", "أحد")],
        7: [S("word-protect", "سنطالب"), S("word-case", "بالتعويض")],
        8: [S("word-paper", "أوراق"), S("lawyer-08", "التأمين")],
        9: [S("word-no", "لا تتحدث"), S("word-you", "مع الطرف الآخر")],
        10: [S("word-follow", "سأتابع"), S("word-case", "القضية غداً")],
    ]

    /// Arabic sign-language alphabet.
    public static let letterClips: [String: SignClip] = [
        "أ": L("alef", "أ"), "ا": L("alef", "ا"), "إ": L("alef", "إ"), "آ": L("alef", "آ"), "ٱ": L("alef", "ا"),
        "ب": L("ba", "ب"), "ت": L("ta", "ت"), "ث": L("tha", "ث"), "ج": L("jeem", "ج"),
        "ح": L("ha", "ح"), "خ": L("kha", "خ"), "د": L("dal", "د"), "ذ": L("dhal", "ذ"),
        "ر": L("ra", "ر"), "ز": L("zay", "ز"), "س": L("seen", "س"), "ش": L("sheen", "ش"),
        "ص": L("sad", "ص"), "ض": L("dad", "ض"), "ط": L("tah", "ط"), "ظ": L("zah", "ظ"),
        "ع": L("ain", "ع"), "غ": L("ghain", "غ"), "ف": L("fa", "ف"), "ق": L("qaf", "ق"),
        "ك": L("kaf", "ك"), "ل": L("lam", "ل"), "م": L("meem", "م"), "ن": L("noon", "ن"),
        "ه": L("haa", "ه"), "ة": L("ta_marbuta", "ة"), "و": L("waw", "و"), "ؤ": L("waw", "ؤ"),
        "ي": L("ya", "ي"), "ى": L("ya", "ى"), "ئ": L("ya", "ئ"), "لا": L("la", "لا"),
    ]

    /// Drops tashkeel, turns anything outside Arabic/ASCII letters/digits into spaces, collapses spaces.
    public static func normalize(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        for scalar in text.unicodeScalars {
            let v = scalar.value
            if (0x064B...0x065F).contains(v) || v == 0x0670 { continue }
            let keep = (0x0600...0x06FF).contains(v)
                || (scalar.isASCII && (CharacterSet.alphanumerics.contains(scalar)))
            if keep {
                out.append(scalar)
            } else {
                out.append(" ")
            }
        }
        return collapseSpaces(String(out))
    }

    /// Matching-only normalization: also drops Arabic punctuation and tatweel and unifies
    /// alef/ta-marbuta/alef-maqsura forms, so speech output like «اين وقع الحادث» still
    /// matches «أين وقع الحادث؟». Fingerspelling never uses this.
    public static func fold(_ text: String) -> String {
        var out = ""
        for ch in normalize(text) {
            switch ch {
            case "ـ": continue
            case "،", "؛", "؟": out.append(" ")
            case "أ", "إ", "آ", "ٱ": out.append("ا")
            case "ة": out.append("ه")
            case "ى": out.append("ي")
            default: out.append(ch)
            }
        }
        return collapseSpaces(out)
    }

    /// Spells text letter by letter with the sign alphabet; «لا» is one sign.
    public static func fingerspell(_ text: String, maxLetters: Int = 48) -> [SignClip] {
        let chars = Array(normalize(text))
        var clips: [SignClip] = []
        var i = 0
        while i < chars.count && clips.count < maxLetters {
            let ch = chars[i]
            if ch == " " {
                i += 1
                continue
            }
            if ch == "ل", i + 1 < chars.count, chars[i + 1] == "ا", let la = letterClips["لا"] {
                clips.append(la)
                i += 2
                continue
            }
            if let mapped = letterClips[String(ch)] { clips.append(mapped) }
            i += 1
        }
        return clips
    }

    /// Phrase → sign sequence: scenario videos when the text is a lawyer phrase
    /// (by finger number, exact match, or contained), otherwise fingerspelling.
    public static func resolve(text: String?, fingers: Int?, spellLetters: Bool) -> [SignClip]? {
        let text = text ?? ""
        let hasFingers = (fingers ?? 0) >= 1
        if text.isEmpty && !hasFingers { return nil }

        let raw = normalize(text)

        if spellLetters {
            let source = raw.isEmpty ? (fingers.map(String.init) ?? "") : raw
            let spelled = fingerspell(source)
            return spelled.isEmpty ? nil : spelled
        }

        if let fingers, (1...10).contains(fingers), let clips = lawyerClips[fingers] {
            return clips
        }

        guard !raw.isEmpty else { return nil }

        let folded = fold(raw)
        let phrases = (1...10).compactMap { n in PhraseBook.defaultLawyer[n].map { (n, fold($0)) } }
        if let (n, _) = phrases.first(where: { $0.1 == folded }) { return lawyerClips[n] }
        if let n = mostRecentContained(phrases, in: folded) { return lawyerClips[n] }

        let spelled = fingerspell(raw)
        return spelled.isEmpty ? nil : spelled
    }

    /// The live caption accumulates, so the newest phrase is the one ending rightmost
    /// (ties: the longer phrase). The web picked the lowest-numbered match instead.
    private static func mostRecentContained(_ phrases: [(Int, String)], in text: String) -> Int? {
        var best: (n: Int, end: Int, length: Int)?
        for (n, phrase) in phrases where !phrase.isEmpty {
            guard let range = text.range(of: phrase, options: .backwards) else { continue }
            let end = text.distance(from: text.startIndex, to: range.upperBound)
            if best == nil || end > best!.end || (end == best!.end && phrase.count > best!.length) {
                best = (n, end, phrase.count)
            }
        }
        return best?.n
    }

    private static func collapseSpaces(_ s: String) -> String {
        s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
}
