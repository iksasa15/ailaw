import { useEffect, useMemo, useState } from 'react'
import { LAWYER_PHRASES } from '../../hooks/useFingerPhrases'

/**
 * أفتار أسفل الشاشة للشخص:
 * يعرض عبارة المحامي كنص واضح مع خطوات إشارة مختصرة.
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null }) {
  const [stepIdx, setStepIdx] = useState(0)

  const steps = useMemo(() => {
    if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null
    const n = Number(lawyerPhrase.fingers)
    const mapped =
      n >= 1 && n <= 10 ? LAWYER_PHRASES[n] : null
    const main = lawyerPhrase.text || mapped
    if (!main) return null
    const words = String(main)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
    if (words.length <= 1) return [{ label: main }]
    return words.map((label) => ({ label }))
  }, [lawyerPhrase])

  useEffect(() => {
    if (!visible || !steps?.length) return undefined
    setStepIdx(0)
    const id = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length)
    }, 1100)
    return () => window.clearInterval(id)
  }, [visible, steps, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  if (!visible) return null

  const hasLawyer = Boolean(steps?.length)
  const current = hasLawyer ? steps[stepIdx] || steps[0] : null
  const fingers = lawyerPhrase?.fingers

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[7.75rem] z-[25] flex justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1220]/92 px-3 py-3 ring-1 ring-[#3ecf8e]/30 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[#3ecf8e]">للشخص · ترجمة المحامي</p>
          {hasLawyer ? (
            <p className="truncate text-[11px] text-white/55">
              {fingers ? `${fingers} أصابع` : 'عبارة'}
            </p>
          ) : (
            <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
          )}
        </div>

        {hasLawyer ? (
          <div className="text-right">
            <p className="text-lg font-bold leading-7 text-white">{lawyerPhrase.text}</p>
            {current && steps.length > 1 ? (
              <p className="mt-2 text-sm font-semibold text-[#3ecf8e]">{current.label}</p>
            ) : null}
            {steps.length > 1 ? (
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={`${s.label}-${i}`}
                    className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                      i === stepIdx
                        ? 'bg-[#3ecf8e]/25 text-white ring-1 ring-[#3ecf8e]'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-white/75">
            عندما يرسل <strong className="text-white">المحامي</strong> عبارة تظهر هنا بوضوح للشخص.
          </p>
        )}
      </div>
    </div>
  )
}
