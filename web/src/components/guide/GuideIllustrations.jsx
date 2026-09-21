/** لوحات توضيحية بإيموجي لأقسام تعليمات الاستخدام */

function EmojiPanel({ emoji, title, subtitle, ariaLabel }) {
  return (
    <div
      className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-xl bg-[#152033] px-4 py-5 text-center ring-1 ring-white/10"
      role="img"
      aria-label={ariaLabel || title}
    >
      <span className="text-5xl leading-none" aria-hidden>
        {emoji}
      </span>
      {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
      {subtitle ? <p className="text-xs text-white/55">{subtitle}</p> : null}
    </div>
  )
}

export function SvgStart() {
  return (
    <EmojiPanel
      emoji="📷 🎤 ✅"
      title="الكاميرا والمايك"
      subtitle="اسمح بالصلاحيات قبل البدء"
      ariaLabel="قبل البدء"
    />
  )
}

export function SvgReceive() {
  return (
    <EmojiPanel
      emoji="🗣️ → 💬"
      title="كلام يتحول إلى نص"
      subtitle="الاستقبال يظهر الفقاعة على العدسة"
      ariaLabel="استقبال"
    />
  )
}

export function SvgSend() {
  return (
    <EmojiPanel
      emoji="✌️ → 🔊"
      title="أصابع ← جملة + صوت"
      subtitle="مثال: ٢ = كيف حالك؟"
      ariaLabel="إرسال"
    />
  )
}

export function SvgSafety() {
  return (
    <EmojiPanel
      emoji="🚧 → 🔊"
      title="حاجز قريب"
      subtitle="عند الاقتراب: صفير + تنبيه أحمر"
      ariaLabel="أمان"
    />
  )
}

export function SvgBadges() {
  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-xl bg-[#152033] p-3 ring-1 ring-white/10"
      role="img"
      aria-label="شارات التتبع"
    >
      {[
        { e: '👋', t: 'وجّه يدك' },
        { e: '🤏', t: 'ضعيف' },
        { e: '✋', t: 'متثبتة' },
      ].map((b) => (
        <div key={b.t} className="flex flex-col items-center gap-1 rounded-lg bg-[#dfe7ef] px-1 py-3">
          <span className="text-3xl" aria-hidden>
            {b.e}
          </span>
          <span className="text-[11px] font-semibold text-white/80">{b.t}</span>
        </div>
      ))}
    </div>
  )
}

export function SvgSettings() {
  return (
    <EmojiPanel
      emoji="⚙️ 📱"
      title="إعدادات مفيدة"
      subtitle="عتبة الثقة · حجم النص · الخادم"
      ariaLabel="إعدادات"
    />
  )
}

export function SvgHowToSend() {
  const steps = [
    { e: '☝️5ث', t: 'محامي' },
    { e: '✌️5ث', t: 'شخص' },
    { e: '🖐️', t: 'أصابع' },
    { e: '🔊', t: 'جملة' },
  ]
  return (
    <div
      className="flex items-center justify-between gap-1 rounded-xl bg-[#152033] px-3 py-4 ring-1 ring-white/10"
      role="img"
      aria-label="خطوات الإرسال والدور"
    >
      {steps.map((s) => (
        <div key={s.t} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-2xl leading-none" aria-hidden>
            {s.e}
          </span>
          <span className="text-[11px] font-semibold text-white">{s.t}</span>
        </div>
      ))}
    </div>
  )
}

export const SECTION_SVG = {
  start: SvgStart,
  receive: SvgReceive,
  send: SvgSend,
  safety: SvgSafety,
  badges: SvgBadges,
  settings: SvgSettings,
}
