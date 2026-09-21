import SwiftUI

@main
struct AilawApp: App {
    @State private var settings = AppSettings()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settings)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
