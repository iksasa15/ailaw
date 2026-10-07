import SwiftUI
import UIKit

@main
struct AILawApp: App {
    @State private var settings = AppSettings()

    init() {
        #if DEBUG
        assert(UIFont(name: ThemeWeight.regular.fontName, size: 12) != nil, "Thmanyah Sans is not registered (UIAppFonts)")
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
        }
    }
}
