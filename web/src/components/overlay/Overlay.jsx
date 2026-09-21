export function CaptionBubble({ text, partial, raised = false }) {
  const content = text || partial
  if (!content) return null
  return (
    <div
      className={`pointer-events-none absolute inset-x-3 z-20 ${
        raised ? 'bottom-44' : 'bottom-28'
      }`}
    >
      <div
        className="mx-auto max-w-xl rounded-2xl px-4 py-3.5 text-center shadow-lg ring-1 ring-white/10"
        style={{ background: 'var(--caption-bg, rgba(0,0,0,0.72))' }}
      >
        {text ? (
          <p
            className="font-bold leading-snug text-white"
            style={{ fontSize: 'calc(1.25rem * var(--font-scale, 1))' }}
          >
            {text}
          </p>
        ) : null}
        {partial ? (
          <p
            className={`leading-snug text-white/80 ${text ? 'mt-1.5' : 'font-semibold'}`}
            style={{ fontSize: text ? 'calc(0.95rem * var(--font-scale, 1))' : 'calc(1.15rem * var(--font-scale, 1))' }}
          >
            {partial}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function TrackingBadge({ quality }) {
  const map = {
    lost: { text: '👋 وجّه يدك', cls: 'bg-white/15 text-white' },
    weak: { text: '🤏 تتبع ضعيف', cls: 'bg-amber-400/90 text-[#1a1200]' },
    locked: { text: '✋ يد متثبتة', cls: 'bg-[#3ecf8e] text-[#062016]' },
  }
  const item = map[quality] || map.lost
  return (
    <div className="pointer-events-none absolute inset-x-4 top-[4.5rem] z-20 flex justify-center">
      <div
        className={`rounded-full px-3 py-1.5 text-sm font-semibold shadow-md transition-colors ${item.cls}`}
      >
        {item.text}
      </div>
    </div>
  )
}

/** شارة دور المحادثة: محامي / شخص + زر تبديل + تقدّم تثبيت الدور */
export function RoleBadge({ role, holdProgress = 0, pulse = false, onToggle }) {
  const isLawyer = role === 'lawyer'
  const label = isLawyer ? '⚖️ وضع المحامي' : '👤 وضع الشخص'
  const showingHold = holdProgress > 0.05 && holdProgress < 1
  const seconds = Math.min(5, Math.ceil(holdProgress * 5))

  return (
    <div className="pointer-events-none absolute inset-x-4 top-[7.25rem] z-20 flex flex-col items-center gap-1.5">
      <div className="pointer-events-auto flex items-center gap-2">
        <div
          className={`rounded-full px-3 py-1.5 text-sm font-semibold shadow-md transition-all ${
            isLawyer ? 'bg-[#5eb8ff] text-[#041018]' : 'bg-white/20 text-white'
          } ${pulse ? 'sign-pulse' : ''}`}
        >
          {label}
        </div>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="min-h-9 rounded-full bg-[#3ecf8e] px-3 py-1.5 text-sm font-bold text-[#062016] shadow-md"
          >
            🔄 تبديل
          </button>
        ) : null}
      </div>
      {showingHold ? (
        <div className="w-44 max-w-[70vw] overflow-hidden rounded-full bg-black/50 ring-1 ring-white/20">
          <div
            className="h-1.5 rounded-full bg-[#f5d76e] transition-[width] duration-100"
            style={{ width: `${Math.round(holdProgress * 100)}%` }}
          />
          <p className="px-2 py-1 text-center text-[11px] font-medium text-white/85">
            تثبيت الدور… {seconds}/5
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function HandGuide({ visible }) {
  if (!visible) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="hand-guide-frame relative h-[42vmin] w-[34vmin] max-h-[320px] max-w-[240px]">
        <div className="absolute inset-0 rounded-[28%] border-2 border-dashed border-white/45" />
        <p className="absolute inset-0 flex items-center justify-center text-5xl opacity-70" aria-hidden>
          🖐️
        </p>
        <p className="absolute -bottom-8 inset-x-0 text-center text-sm text-white/75">
          ضع راحة يدك هنا
        </p>
      </div>
    </div>
  )
}

export function SignBadge({ label, confidence, accepted, pulse, onReplay }) {
  if (!label) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6">
      <button
        type="button"
        onClick={() => {
          if (accepted && onReplay) onReplay()
        }}
        className={`pointer-events-auto max-w-[90vw] rounded-3xl px-8 py-5 text-center shadow-2xl transition-all duration-200 ${
          accepted
            ? `bg-[#3ecf8e] text-[#062016] opacity-100 ${pulse ? 'sign-pulse' : ''}`
            : 'bg-black/55 text-white/80 scale-[0.96] opacity-80'
        }`}
      >
        <p className={`font-bold leading-tight ${accepted ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
          {label}
        </p>
        {typeof confidence === 'number' && (
          <p className={`mt-2 font-medium ${accepted ? 'text-base opacity-80' : 'text-sm opacity-70'}`}>
            {(confidence * 100).toFixed(0)}%
            {!accepted ? ' · تخمين' : ' · اضغط لإعادة الصوت'}
          </p>
        )}
      </button>
    </div>
  )
}

export function AlertToast({ alert, onDismiss }) {
  if (!alert) return null
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="alert-flash absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 border-4 border-[#ff3b4e]"
    >
      <div className="rounded-2xl bg-[#ff3b4e] px-6 py-4 text-center text-white shadow-xl">
        <p className="text-2xl font-bold">🚨 تنبيه خطر</p>
        <p className="mt-1 text-lg">{alert.label}</p>
        <p className="mt-2 text-sm opacity-90">اضغط للإخفاء</p>
      </div>
    </button>
  )
}

export function AROverlay({ children }) {
  return <div className="pointer-events-none absolute inset-0 z-10">{children}</div>
}
