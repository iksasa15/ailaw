import AILawCore
import SwiftUI
import UIKit

/// Project overview and the ten ArSL demo words (web About.jsx, vocabulary now local).
struct AboutView: View {
    var body: some View {
        MorePage(title: "عن المشروع", subtitle: "عدسة AR للصم والبكم") {
            SectionCard {
                HStack(spacing: 12) {
                    LogoMark().frame(width: 56, height: 36)
                    Text("النظارة الذكية").appFont(20, .black).foregroundStyle(Theme.ink)
                }
                Text("تطبيق جوال يحاكي نظارة ذكية: كاميرا ومايك كعدسة، كلام يتحول إلى نص، وإشارات مرئية/صوت، مع تنبيهات بصرية لأصوات الخطر.")
                    .appFont(15)
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            SectionCard(title: "الاتجاهات") {
                ForEach(["استقبال: كلام ← نص على العدسة", "إرسال: إشارة ← نطق مسموع", "أمان: صفارة/إنذار ← وميض + اهتزاز"], id: \.self) { line in
                    HStack(alignment: .top, spacing: 8) {
                        Circle().fill(Theme.accent).frame(width: 6, height: 6).padding(.top, 8)
                        Text(line).appFont(15).foregroundStyle(Theme.muted)
                    }
                }
            }
            SectionCard(title: "مفردات ArSL") {
                GestureGrid()
            }
            Text("كل المعالجة على الجهاز: Vision وSpeech وSoundAnalysis — بدون سيرفر.")
                .appFont(13)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
        }
    }
}

/// The ten ArSL demo words with their gesture images (shared with the guide).
struct GestureGrid: View {
    static let files: [String: String] = [
        "ينام": "yanam", "يسكت": "yaskut", "حب": "hub", "يدخن": "yudakhin", "دعم": "musaada",
        "مرتبك": "murtabik", "قلق": "qalaq", "هنا": "huna", "السلام عليكم": "salam", "شكرا": "shukran",
    ]

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
            ForEach(WordSignClassifier.labels, id: \.self) { label in
                VStack(spacing: 6) {
                    if let file = Self.files[label], let image = UIImage(named: "\(file).png") {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 110)
                            .clipShape(.rect(cornerRadius: 12))
                    }
                    Text(WordSignClassifier.displayNames[label] ?? label)
                        .appFont(14, .bold)
                        .foregroundStyle(Theme.ink)
                }
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Theme.bg, in: .rect(cornerRadius: 14))
            }
        }
    }
}
