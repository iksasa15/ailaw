@testable import AILawCore
import Testing

struct PeerInviteTrackerTests {
    @Test func invitesAFoundPersonOnce() {
        var tracker = PeerInviteTracker<String>()
        let r1 = tracker.found("p")
        #expect(r1)
        // Found again (another network path) while the invitation is out: no second invitation.
        let r2 = tracker.found("p")
        #expect(!r2)
        tracker.connecting("p")
        let r3 = tracker.found("p")
        #expect(!r3)
    }

    @Test func noInvitationsWhileConnected() {
        var tracker = PeerInviteTracker<String>()
        _ = tracker.found("p")
        tracker.connected("p")
        let r4 = tracker.found("q")
        #expect(!r4)
        let r5 = tracker.retry("p")
        #expect(!r5)
    }

    @Test func declinedOrDroppedPeerIsRetriedWhileNearby() {
        var tracker = PeerInviteTracker<String>()
        _ = tracker.found("p")
        let r6 = tracker.notConnected("p")
        #expect(r6)
        let r7 = tracker.retry("p")
        #expect(r7)
        // The retry is itself an invitation: a second scheduled retry does nothing.
        let r8 = tracker.retry("p")
        #expect(!r8)

        tracker.connected("p")
        let r9 = tracker.notConnected("p")
        #expect(r9)
        let r10 = tracker.retry("p")
        #expect(r10)
    }

    @Test func lostPeerIsNotRetried() {
        var tracker = PeerInviteTracker<String>()
        _ = tracker.found("p")
        tracker.lost("p")
        let r11 = tracker.notConnected("p")
        #expect(!r11)
        let r12 = tracker.retry("p")
        #expect(!r12)
    }

    @Test func otherConnectionBlocksRetry() {
        var tracker = PeerInviteTracker<String>()
        _ = tracker.found("p")
        _ = tracker.found("q")
        tracker.connected("q")
        let r13 = tracker.notConnected("p")
        #expect(!r13)
        let r14 = tracker.retry("p")
        #expect(!r14)
    }

    @Test func stoppedTrackerNeverInvites() {
        var tracker = PeerInviteTracker<String>()
        _ = tracker.found("p")
        _ = tracker.notConnected("p")
        tracker.stop()
        let r15 = tracker.retry("p")
        #expect(!r15)
        let r16 = tracker.found("q")
        #expect(!r16)
    }
}
