import { BrandIcon, BrandMark } from '../components/brand/BrandMark'
import { Card, SectionTitle } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { COURSES } from '../platform/courses'

const DIRECTIONS = [
  ['ear', 'استقبال', 'كلام المحامي ← نص على العدسة ومترجم إشارة'],
  ['hand', 'إرسال', 'إشارة الشخص (أصابع، حروف، كلمات) ← صوت مسموع'],
  ['shield', 'أمان', 'صفارة أو حاجز قريب ← وميض وتنبيه'],
]
const TECH = [
  ['MediaPipe Hands', 'تتبع 21 نقطة لليد داخل المتصفح'],
  ['التعرف على الكلام', 'Web Speech API للعربية'],
  ['النطق', 'Speech Synthesis بصوت عربي'],
  ['React + Vite', 'منصة ويب تعمل على الجوال والحاسب'],
  ['تطبيق iOS أصلي', 'Vision + Speech + SoundAnalysis على الجهاز'],
]

export default function About() {
  const words = COURSES.find((c) => c.id === 'words').lessons
  return (
    <div className="flex flex-col gap-5">
      <div className="hero-bg flex flex-col items-center gap-4 rounded-[24px] px-6 py-10 text-center text-white">
        <BrandIcon size={84} />
        <h2 className="text-3xl font-black">النظارة الذكية</h2>
        <p className="max-w-2xl leading-8 text-white/80">
          عدسة واقع معزّز ومنصة عدالة للصم والبكم: تحوّل كلام المحامي إلى نص وإشارة، وإشارة الشخص إلى صوت،
          وتنظّم الجلسات من الحجز حتى المحضر.
        </p>
        <BrandMark height={46} tone="white" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="الاتجاهات الثلاثة" />
          <ul className="flex flex-col gap-3">
            {DIRECTIONS.map(([icon, title, text]) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--accent)]">
                  <Icon name={icon === 'ear' ? 'mic' : icon} size={20} />
                </span>
                <div>
                  <div className="font-black">{title}</div>
                  <div className="text-sm text-[var(--muted)]">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle title="التقنية" />
          <ul className="flex flex-col gap-2">
            {TECH.map(([name, text]) => (
              <li key={name} className="flex justify-between gap-3 border-b border-[var(--ring)] py-2 last:border-0">
                <span className="font-bold">{name}</span>
                <span className="text-left text-sm text-[var(--muted)]">{text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <SectionTitle title="مفردات ArSL" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {words.map((w) => (
            <figure key={w.id} className="rounded-2xl bg-[var(--bg)] p-2 text-center">
              <img src={w.image} alt={w.title} className="h-24 w-full rounded-xl object-contain" loading="lazy" />
              <figcaption className="mt-1 text-sm font-bold">{w.title}</figcaption>
            </figure>
          ))}
        </div>
      </Card>
    </div>
  )
}
