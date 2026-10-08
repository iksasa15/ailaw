/// Who the lawyer phone invites, and when. One invitation per person phone at a time; a phone
/// that declines, times out or drops is invited again (the caller waits a moment first) only
/// while it is still nearby and no other phone is connected. The browser is never restarted
/// to rediscover a phone: nearby phones are remembered instead.
public struct PeerInviteTracker<Peer: Hashable> {
    public private(set) var nearby: Set<Peer> = []
    /// Invited or connecting.
    public private(set) var pending: Set<Peer> = []
    public private(set) var connected: Set<Peer> = []
    public private(set) var stopped = false

    public init() {}

    /// A person phone was found. True when it should be invited now (the invitation is recorded).
    public mutating func found(_ peer: Peer) -> Bool {
        guard !stopped else { return false }
        nearby.insert(peer)
        return invite(peer)
    }

    public mutating func lost(_ peer: Peer) {
        nearby.remove(peer)
    }

    public mutating func connecting(_ peer: Peer) {
        pending.insert(peer)
    }

    public mutating func connected(_ peer: Peer) {
        pending.remove(peer)
        connected.insert(peer)
    }

    /// The phone declined, timed out or dropped. True when it should be invited again later.
    public mutating func notConnected(_ peer: Peer) -> Bool {
        pending.remove(peer)
        connected.remove(peer)
        return !stopped && nearby.contains(peer) && connected.isEmpty
    }

    /// A scheduled re-invitation. True when it should still go out (the invitation is recorded).
    public mutating func retry(_ peer: Peer) -> Bool {
        guard !stopped else { return false }
        return invite(peer)
    }

    public mutating func stop() {
        stopped = true
        pending.removeAll()
    }

    private mutating func invite(_ peer: Peer) -> Bool {
        guard nearby.contains(peer), !pending.contains(peer), connected.isEmpty else { return false }
        pending.insert(peer)
        return true
    }
}
