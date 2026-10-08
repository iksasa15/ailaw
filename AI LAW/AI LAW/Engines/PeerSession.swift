import AILawCore
import MultipeerConnectivity
import Observation
import UIKit

/// Direct phone-to-phone link for the two-phone session (replaces the web server rooms + QR).
@Observable
final class PeerSession {
    enum State: Equatable {
        case idle, searching, disconnected
        case connected(peerName: String)
    }

    private(set) var state: State = .idle
    private(set) var role: Role?

    @ObservationIgnored var onMessage: ((SceneMessage) -> Void)?
    @ObservationIgnored var snapshotProvider: (() -> SceneMessage)?
    @ObservationIgnored private var core: PeerCore?
    @ObservationIgnored private var retired: [PeerCore] = []

    var isConnected: Bool {
        if case .connected = state { true } else { false }
    }

    func start(as role: Role) {
        // Picking the same role again keeps the running link (re-creating it drops the connection).
        if role == self.role, core != nil { return }
        stop()
        self.role = role
        let core = PeerCore(role: role, displayName: "\(UIDevice.current.name) · \(role.label)")
        // Weak both ways: the core stores this closure, so a strong capture would leak every core.
        core.onEvent = { [weak self, weak core] event in
            guard let session = self, let core else { return }
            Task { @MainActor in session.handle(event, from: core) }
        }
        self.core = core
        core.start()
        state = .searching
    }

    func stop() {
        if let core {
            core.stop()
            // MultipeerConnectivity finishes cancelling its browser on the main run loop; keep the
            // stopped core alive until that has run.
            retired.append(core)
            Task { [weak self] in
                try? await Task.sleep(for: .seconds(3))
                self?.retired.removeAll { $0 === core }
            }
        }
        core = nil
        role = nil
        state = .idle
    }

    /// Sent reliably to the connected phone; does nothing when no phone is connected.
    func send(_ message: SceneMessage) {
        core?.send(message.encoded())
    }

    private func handle(_ event: PeerCore.Event, from source: PeerCore) {
        guard source === core else { return }
        switch event {
        case .connected(let name):
            state = .connected(peerName: name)
            if let snapshot = snapshotProvider?() { send(snapshot) }
        case .disconnected:
            state = .disconnected
        case .data(let data):
            if let message = SceneMessage.decode(data) { onMessage?(message) }
        }
    }
}

/// MultipeerConnectivity plumbing. MC calls the delegates on its private queues; every callback
/// hops to the main thread, and the session, advertiser and browser are only driven from there
/// (the browser runs on the main run loop — stopping or restarting it from another thread
/// crashes in CFNetServiceBrowser).
/// Pairing rule: only the lawyer invites, only person phones are invited, and the person
/// accepts only invitations whose context is "lawyer".
nonisolated final class PeerCore: NSObject, MCSessionDelegate, MCNearbyServiceAdvertiserDelegate,
    MCNearbyServiceBrowserDelegate, @unchecked Sendable {
    enum Event: Sendable {
        case connected(String)
        case disconnected
        case data(Data)
    }

    static let serviceType = "ailaw-scene"
    private static let inviteContext = Data("lawyer".utf8)
    /// Pause before inviting a phone again after it declined, timed out or dropped.
    private static let retryDelay: TimeInterval = 1.5

    let role: Role
    var onEvent: (@Sendable (Event) -> Void)?

    private let peerID: MCPeerID
    private let session: MCSession
    private let advertiser: MCNearbyServiceAdvertiser
    private let browser: MCNearbyServiceBrowser

    // Main thread only.
    private var invites = PeerInviteTracker<MCPeerID>()
    private var wasConnected = false

    init(role: Role, displayName: String) {
        self.role = role
        peerID = MCPeerID(displayName: Self.fit(displayName))
        session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)
        advertiser = MCNearbyServiceAdvertiser(peer: peerID, discoveryInfo: ["role": role.rawValue], serviceType: Self.serviceType)
        browser = MCNearbyServiceBrowser(peer: peerID, serviceType: Self.serviceType)
        super.init()
        session.delegate = self
        advertiser.delegate = self
        browser.delegate = self
    }


    /// Main thread. The person phone only advertises; the lawyer phone only browses and invites.
    func start() {
        switch role {
        case .person: advertiser.startAdvertisingPeer()
        case .lawyer: browser.startBrowsingForPeers()
        }
    }

    /// Main thread. Final: a stopped core never invites or reports again.
    func stop() {
        invites.stop()
        onEvent = nil
        session.delegate = nil
        advertiser.delegate = nil
        browser.delegate = nil
        advertiser.stopAdvertisingPeer()
        browser.stopBrowsingForPeers()
        session.disconnect()
    }

    func send(_ data: Data) {
        let peers = session.connectedPeers
        guard !peers.isEmpty else { return }
        try? session.send(data, toPeers: peers, with: .reliable)
    }

    /// MCPeerID display names are limited to 63 UTF-8 bytes.
    private static func fit(_ name: String) -> String {
        var out = ""
        for ch in name where (out + String(ch)).utf8.count <= 63 { out.append(ch) }
        return out.isEmpty ? "AI LAW" : out
    }

    private func onMain(_ work: @escaping @Sendable (PeerCore) -> Void) {
        DispatchQueue.main.async { [weak self] in
            if let core = self { work(core) }
        }
    }

    private func invite(_ peer: MCPeerID) {
        browser.invitePeer(peer, to: session, withContext: Self.inviteContext, timeout: 10)
    }

    private func scheduleRetry(_ peer: MCPeerID) {
        nonisolated(unsafe) let peer = peer
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.retryDelay) { [weak self] in
            guard let core = self, core.invites.retry(peer) else { return }
            core.invite(peer)
        }
    }

    // MARK: Browser (lawyer)

    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peer: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        guard role == .lawyer, info?["role"] == Role.person.rawValue else { return }
        nonisolated(unsafe) let peer = peer
        onMain { core in
            if core.invites.found(peer) { core.invite(peer) }
        }
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peer: MCPeerID) {
        nonisolated(unsafe) let peer = peer
        onMain { $0.invites.lost(peer) }
    }

    // MARK: Advertiser (person)

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peer: MCPeerID,
                    withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        let accept = role == .person && context == Self.inviteContext && session.connectedPeers.isEmpty
        invitationHandler(accept, accept ? session : nil)
    }

    // MARK: Session

    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        nonisolated(unsafe) let peer = peerID
        let name = peerID.displayName
        onMain { core in
            switch state {
            case .connecting:
                core.invites.connecting(peer)
            case .connected:
                core.invites.connected(peer)
                core.wasConnected = true
                core.onEvent?(.connected(name))
            case .notConnected:
                let retry = core.invites.notConnected(peer)
                if core.session.connectedPeers.isEmpty, core.wasConnected {
                    core.wasConnected = false
                    core.onEvent?(.disconnected)
                }
                if retry { core.scheduleRetry(peer) }
            @unknown default:
                break
            }
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        onMain { $0.onEvent?(.data(data)) }
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}

    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, with progress: Progress) {}

    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}
