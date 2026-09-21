import SwiftUI

struct GuideView: View {
    @Environment(AppSettings.self) private var settings

    private let howTo = [
        "فعّل زر «إرسال» من الشريط السفلي.",
        "الدور الابتدائي: شخص 👤 — اضغط «تبديل» أو ثبّت الأصابع 5 ثوانٍ لتغيير الدور.",
        "ثبّت إصبعاً واحداً 5 ثوانٍ → وضع المحامي ⚖️",
        "ثبّت إصبعين 5 ثوانٍ → وضع الشخص 👤",
        "ارفع رقم الأصابع بالترتيب (1→10) ليحكي الشخص قضيته تفصيلاً، والمحامي يرد.",
    ]

    private let sections: [(id: String, title: String, emoji: String, steps: [String], tip: String?)] = [
        ("start", "قبل البدء", "🚀", [
            "اسمح للكاميرا والمايكروفون عند أول فتح.",
            "من الإعدادات تأكد أن عنوان الـ Backend صحيح (مثل http://IP:8000 على الجوال).",
            "فعّل الأوضاع التي تحتاجها من الشريط السفلي: استقبال / إرسال / أمان.",
        ], nil),
        ("receive", "استقبال — كلام يتحول إلى نص", "👂", [
            "اضغط زر «استقبال» حتى يصبح مفعّلاً (أخضر).",
            "اطلب من الشخص السامع التحدث بوضوح قرب المايك.",
            "سيظهر النص العربي في فقاعة أسفل وسط الشاشة فوق صورة الكاميرا.",
            "استخدم «مسح» لإفراغ الفقاعة والبدء من جديد.",
        ], "قلل ضوضاء الخلفية لتحسين دقة التحويل."),
        ("send", "إرسال — سيناريو قضية (محامي ↔ شخص)", "⚖️", [
            "اضغط زر «إرسال».",
            "تغيير الدور: زر «تبديل»، أو إصبع واحد 5 ثوانٍ = محامي · إصبعان 5 ثوانٍ = شخص.",
            "ثم ارفع رقم الأصابع حسب عبارة الدور الحالي (1–10).",
            "تظهر الجملة في الوسط مع صوت الدور (محامي أو شخص).",
        ], "لجهازين: من «شاشتين» افتح شاشة محامي على جوال وشاشة شخص على جوال آخر."),
        ("safety", "أمان — خطر + حاجز قريب", "🚨", [
            "اضغط زر «أمان».",
            "صفارة/إنذار: وميض أحمر + اهتزاز.",
            "حاجز أمامك: قرّب الكاميرا من جدار — صوت «احذر حاجز قريب».",
            "للإرسال أوقف «إرسال» مؤقتاً لتفعيل الكاميرا الخلفية.",
            "اضغط على التنبيه لإخفائه.",
        ], "جرّب بتوجيه الهاتف نحو جدار والاقتراب منه ببطء."),
        ("badges", "معنى شارات التتبع", "✋", [
            "«وجّه يدك» — لا توجد يد في الإطار.",
            "«تتبع ضعيف» — اليد ظاهرة لكن تتحرك كثيراً.",
            "«يد متثبتة» — التتبع جاهز.",
            "شارة الوضع — الدور الحالي لعبارات القضية.",
        ], nil),
        ("settings", "إعدادات مفيدة", "⚙️", [
            "عتبة ثقة الإشارة (~0.35–0.40 للديمو).",
            "عدّل عبارات المحامي والشخص من الإعدادات.",
            "شفافية وحجم النص لوضوح فقاعة الاستقبال.",
        ], nil),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("النظارة الذكية")
                        .font(AppTheme.brandFont(13, weight: .semibold))
                        .foregroundStyle(AppTheme.accent)
                    Text("📖 تعليمات الاستخدام")
                        .font(AppTheme.brandFont(26, weight: .bold))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("كيف ترسل بالعبارات")
                        .font(AppTheme.brandFont(17, weight: .semibold))
                    ForEach(howTo, id: \.self) { line in
                        Text("• \(line)")
                            .font(AppTheme.brandFont(14))
                            .foregroundStyle(AppTheme.muted)
                    }
                }
                .padding(14)
                .background(AppTheme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                ForEach(sections, id: \.id) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(section.emoji) \(section.title)")
                            .font(AppTheme.brandFont(17, weight: .bold))
                        ForEach(section.steps, id: \.self) { step in
                            Text("• \(step)")
                                .font(AppTheme.brandFont(14))
                                .foregroundStyle(AppTheme.muted)
                        }
                        if let tip = section.tip {
                            Text("💡 \(tip)")
                                .font(AppTheme.brandFont(13, weight: .medium))
                                .foregroundStyle(AppTheme.accent)
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                scenarioTable
            }
            .padding(20)
            .padding(.bottom, 24)
        }
        .ailawScreen()
    }

    private var scenarioTable: some View {
        let lawyer = PhraseDefaults.merge(settings.lawyerPhrases, defaults: PhraseDefaults.lawyer)
        let person = PhraseDefaults.merge(settings.personPhrases, defaults: PhraseDefaults.person)
        return VStack(alignment: .leading, spacing: 10) {
            Text("جدول السيناريو (1–10)")
                .font(AppTheme.brandFont(17, weight: .bold))
            ForEach(1...10, id: \.self) { n in
                HStack(alignment: .top, spacing: 8) {
                    Text("\(n)")
                        .font(AppTheme.brandFont(14, weight: .bold))
                        .foregroundStyle(AppTheme.accent)
                        .frame(width: 22)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("⚖️ \(lawyer[n] ?? "")")
                            .font(AppTheme.brandFont(12))
                            .foregroundStyle(AppTheme.lawyer)
                        Text("👤 \(person[n] ?? "")")
                            .font(AppTheme.brandFont(12))
                            .foregroundStyle(AppTheme.accent)
                    }
                }
                .padding(10)
                .background(AppTheme.card)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }
}
