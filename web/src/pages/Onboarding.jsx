import { useNavigate } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'

export default function Onboarding() {
  const navigate = useNavigate()
  const { update } = useSettings()

  function finish() {
    update({ onboarded: true })
    navigate('/', { replace: true })
  }

  return (
    <div className="app-bg relative flex h-full flex-col justify-between overflow-hidden px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2.75rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(70% 50% at 50% 0%, rgba(15,118,110,0.18), transparent 60%), radial-gradient(50% 40% at 90% 80%, rgba(30,91,184,0.12), transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justifying-center text-center">
        <div
          className="mb-7 flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-white/80 shadow-[0_12px_36px_rgba(15,118,110,0.18)] ring-1 ring-white/90"
          aria-hidden
        >
          <svg viewBox="0 0 88 40" className="h-9 w-20">
            <circle cx="28" cy="20" r="14" fill="none" stroke="var(--accent-2)" strokeWidth="3.2" />
            <circle cx="60" cy="20" r="14" fill="none" stroke="var(--accent)" strokeWidth="3.2" />
            <path d="M42 20h4" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>

        <p className="text-xs font-bold tracking-wide text-[var(--accent)]">عدسة مساعدة للصم</p>
        <h1 className="font-brand mt-2 text-[2.65rem] font-bold leading-[1.15] text-[var(--ink)]">
          النظارة الذكية
        </h1>
        <p className="mx-auto mt-4 max-w-[17rem] text-[0.95rem] leading-7 text-[var(--muted)]">
          كلام المحامي يصبح إشارة مرئية — وإشارتك تُسمَع صوتاً واضحاً.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        <button
          type="button"
          onClick={finish}
          className="btn-primary min-h-12 w-full rounded-2xl text-lg transition active:scale-[0.98]"
        >
          ابدأ الآن
        </button>
        <p className="text-center text-[11px] text-[var(--muted)]">يعمل على الجوال كعدسة AR خفيفة</p>
      </div>
    </div>
  )
}
