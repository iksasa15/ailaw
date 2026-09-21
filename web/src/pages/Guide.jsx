import { Link } from 'react-router-dom'
import {
  GestureClipCard,
  LAWYER_CLIPS,
  PERSON_CLIPS,
} from '../components/guide/GestureArt'
import { SECTION_SVG, SvgHowToSend } from '../components/guide/GuideIllustrations'
import {
  LAWYER_PHRASES,
  PERSON_PHRASES,
  mergePhraseMap,
} from '../hooks/useFingerPhrases'
import { useSettings } from '../app/SettingsContext'
import { PageHeader } from '../components/layout/PageHeader'

const HOW_TO_VOCAB = [
  'فعّل زر «إرسال» من الشريط السفلي.',
  'الدور الابتدائي: شخص — اضغط «تبديل» أو ثبّت الأصابع 5 ثوانٍ لتغيير الدور.',
  'ثبّت إصبعاً واحداً 5 ثوانٍ → وضع المحامي ⚖️',
  'ثبّت إصبعين 5 ثوانٍ → وضع الشخص 👤',
  'ارفع رقم الأصابع بالترتيب (1→10) ليحكي الشخص قضيته تفصيلاً، والمحامي يرد.',
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
    title: 'إرسال — سيناريو قضية (محامي ↔ شخص)',
    accent: 'إرسال',
    emoji: '⚖️',
    steps: [
      'اضغط زر «إرسال».',
      'تغيير الدور: زر «تبديل» أعلى الشاشة، أو إصبع واحد 5 ثوانٍ = محامي · إصبعان 5 ثوانٍ = شخص.',
      'ثم ارفع رقم الأصابع حسب عبارة الدور الحالي (1–10).',
      'تظهر الجملة في الوسط مع صوت الدور (محامي أو شخص).',
    ],
    tip: 'لجهازين: من «شاشتين» افتح شاشة محامي على جوال وشاشة شخص على جوال آخر (نفس عنوان Backend).',
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
      'شارة «وضع المحامي / وضع الشخص» — الدور الحالي لعبارات القضية.',
      'الأفتار أسفل الشاشة للشخص: يترجم كلام المحامي إلى لغة إشارة تقريبية يفهمها.',
    ],
  },
  {
    id: 'settings',
    title: 'إعدادات مفيدة',
    emoji: '⚙️',
    steps: [
      'عتبة ثقة الإشارة (~0.35–0.40 للديمو): أعلى = أقل أخطاء وأصعب قبول.',
      'قوائم الأصابع: من الإعدادات عدّل عبارات المحامي وعبارات الشخص بشكل منفصل.',
      'شفافية وحجم النص: لوضوح فقاعة الاستقبال.',
      'تثبيت PWA: لفتح التطبيق كشاشة مستقلة على الجوال.',
    ],
  },
]

export default function Guide() {
  const { settings } = useSettings()
  const lawyerMap = mergePhraseMap(settings.lawyerPhrases, LAWYER_PHRASES)
  const personMap = mergePhraseMap(settings.personPhrases, PERSON_PHRASES)
  const SCENARIO_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    n,
    lawyer: lawyerMap[n],
    person: personMap[n],
  }))

  return (
    <div className="h-full overflow-y-auto  px-4 py-6 text-[var(--ink)]">
      <div className="mx-auto max-w-lg space-y-5 pb-10">
        <PageHeader title="التعليمات" subtitle="كيف تستخدم العدسة والإشارات" backTo="/more" />

        <p className="leading-7 text-[var(--ink)]/80">
          سيناريو قضية: بدّل الدور بالتثبيت 5 ثوانٍ، ثم تحدّث بعبارات الأصابع.
        </p>

        <section
          id="vocab"
          className="space-y-4 rounded-2xl border border-[rgba(196,92,38,0.35)] bg-[var(--accent)]/8 p-4"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--accent)]">إرسال · قضية</p>
            <h2 className="mt-1 text-xl font-bold">محامي ↔ شخص (1 → 10)</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--ink)]/75">
              <strong className="text-[var(--ink)]">1 إصبع × 5 ثوانٍ</strong> = محامي ·{' '}
              <strong className="text-[var(--ink)]">2 أصابع × 5 ثوانٍ</strong> = شخص.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl ring-1 ring-[var(--ring)]">
            <SvgHowToSend />
          </div>

          <ol className="list-decimal space-y-2 pr-5 text-sm leading-7 text-[var(--ink)]/85">
            {HOW_TO_VOCAB.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="overflow-hidden rounded-xl ring-1 ring-white/15">
            <div className=" px-3 py-2 text-sm font-bold text-[var(--accent)]">
              سيناريو القضية — الشخص يحكي تفاصيله إصبعاً بإصبع
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-right text-sm">
                <thead>
                  <tr className="app-surface text-[var(--ink)]/70">
                    <th className="px-2 py-2 font-semibold">أصابع</th>
                    <th className="px-2 py-2 font-semibold">محامي</th>
                    <th className="px-2 py-2 font-semibold">شخص</th>
                  </tr>
                </thead>
                <tbody>
                  {SCENARIO_ROWS.map((row) => (
                    <tr key={row.n} className="border-t border-white/10 text-[var(--ink)]/90">
                      <td className="px-2 py-2 font-bold text-[var(--accent)]">{row.n}</td>
                      <td className="px-2 py-2">{row.lawyer}</td>
                      <td className="px-2 py-2">{row.person}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-[var(--ink)]">عبارات الشخص</h3>
            {PERSON_CLIPS.map((clip) => (
              <GestureClipCard key={`person-${clip.number}-${clip.display}`} clip={clip} />
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[var(--ink)]">عبارات المحامي</h3>
            {LAWYER_CLIPS.map((clip) => (
              <GestureClipCard key={`lawyer-${clip.number}-${clip.display}`} clip={clip} />
            ))}
          </div>

          <p className="text-xs leading-5 text-[var(--ink)]/50">
            ملاحظة: لـ 6–10 استخدم يدين ومجموع الأصابع. العبارات حسب الدور الظاهر أعلى الشاشة.
          </p>
        </section>

        {SECTIONS.map((section) => {
          const Illust = SECTION_SVG[section.id]
          return (
            <section key={section.id} className="app-surface space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                {section.accent ? (
                  <span className="rounded-md bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                    {section.accent}
                  </span>
                ) : null}
              </div>

              {Illust ? (
                <div className="overflow-hidden rounded-xl ring-1 ring-[var(--ring)]">
                  <Illust />
                </div>
              ) : null}

              <ol className="list-decimal space-y-2 pr-5 text-sm leading-7 text-[var(--ink)]/80">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {section.tip ? (
                <p className="text-sm text-[var(--ink)]/55">ملاحظة: {section.tip}</p>
              ) : null}
            </section>
          )
        })}

        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            to="/"
            className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            العدسة
          </Link>
          <a
            href="#vocab"
            className="flex min-h-11 items-center rounded-xl bg-white/80 px-4 py-2 text-sm text-[var(--ink)]"
          >
            المقاطع
          </a>
          <Link
            to="/settings"
            className="min-h-11 rounded-xl bg-white/80 px-4 py-2 text-sm text-[var(--ink)]"
          >
            الإعدادات
          </Link>
        </div>
      </div>
    </div>
  )
}
