import Foundation

enum PairInvite {
    static let scheme = "ailaw"
    static let host = "pair"

    static func makeURL(apiBase: String, role: UserRole) -> URL? {
        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.queryItems = [
            URLQueryItem(name: "api", value: apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/"))),
            URLQueryItem(name: "role", value: role.rawValue),
        ]
        return components.url
    }

    static func parse(_ url: URL) -> (api: String, role: UserRole)? {
        guard url.scheme == scheme else { return nil }
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let items = components?.queryItems ?? []
        let api = items.first(where: { $0.name == "api" })?.value?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let roleRaw = items.first(where: { $0.name == "role" })?.value ?? "person"
        guard let api, !api.isEmpty, let role = UserRole(rawValue: roleRaw) else { return nil }
        return (api, role)
    }

    /// Also accept pasted plain http API URLs and treat as person join.
    static func parseFlexible(_ text: String) -> (api: String, role: UserRole)? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URL(string: trimmed), let pair = parse(url) {
            return pair
        }
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            let api = trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            return (api, .person)
        }
        return nil
    }
}

/// App-wide pairing navigation (deep link / QR).
@Observable
final class PairingCoordinator {
    var pendingRole: UserRole?
    var shouldOpenScreensTab = false

    func apply(invite api: String, role: UserRole, settings: AppSettings) {
        settings.apiBase = api
        settings.onboarded = true
        shouldOpenScreensTab = true
        pendingRole = role
    }

    func consumePendingRole() -> UserRole? {
        let role = pendingRole
        pendingRole = nil
        return role
    }
}
