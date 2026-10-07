import Foundation
import Testing
@testable import AILawCore

@Suite struct SceneMessageTests {
    let p = ScenePhrase(id: UUID(), role: .lawyer, text: "أين وقع الحادث؟", fingers: 3, at: 1_739_999_999_999)

    private func json(_ data: Data) -> [String: Any] {
        (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
    }

    @Test func phraseRoundTrip() {
        let data = SceneMessage.phrase(p).encoded()
        #expect(SceneMessage.decode(data) == .phrase(p))
        let obj = json(data)
        #expect(obj["type"] as? String == "phrase")
        #expect(obj["role"] as? String == "lawyer")
        #expect(obj["text"] as? String == p.text)
        #expect(obj["fingers"] as? Int == 3)
        #expect(obj["at"] as? Int64 == p.at)
        #expect(obj["id"] as? String == p.id.uuidString)
    }

    @Test func snapshotRoundTripWithNull() {
        let message = SceneMessage.snapshot(lawyer: p, person: nil)
        let data = message.encoded()
        #expect(SceneMessage.decode(data) == message)
        let obj = json(data)
        #expect(obj["type"] as? String == "snapshot")
        #expect(obj.keys.contains("person"))
        #expect(obj["person"] is NSNull)
    }

    @Test func decodeRejectsMalformedMessages() {
        let id = UUID().uuidString
        func phrase(_ body: String) -> Data {
            Data(#"{"type":"phrase","id":"\#(id)","at":1,\#(body)}"#.utf8)
        }
        let longText = String(repeating: "ب", count: 201)
        let bad: [Data] = [
            Data([0xFF, 0x00, 0x13, 0x37]),
            Data(#"{"type":"hello"}"#.utf8),
            phrase(#""role":"lawyer","text":"","fingers":null"#),
            phrase(#""role":"lawyer","text":"\#(longText)","fingers":null"#),
            phrase(#""role":"lawyer","text":"نص","fingers":0"#),
            phrase(#""role":"lawyer","text":"نص","fingers":11"#),
            phrase(#""role":"judge","text":"نص","fingers":null"#),
        ]
        for data in bad { #expect(SceneMessage.decode(data) == nil) }
        #expect(SceneMessage.decode(phrase(#""role":"person","text":"نص","fingers":null"#)) != nil)
    }

    @Test func deduperById() {
        var d = SceneDeduper()
        let first = d.isNew(p)
        let again = d.isNew(p)
        var sameContent = p
        sameContent.id = UUID()
        let echo = d.isNew(sameContent)
        var other = p
        other.id = UUID()
        other.text = "نص آخر"
        let fresh = d.isNew(other)
        #expect(first)
        #expect(!again)
        #expect(!echo)
        #expect(fresh)
    }
}
