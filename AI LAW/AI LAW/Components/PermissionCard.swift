import SwiftUI
import UIKit

/// Explains why a device feature is not available, with a shortcut to Settings.
struct PermissionCard: View {
    let title: String
    let message: String
    var systemImage = "camera.fill"
    var showsSettingsButton = false
    var retry: (() -> Void)?

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(Theme.highlight)
            Text(title)
                .appFont(22, .bold)
                .foregroundStyle(.white)
            Text(message)
                .appFont(15)
                .foregroundStyle(.white.opacity(0.75))
                .multilineTextAlignment(.center)
            if showsSettingsButton {
                Button("فتح الإعدادات") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
                .appFont(16, .bold)
                .buttonStyle(.borderedProminent)
                .tint(Theme.accent)
            }
            if let retry {
                Button("إعادة المحاولة", action: retry)
                    .appFont(15, .medium)
                    .tint(Theme.highlight)
            }
        }
        .padding(24)
        .frame(maxWidth: 340)
        .background(Theme.panel.opacity(0.92), in: .rect(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.accent.opacity(0.4)))
    }
}

extension PermissionCard {
    /// Card for a camera status, or nil when the camera is usable.
    static func camera(_ status: CameraEngine.Status, retry: @escaping () -> Void) -> PermissionCard? {
        switch status {
        case .denied:
            PermissionCard(title: "الكاميرا غير مسموحة",
                           message: "اسمح بالكاميرا من الإعدادات لتعمل الإشارات والتنبيهات.",
                           showsSettingsButton: true)
        case .unavailable:
            PermissionCard(title: "الكاميرا غير متاحة",
                           message: "هذا الجهاز لا يحتوي كاميرا (مثل المحاكي). جرّب على iPhone.",
                           systemImage: "video.slash.fill")
        case .failed(let reason):
            PermissionCard(title: "الكاميرا متوقفة", message: reason, systemImage: "exclamationmark.triangle.fill", retry: retry)
        case .idle, .ready:
            nil
        }
    }
}
