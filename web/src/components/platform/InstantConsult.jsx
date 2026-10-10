import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pickInstantLawyer } from '../../platform/features'
import { usePlatform } from '../../platform/PlatformContext'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const CASE_TYPES = ['مرور', 'تعويضات', 'أسرة', 'عمل', 'جنائي', 'عقود']

/** «محامٍ الآن»: اختيار نوع القضية ← البحث ← الربط بمحامٍ متصل ← فحص الجهاز والجلسة. */
function InstantDialog({ onClose }) {
  const { state, instant } = usePlatform()
  const navigate = useNavigate()
  const [caseType, setCaseType] = useState('مرور')
  const [step, setStep] = useState('choose')
  const [lawyer, setLawyer] = useState(null)
  const connected = useRef(false)

  useEffect(() => {
    if (step !== 'searching') return undefined
    const t = window.setTimeout(() => {
      const found = pickInstantLawyer(state.lawyers, state.bookings, new Date(), caseType)
      setLawyer(found)
      setStep(found ? 'found' : 'none')
    }, 2200)
    return () => window.clearTimeout(t)
  }, [step, caseType, state.lawyers, state.bookings])

  const connect = () => {
    if (connected.current) return
    connected.current = true
    const r = instant(lawyer.id, caseType)
    if (r.ok) navigate(`/app/session/${r.id}/check`)
  }

  useEffect(() => {
    if (step !== 'found') return undefined
    const t = window.setTimeout(connect, 1800)
    return () => window.clearTimeout(t)
    // connect يُنشئ الجلسة مرة واحدة عند انتهاء المؤقت
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="استشارة فورية">
      <button type="button" className="absolute inset-0 bg-[#0b1c24]/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="hero-bg px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-lg font-black">
              <Icon name="zap" size={20} className="text-amber-300" /> استشارة فورية
            </span>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label="إغلاق">
              <Icon name="x" size={20} />
            </button>
          </div>
          <p className="mt-1 text-sm text-white/75">محامٍ متصل الآن يدخل معك جلسة بترجمة فورية خلال ثوانٍ.</p>
        </div>

        <div className="p-6">
          {step === 'choose' ? (
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold text-[var(--muted)]">نوع قضيتك</div>
              <div className="grid grid-cols-3 gap-2">
                {CASE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCaseType(t)}
                    className={`min-h-11 rounded-2xl border font-bold ${caseType === t ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--ring)] hover:border-[var(--accent)]/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button size="lg" onClick={() => setStep('searching')}>
                <Icon name="zap" size={20} /> ابحث عن محامٍ الآن
              </Button>
            </div>
          ) : null}

          {step === 'searching' ? (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="relative flex size-28 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/25" />
                <span className="absolute inset-4 animate-ping rounded-full bg-[var(--accent)]/30 [animation-delay:300ms]" />
                <span className="relative flex size-16 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                  <Icon name="search" size={28} />
                </span>
              </div>
              <div className="text-center">
                <div className="text-lg font-black">نبحث عن محامٍ متاح الآن…</div>
                <div className="text-sm text-[var(--muted)]">قضية {caseType} · نفضّل من يتقن لغة الإشارة</div>
              </div>
            </div>
          ) : null}

          {step === 'found' && lawyer ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="relative">
                <Avatar name={lawyer.name} size={84} />
                <span className="absolute bottom-1 end-1 size-5 rounded-full border-[3px] border-white bg-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-600">تم الربط — متصل الآن</div>
                <div className="text-2xl font-black">{lawyer.name}</div>
                <div className="text-sm text-[var(--muted)]">{lawyer.title}</div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {lawyer.signFluent ? (
                  <Badge tone="accent">
                    <Icon name="hand" size={14} /> يتقن الإشارة
                  </Badge>
                ) : null}
                <Badge tone="amber">
                  <Icon name="star" size={14} /> {lawyer.rating}
                </Badge>
              </div>
              <Button size="lg" className="w-full" onClick={connect}>
                <Icon name="video" size={20} /> ادخل الآن
              </Button>
            </div>
          ) : null}

          {step === 'none' ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-lg font-black">لا يوجد محامٍ متاح في هذه اللحظة</div>
              <p className="text-[var(--muted)]">جميع المحامين المتصلين في جلسات. احجز أقرب موعد وسيصلك التأكيد.</p>
              <Button as={Link} to="/app/lawyers" onClick={onClose}>
                احجز موعداً
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function InstantConsultButton({ variant = 'pill' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {variant === 'banner' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-4 rounded-[24px] bg-gradient-to-l from-amber-400 to-orange-500 p-5 text-right text-[#3b1d00] shadow-[0_12px_30px_rgba(234,88,12,0.25)] transition hover:-translate-y-0.5"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/30">
            <Icon name="zap" size={28} />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-black">محامٍ الآن — استشارة فورية</span>
            <span className="block text-sm font-bold opacity-80">حالة عاجلة؟ نربطك بمحامٍ متصل خلال ثوانٍ، بترجمة إشارة فورية.</span>
          </span>
          <span className="hidden rounded-full bg-[#3b1d00] px-4 py-2 text-sm font-black text-white sm:block">ابدأ الآن ←</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-sm font-black text-[#3b1d00] hover:bg-amber-300"
        >
          <Icon name="zap" size={16} /> محامٍ الآن
        </button>
      )}
      {open ? <InstantDialog onClose={() => setOpen(false)} /> : null}
    </>
  )
}
