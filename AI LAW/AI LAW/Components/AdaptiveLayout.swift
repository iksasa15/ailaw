import SwiftUI

/// iPad layout helpers. On iPhone (compact width) they leave the layout as it was.
enum AppLayout {
    /// Comfortable reading column for forms and lists.
    static let readable: CGFloat = 720
    /// Two-column pages (lab, guide).
    static let wide: CGFloat = 1120
    /// Fixed side panel beside the camera in iPad landscape.
    static let lensPanel: CGFloat = 380
    /// Lens overlays (caption, letters, controls) never stretch wider than this.
    static let lensOverlay: CGFloat = 640
}

extension View {
    /// Centers the content in a column no wider than `maxWidth`.
    func readableWidth(_ maxWidth: CGFloat = AppLayout.readable) -> some View {
        frame(maxWidth: maxWidth).frame(maxWidth: .infinity)
    }
}
