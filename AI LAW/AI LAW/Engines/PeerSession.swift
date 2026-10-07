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

    var isConnected: Bool {
        if case .connected = state { true } else { false }
    }

    func start(as role: Role) {
        stop()
        self.role = role
        let core = PeerCore(role: role, displayName: "\(UIDevice.current.name) · \(role.label)")
        core.onEvent = { [weak self] event in
            guard let session = self else { return }
            Task { @MainActor in session.handle(event, from: core) }
        }
        self.core = core
        core.start()
        state = .searching
    }

    func stop() {
        core?.stop()
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

/// MultipeerConnectivity plumbing; delegate callbacks arrive on MC's private queues.
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

    let role: Role
    var onEvent: (@Sendable (Event) -> Void)?

    private let peerID: MCPeerID
    private let session: MCSession
    private let advertiser: MCNearbyServiceAdvertiser
    private let browser: MCNearbyServiceBrowser
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

    func start() {
        advertiser.startAdvertisingPeer()
        browser.startBrowsingForPeers()
    }

    func stop() {
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

    // MARK: Browser

    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peer: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        guard role == .lawyer, info?["role"] == Role.person.rawValue, !session.connectedPeers.contains(peer) else { return }
        browser.invitePeer(peer, to: session, withContext: Self.inviteContext, timeout: 10)
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peer: MCPeerID) {}

    // MARK: Advertiser

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peer: MCPeerID,
                    withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        let accept = role == .person && context == Self.inviteContext && session.connectedPeers.isEmpty
        invitationHandler(accept, accept ? session : nil)
    }

    // MARK: Session

    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        switch state {
        case .connected:
            wasConnected = true
            onEvent?(.connected(peerID.displayName))
        case .notConnected:
            guard session.connectedPeers.isEmpty else { return }
            if wasConnected { onEvent?(.disconnected) }
            if role == .lawyer {
                // Restart browsing so foundPeer fires again and the lawyer re-invites.
                browser.stopBrowsingForPeers()
                browser.startBrowsingForPeers()
            }
        default:
            break
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        onEvent?(.data(data))
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}

    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, with progress: Progress) {}

    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String,
                 fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}
