import AILawCore
import SwiftUI

/// How to use the app (port of web Guide.jsx, adapted: no server, two-phone session via the Session tab).
struct GuideView: View {
    @Environment(AppSettings.self) private var settings

    private struct Section {
        let emoji: String
        let title: String
        let steps: [String]
        var tip: String?
    }

    private let howToVocab = [
        "فعّل زر «إرسال» من الشريط السفلي.",
        "الدور الابتدائي: شخص — اضغط «تبديل» أو ثبّت الأصابع 3 ثوانٍ لتغيير الدور.",
        "ثبّت إصبعاً واحداً 3 ثوانٍ ← وضع المحامي",
        "ثبّت إصبعين 3 ثوانٍ ← وضع الشخص",
        "ارفع رقم الأصابع بالترتيب (1–10) ليحكي الشخص قضيته تفصيلاً، والمحامي يرد.",
    ]

    private let sections = [
        Section(emoji: "🚀", title: "قبل البدء", steps: [
            "اسمح للكاميرا والمايكروفون عند أول فتح.",
            "افتح «فحص الجاهزية» من الإعدادات وتأكد أن كل البنود ✓.",
            "فعّل الأوضاع التي تحتاجها من الشريط السفلي: استقبال / إرسال / أمان.",
        ]),
        Section(emoji: "👂", title: "استقبال — كلام يتحول إلى نص", steps: [
            "اضغط زر «استقبال» حتى يصبح مفعّلاً (أخضر).",
            "اطلب من الشخص السامع التحدث بوضوح قرب المايك.",
            "سيظهر النص العربي في فقاعة أسفل الشاشة فوق صورة الكاميرا.",
            "استخدم «مسح» لإفراغ الفقاعة والبدء من جديد.",
        ], tip: "قلل ضوضاء الخلفية لتحسين دقة التحويل."),
        Section(emoji: "⚖️", title: "إرسال — سيناريو قضية (محامي ↔︎ شخص)", steps: [
            "اضغط زر «إرسال».",
            "تغيير الدور: اضغط شارة الدور أعلى الشاشة، أو إصبع واحد 3 ثوانٍ = محامي · إصبعان 3 ثوانٍ = شخص.",
            "ثم ارفع رقم الأصابع حسب عبارة الدور الحالي (1–10).",
            "تظهر الجملة في الوسط مع صوت الدور (محامي أو شخص).",
        ], tip: "لجهازين: من تبويب «جلسة» اختر «أنا المحامي» على جوال و«أنا الشخص» على الآخر — بدون إنترنت."),
        Section(emoji: "🔤", title: "حروف — كتابة بالأبجدية", steps: [
            "اضغط زر «حروف».",
            "ثبّت شكل الحرف حتى تمتلئ الدائرة (ثانيتان في الوضع المتوازن) فيُكتب.",
            "استخدم حذف / مسافة / مسح، ثم «إرسال» لينطق النص.",
        ]),
        Section(emoji: "⌨️", title: "اكتب وانطق + سجل المحادثة", steps: [
            "زر لوحة المفاتيح أعلى العدسة: اكتب جملة أو اختر رداً سريعاً، فينطقه الجوال (أو يُرسل لجوال المحامي في الجلسة).",
            "زر الفقاعة أعلى العدسة: «سجل المحادثة» بكل ما قيل وأُشير به، مع زر مشاركة لحفظ الجلسة كنص.",
        ]),
        Section(emoji: "🚨", title: "أمان — خطر + حاجز قريب", steps: [
            "اضغط زر «أمان».",
            "صفارة/إنذار: وميض أحمر + اهتزاز.",
            "حاجز أمامك: قرّب الكاميرا من جدار أو باب — يصدر صفير تحذير + صوت «احذر حاجز قريب».",
            "للإرسال أوقف «إرسال» مؤقتاً لتفعيل الكاميرا الخلفية ورؤية ما أمامك.",
            "اضغط على التنبيه لإخفائه.",
        ], tip: "جرّب بتوجيه الهاتف نحو جدار والاقتراب منه ببطء."),
        Section(emoji: "✋", title: "معنى شارات التتبع", steps: [
            "«وجّه يدك» — لا توجد يد في الإطار؛ ضع يدك في المنتصف.",
            "«تتبع ضعيف» — اليد ظاهرة لكن تتحرك كثيراً؛ ثبّتها قليلاً.",
            "«يد متثبتة» — التتبع جاهز للتعرف على الإشارة.",
            "شارة «وضع المحامي / وضع الشخص» — الدور الحالي لعبارات القضية.",
            "مترجم الإشارة أعلى الشاشة للشخص: يترجم كلام المحامي إلى لغة إشارة يفهمها.",
        ]),
        Section(emoji: "⚙️", title: "إعدادات مفيدة", steps: [
            "سرعة التعرف: «سريع» يقبل العبارة في نصف ثانية تقريباً، «متوازن» في 0.7 ث، «دقيق» مثل الموقع (1.2 ث). تغيّر أيضاً مدة تثبيت الحرف والدور.",
            "حساسية التعرف (~0.35–0.40 للديمو): أعلى = أقل أخطاء وأصعب قبول.",
            "قوائم الأصابع: من الإعدادات عدّل عبارات المحامي وعبارات الشخص بشكل منفصل.",
            "شفافية وحجم النص: لوضوح فقاعة الاستقبال.",
            "فحص الجاهزية: تأكد قبل العرض أن كل البنود ✓.",
        ]),
    ]

    var body: some View {
        MorePage(title: "التعليمات", subtitle: "كيف تستخدم العدسة والإشارات") {
            SectionCard(title: "محامي ↔︎ شخص (1–10)", systemImage: "hand.raised.fingers.spread.fill") {
                bullets(howToVocab)
            }
            ForEach(sections, id: \.title) { section in
                SectionCard {
                    Text("\(section.emoji)  \(section.title)").appFont(18, .bold).foregroundStyle(Theme.ink)
                    bullets(section.steps, numbered: true)
                    if let tip = section.tip {
                        Text("💡 \(tip)")
                            .appFont(14)
                            .foregroundStyle(Theme.accent)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.accent.opacity(0.08), in: .rect(cornerRadius: 12))
                    }
                }
            }
            phraseTable("عبارات الشخص", settings.data.phraseBook.person, color: Role.person.color)
            phraseTable("عبارات المحامي", settings.data.phraseBook.lawyer, color: Role.lawyer.color)
            SectionCard(title: "كلمات ArSL", systemImage: "hands.sparkles.fill") {
                GestureGrid()
            }
        }
    }

    private func bullets(_ items: [String], numbered: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, item in
                HStack(alignment: .top, spacing: 8) {
                    Text(numbered ? "\(i + 1)." : "•").appFont(15, .bold).foregroundStyle(Theme.accent)
                    Text(item).appFont(15).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func phraseTable(_ title: String, _ phrases: [Int: String], color: Color) -> some View {
        SectionCard(title: title) {
            ForEach(1...10, id: \.self) { n in
                HStack(spacing: 10) {
                    Text(FingerEmoji.byCount[n] ?? "").frame(width: 52, alignment: .leading)
                    Text("\(n)")
                        .appFont(13, .bold)
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(color, in: .circle)
                    Text(phrases[n] ?? "").appFont(15).foregroundStyle(Theme.ink)
                    Spacer()
                }
            }
        }
    }
}
