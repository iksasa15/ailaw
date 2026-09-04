import { Link } from 'react-router-dom'
import { GESTURE_CLIPS, GestureClipCard } from '../components/guide/GestureArt'
import { SECTION_SVG, SvgHowToSend } from '../components/guide/GuideIllustrations'

const HOW_TO_VOCAB = [
  'فعّل زر «إرسال» من الشريط السفلي.',
  'ضع يدك (أو يديك) حتى تظهر «يد متثبتة».',
  'ارفع عدد الأصابع حسب الجملة (1–5 يد واحدة، 6–10 يدين).',
  'ثبّت — تظهر الجملة في الوسط ويُنطق الصوت.',
]

const SECTIONS = [
  {
    id: 'start',
    title: 'قبل البدء',
    emoji: '🚀',
    steps: [
      'اسمح للكاميرا والمايكروفون عند أول فتح.',
      'من الإعدادات تأكد أن عنوان الـ Backend صحيح (مثل http://IP:8000 على الجوال).',
      'فعّل الأوضاع التي تحتاجها من الشريط السفلي: استقبال / إرسال / أمان.',
    ],
  },
  {
    id: 'receive',
    title: 'استقبال — كلام يتحول إلى نص',
    accent: 'استقبال',
    emoji: '👂',
    steps: [
      'اضغط زر «استقبال» حتى يصبح مفعّلاً (أخضر).',
      'اطلب من الشخص السامع التحدث بوضوح قرب المايك.',
      'سيظهر النص العربي في فقاعة أسفل وسط الشاشة فوق صورة الكاميرا.',
      'استخدم «مسح النص» لإفراغ الفقاعة والبدء من جديد.',
    ],
    tip: 'قلل ضوضاء الخلفية لتحسين دقة التحويل.',
  },
  {
    id: 'send',
    title: 'إرسال — رقم الأصابع يتحول إلى جملة',
    accent: 'إرسال',
    emoji: '🖐️',
    steps: [
      'اضغط زر «إرسال».',
      'يد واحدة: ١ سلام · ٢ كيف حالك · ٣ شكراً · ٤ مساعدة · ٥ مع السلامة',
      'يدين (مجموع الأصابع): ٦ نعم · ٧ لا · ٨ من فضلك · ٩ أنا آسف · ١٠ أنا بخير',
      'أظهر اليدين معاً في الإطار للأرقام 6–10، وثبّت حتى تُنطق الجملة.',
    ],
    tip: 'للإرسال بيد واحدة اكتفِ بـ 1–5؛ للجمل الإضافية استخدم يدين.',
  },
  {
    id: 'safety',
    title: 'أمان — خطر + حاجز قريب',
    accent: 'أمان',
    emoji: '🚨',
    steps: [
      'اضغط زر «أمان».',
      'صفارة/إنذار: وميض أحمر + اهتزاز.',
      'حاجز أمامك: قرّب الكاميرا من جدار أو باب — يصدر صفير تحذير + صوت «احذر حاجز قريب».',
      'للإرسال أوقف «إرسال» مؤقتاً لتفعيل الكاميرا الخلفية ورؤية ما أمامك.',
      'اضغط على التنبيه لإخفائه.',
    ],
    tip: 'جرّب بتوجيه الهاتف نحو جدار والاقتراب منه ببطء.',
  },
  {
    id: 'badges',
    title: 'معنى شارات التتبع',
    emoji: '✋',
    steps: [
      '«وجّه يدك» — لا توجد يد في الإطار؛ ضع يدك في المنتصف.',
      '«تتبع ضعيف» — اليد ظاهرة لكن تتحرك كثيراً؛ ثبّتها قليلاً.',
      '«يد متثبتة» — التتبع جاهز للتعرف على الإشارة.',
    ],
  },
  {
    id: 'settings',
    title: 'إعدادات مفيدة',
    emoji: '⚙️',
    steps: [
      'عتبة ثقة الإشارة (~0.35–0.40 للديمو): أعلى = أقل أخطاء وأصعب قبول.',
      'شفافية وحجم النص: لوضوح فقاعة الاستقبال.',
      'تثبيت PWA: لفتح التطبيق كشاشة مستقلة على الجوال.',
    ],
  },
]

export default function Guide() {
  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#3ecf8e]">النظارة الذكية</p>
            <h1 className="text-2xl font-bold">📖 تعليمات الاستخدام</h1>
          </div>
          <Link to="/" className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm">
            👓 العدسة
          </Link>
        </div>

        <p className="leading-7 text-white/80">
          كل قسم فيه <strong className="text-white">إيموجي</strong> يوضح الفكرة، ثم الخطوات.
        </p>

        <section
          id="vocab"
          className="space-y-4 rounded-2xl border border-[#3ecf8e]/35 bg-[#3ecf8e]/8 p-4"
        >
          <div>
            <p className="text-xs font-semibold text-[#3ecf8e]">🖐️ إرسال · أصابع</p>
            <h2 className="mt-1 text-xl font-bold">محادثة بالأصابع (1 → 10)</h2>
            <p className="mt-2 text-sm leading-7 text-white/75">
              ارفع <strong className="text-white">رقم الأصابع</strong> لتظهر الجملة وتُنطق تلقائياً.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <SvgHowToSend />
          </div>

          <ol className="list-decimal space-y-2 pr-5 text-sm leading-7 text-white/85">
            {HOW_TO_VOCAB.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="space-y-3">
            {GESTURE_CLIPS.map((clip, index) => (
              <GestureClipCard key={clip.display} clip={clip} index={index} />
            ))}
          </div>

          <p className="text-xs leading-5 text-white/50">
            ملاحظة: الرسوم تعليمية مبسّطة — لـ 6–10 استخدم يدين ومجموع الأصابع.
          </p>
        </section>

        {SECTIONS.map((section) => {
          const Illust = SECTION_SVG[section.id]
          return (
            <section key={section.id} className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-semibold">
                  {section.emoji ? <span aria-hidden>{section.emoji} </span> : null}
                  {section.title}
                </h2>
                {section.accent ? (
                  <span className="rounded-md bg-[#3ecf8e]/20 px-2 py-0.5 text-xs font-semibold text-[#3ecf8e]">
                    {section.accent}
                  </span>
                ) : null}
              </div>

              {Illust ? (
                <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                  <Illust />
                </div>
              ) : null}

              <ol className="list-decimal space-y-2 pr-5 text-sm leading-7 text-white/80">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {section.tip ? (
                <p className="text-sm text-white/55">ملاحظة: {section.tip}</p>
              ) : null}
            </section>
          )
        })}

        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            to="/"
            className="min-h-11 rounded-xl bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#062016]"
          >
            👓 ابدأ على العدسة
          </Link>
          <a
            href="#vocab"
            className="flex min-h-11 items-center rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
          >
            🖐️ المقاطع
          </a>
          <Link
            to="/settings"
            className="min-h-11 rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
          >
            ⚙️ الإعدادات
          </Link>
        </div>
      </div>
    </div>
  )
}
