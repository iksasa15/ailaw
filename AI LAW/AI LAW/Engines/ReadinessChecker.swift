import AVFoundation
import Observation
import Speech

struct ReadinessItem: Identifiable, Equatable {
    let id: String
    let title: String
    let ok: Bool
    let fix: String
}

/// Pre-demo checklist: everything the presentation needs, with how to fix what is missing.
@Observable
final class ReadinessChecker {
    private(set) var items: [ReadinessItem] = []

    var failingCount: Int { items.filter { !$0.ok }.count }
    var allOK: Bool { !items.isEmpty && failingCount == 0 }

    func refresh(peer: PeerSession, speak: SpeakEngine) {
        items = [
            ReadinessItem(id: "camera", title: "الكاميرا",
                          ok: AVCaptureDevice.authorizationStatus(for: .video) == .authorized,
                          fix: "الإعدادات ← AI LAW ← فعّل الكاميرا"),
            ReadinessItem(id: "microphone", title: "المايك",
                          ok: AVAudioApplication.shared.recordPermission == .granted,
                          fix: "الإعدادات ← AI LAW ← فعّل الميكروفون"),
            ReadinessItem(id: "speechAuth", title: "التعرف على الكلام",
                          ok: SFSpeechRecognizer.authorizationStatus() == .authorized,
                          fix: "الإعدادات ← AI LAW ← فعّل التعرف على الكلام"),
            ReadinessItem(id: "arabicOnDevice", title: "الكلام العربي بدون إنترنت",
                          ok: SpeechEngine.isArabicOnDeviceAvailable,
                          fix: "الإعدادات ← عام ← لوحة المفاتيح: أضف العربية وفعّل الإملاء، ثم انتظر تحميل حزمة اللغة مع الإنترنت مرة واحدة"),
            ReadinessItem(id: "arabicVoice", title: "صوت النطق العربي",
                          ok: speak.hasArabicVoice,
                          fix: "الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات ← العربية: نزّل صوتاً"),
            ReadinessItem(id: "peer", title: "الجوال الثاني",
                          ok: peer.isConnected,
                          fix: "افتح تبويب «جلسة» على الجوالين واختر دوراً مختلفاً لكل جوال"),
        ]
    }
}
