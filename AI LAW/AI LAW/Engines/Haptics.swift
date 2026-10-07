import CoreHaptics
import UIKit

/// Vibration patterns: danger (web navigator.vibrate [200,100,200,100,400]), acceptance, role change.
enum Haptics {
    private static let engine: CHHapticEngine? = {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return nil }
        let engine = try? CHHapticEngine()
        engine?.isAutoShutdownEnabled = true
        return engine
    }()

    static func danger() {
        guard let engine else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return
        }
        let pulses: [(start: TimeInterval, length: TimeInterval)] = [(0, 0.2), (0.3, 0.2), (0.6, 0.4)]
        let events = pulses.map {
            CHHapticEvent(eventType: .hapticContinuous,
                          parameters: [CHHapticEventParameter(parameterID: .hapticIntensity, value: 1),
                                       CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.6)],
                          relativeTime: $0.start, duration: $0.length)
        }
        do {
            try engine.start()
            try engine.makePlayer(with: CHHapticPattern(events: events, parameters: [])).start(atTime: 0)
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    static func accept() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func roleChanged() {
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
    }
}
