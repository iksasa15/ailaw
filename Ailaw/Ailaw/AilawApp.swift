import SwiftUI

@main
struct AilawApp: App {
    @State private var settings = AppSettings()
    @State private var pairing = PairingCoordinator()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settings)
                .environment(pairing)
                .environment(\.layoutDirection, .rightToLeft)
                .onOpenURL { url in
                    guard let invite = PairInvite.parse(url) else { return }
                    pairing.apply(invite: invite.api, role: invite.role, settings: settings)
                }
        }
    }
}
