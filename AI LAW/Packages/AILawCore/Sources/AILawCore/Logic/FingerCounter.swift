/// Which fingers are extended (web `fingerFlags` / `countExtendedFingers`).
public struct FingerFlags: Equatable, Sendable {
    public var thumb: Bool
    public var index: Bool
    public var middle: Bool
    public var ring: Bool
    public var little: Bool

    /// Five characters in thumb, index, middle, ring, little order — e.g. "10001".
    public var pattern: String {
        [thumb, index, middle, ring, little].map { $0 ? "1" : "0" }.joined()
    }

    public var count: Int {
        [thumb, index, middle, ring, little].filter { $0 }.count
    }
}

public enum FingerCounter {
    public static func flags(_ hand: HandLandmarks) -> FingerFlags {
        let wrist = hand[.wrist]
        func extended(_ tip: Joint, _ pip: Joint) -> Bool {
            planarDistance(hand[tip], wrist) > planarDistance(hand[pip], wrist) * 1.12
        }
        let littleMCP = hand[.littleMCP]
        let thumb = planarDistance(hand[.thumbTip], littleMCP) > planarDistance(hand[.thumbIP], littleMCP) * 1.08
        return FingerFlags(
            thumb: thumb,
            index: extended(.indexTip, .indexPIP),
            middle: extended(.middleTip, .middlePIP),
            ring: extended(.ringTip, .ringPIP),
            little: extended(.littleTip, .littlePIP)
        )
    }

    public static func count(_ hand: HandLandmarks) -> Int {
        min(5, flags(hand).count)
    }

    /// Sum across hands, capped at 10.
    public static func count(hands: [HandLandmarks]) -> Int {
        min(10, hands.reduce(0) { $0 + count($1) })
    }
}
