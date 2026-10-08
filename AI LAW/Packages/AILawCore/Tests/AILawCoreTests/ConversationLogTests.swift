import Foundation
import Testing
@testable import AILawCore

@Suite struct ConversationLogTests {
    private func phrase(_ role: Role, _ text: String, at: Int64, id: UUID = UUID()) -> ScenePhrase {
        ScenePhrase(id: id, role: role, text: text, fingers: nil, at: at)
    }

    @Test func recordsInTimeOrderOnce() {
        var log = ConversationLog()
        let a = phrase(.lawyer, "أين وقع الحادث؟", at: 2000)
        log.record(phrase(.person, "تعرضت لحادث سيارة", at: 1000))
        log.record(a)
        log.record(a) // shown and published: same phrase twice
        #expect(log.entries.map(\.text) == ["تعرضت لحادث سيارة", "أين وقع الحادث؟"])
    }

    @Test func capsAtLimit() {
        var log = ConversationLog(limit: 3)
        for i in 0..<5 { log.record(phrase(.person, "\(i)", at: Int64(i))) }
        #expect(log.entries.map(\.text) == ["2", "3", "4"])
    }

    @Test func exportText() {
        var log = ConversationLog()
        log.record(phrase(.lawyer, "السلام عليكم، أنا محاميك", at: 0))
        log.record(phrase(.person, "تعرضت لحادث سيارة", at: 5000))
        let text = log.exportText(timeZone: TimeZone(identifier: "UTC")!)
        #expect(text.contains("[00:00:00] المحامي: السلام عليكم، أنا محاميك"))
        #expect(text.contains("[00:00:05] الشخص: تعرضت لحادث سيارة"))
    }

    @Test func clear() {
        var log = ConversationLog()
        log.record(phrase(.person, "نص", at: 1))
        log.clear()
        #expect(log.entries.isEmpty)
    }
}
