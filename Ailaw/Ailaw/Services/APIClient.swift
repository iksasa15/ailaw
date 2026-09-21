import Foundation

struct HealthResponse: Decodable {
    let status: String?
    let service: String?
    let whisper: Bool?
    let arsl_engine: String?
    let yamnet: Bool?
    let yamnet_classes: Int?
}

struct VocabWord: Decodable, Identifiable {
    let index: Int
    let display: String
    var id: Int { index }
}

struct VocabResponse: Decodable {
    let words: [VocabWord]?
    let engine: String?
}

struct AmbientResponse: Decodable {
    let is_danger: Bool?
    let label: String?
    let score: Double?
}

struct ScenePhraseResponse: Decodable {
    let role: String?
    let text: String?
    let fingers: Int?
    let at: Double?
}

struct STTResponse: Decodable {
    let text: String?
}

enum APIError: LocalizedError {
    case invalidURL
    case badStatus(Int)
    case decoding

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "عنوان API غير صالح"
        case .badStatus(let code): return "خطأ شبكة (\(code))"
        case .decoding: return "تعذر قراءة الاستجابة"
        }
    }
}

final class APIClient {
    private let settings: AppSettings
    private let session: URLSession

    init(settings: AppSettings, session: URLSession = .shared) {
        self.settings = settings
        self.session = session
    }

    var baseURL: String { settings.resolvedApiBase }

    var wsBaseURL: String {
        baseURL.replacingOccurrences(of: "https", with: "wss")
            .replacingOccurrences(of: "http", with: "ws")
    }

    func checkHealth() async throws -> HealthResponse {
        try await get("/health")
    }

    func fetchVocab() async throws -> VocabResponse {
        try await get("/arsl/vocab")
    }

    func fetchLawyerScene() async throws -> ScenePhraseResponse {
        try await get("/scene/lawyer")
    }

    func publishScenePhrase(role: String, text: String, fingers: Int) async throws {
        struct Body: Encodable {
            let role: String
            let text: String
            let fingers: Int
        }
        let _: ScenePhraseResponse = try await postJSON("/scene/phrase", body: Body(role: role, text: text, fingers: fingers))
    }

    func postSTT(data: Data, filename: String = "audio.wav", language: String = "ar") async throws -> STTResponse {
        try await postMultipart("/stt", fileField: "file", filename: filename, mime: "audio/wav", data: data, fields: ["language": language])
    }

    func classifyAmbient(data: Data, filename: String = "ambient.wav") async throws -> AmbientResponse {
        try await postMultipart("/ambient", fileField: "file", filename: filename, mime: "audio/wav", data: data, fields: [:])
    }

    func predictArsl(landmarks: [[Double]], threshold: Double) async throws -> [String: Any] {
        guard let url = URL(string: baseURL + "/arsl/predict") else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = ["landmarks": landmarks, "threshold": threshold]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        let obj = try JSONSerialization.jsonObject(with: data)
        return obj as? [String: Any] ?? [:]
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    private func postJSON<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func postMultipart<T: Decodable>(
        _ path: String,
        fileField: String,
        filename: String,
        mime: String,
        data: Data,
        fields: [String: String]
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        for (key, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mime)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (respData, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        return try JSONDecoder().decode(T.self, from: respData)
    }
}
