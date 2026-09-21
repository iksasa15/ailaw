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
    <div className="app-bg flex h-full flex-col justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 flex justify-center" aria-hidden>
          <svg viewBox="0 0 88 40" className="h-12 w-28">
            <circle cx="28" cy="20" r="14" fill="none" stroke="#2F6FED" strokeWidth="3" />
            <circle cx="60" cy="20" r="14" fill="none" stroke="#C45C26" strokeWidth="3" />
            <path d="M42 20h4" stroke="#152033" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-brand text-center text-4xl font-bold leading-tight text-[var(--ink)]">
          النظارة الذكية
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-center text-base leading-7 text-[var(--muted)]">
          عدسة جوال تربط كلام المحامي بإشارات مرئية للصم — والعكس بصوت مسموع.
        </p>
      </div>
      <button type="button" onClick={finish} className="btn-primary min-h-12 w-full rounded-2xl text-lg">
        ابدأ الآن
      </button>
    </div>
  )
}
