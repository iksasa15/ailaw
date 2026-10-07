/// Finger phrases win; an ArSL word is used only as a confident supplement (web Home.jsx sendResult).
public enum SignArbiter {
    public static func pick(finger: SignResult?, word: SignResult?, wordEnabled: Bool) -> SignResult? {
        if let finger, finger.accepted { return finger }
        if wordEnabled, let word, word.accepted, word.confidence >= 0.45 { return word }
        return finger ?? (wordEnabled ? word : nil)
    }
}
