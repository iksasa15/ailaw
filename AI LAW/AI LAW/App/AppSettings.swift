import AILawCore
import Foundation
import Observation

/// App-wide settings, saved to UserDefaults on every change (web localStorage "sg-settings").
@Observable
final class AppSettings {
    static let storageKey = "sg-settings"

    @ObservationIgnored private let defaults: UserDefaults

    var data: SettingsData {
        didSet { defaults.set(data.encoded(), forKey: Self.storageKey) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        var loaded = SettingsData.decode(defaults.data(forKey: Self.storageKey))
        // Launch argument `-uiOnboarded YES|NO` (simulator smoke checks).
        if defaults.object(forKey: "uiOnboarded") != nil {
            loaded.onboarded = defaults.bool(forKey: "uiOnboarded")
        }
        data = loaded
    }

    func resetAll() {
        data = SettingsData()
    }
}
