import { useEffect, useMemo, useState } from 'react'

/** تسلسل إشارة تقريبي لكل عبارة محامي — موجّه ليفهمه الشخص */
export const LAWYER_SIGN_SEQ = {
  1: [
    { emoji: '👔', label: 'محامي' },
    { emoji: '🫵', label: 'أنا لك' },
    { emoji: '🙏', label: 'تفضّل احكِ' },
  ],
  2: [
    { emoji: '❓', label: 'اسأل' },
    { emoji: '📋', label: 'تفاصيل' },
    { emoji: '⚖️', label: 'قضيتك' },
  ],
  3: [
    { emoji: '🕐', label: 'متى؟' },
    { emoji: '📅', label: 'الوقت' },
    { emoji: '👇', label: 'صار' },
  ],
  4: [
    { emoji: '❓', label: 'هل' },
    { emoji: '👀', label: 'شهود' },
    { emoji: '👥', label: 'معك؟' },
  ],
  5: [
    { emoji: '❓', label: 'أين' },
    { emoji: '🧾', label: 'دليل' },
    { emoji: '📷', label: 'إثبات؟' },
  ],
  6: [
    { emoji: '👀', label: 'أقرأ' },
    { emoji: '📄', label: 'أوراقك' },
    { emoji: '✅', label: 'حسناً' },
  ],
  7: [
    { emoji: '🤲', label: 'لا تخف' },
    { emoji: '🛡️', label: 'أحميك' },
    { emoji: '🫵', label: 'أدافع عنك' },
  ],
  8: [
    { emoji: '📎', label: 'نحتاج' },
    { emoji: '📄', label: 'أوراق' },
    { emoji: '➕', label: 'زيادة' },
  ],
  9: [
    { emoji: '✍️', label: 'اكتب' },
    { emoji: '📝', label: 'توقيع' },
    { emoji: '🙏', label: 'من فضلك' },
  ],
  10: [
    { emoji: '⚖️', label: 'قضية' },
    { emoji: '🔄', label: 'متابعة' },
    { emoji: '✅', label: 'مستمرة' },
  ],
}

const FALLBACK_SIGNS = [
  { emoji: '👐', label: 'إشارة' },
  { emoji: '💬', label: 'معنى' },
  { emoji: '👀', label: 'انظر' },
]

function signsForLawyerPhrase(fingers, text) {
  const n = Number(fingers)
  if (n >= 1 && n <= 10 && LAWYER_SIGN_SEQ[n]) return LAWYER_SIGN_SEQ[n]
  if (!text) return FALLBACK_SIGNS
  const parts = String(text)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
  if (!parts.length) return FALLBACK_SIGNS
  const icons = ['🖐️', '👀', '💬', '✅', '🙏']
  return parts.map((label, i) => ({ emoji: icons[i % icons.length], label }))
}

/**
 * أفتار أسفل الشاشة للشخص الأصم:
 * يترجم كلام المحامي إلى لغة إشارة تقريبية يفهمها.
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null }) {
  const [signIdx, setSignIdx] = useState(0)

  const signSeq = useMemo(() => {
    if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null
    return signsForLawyerPhrase(lawyerPhrase.fingers, lawyerPhrase.text)
  }, [lawyerPhrase])

  useEffect(() => {
    if (!visible || !signSeq?.length) return undefined
    setSignIdx(0)
    const id = window.setInterval(() => {
      setSignIdx((i) => (i + 1) % signSeq.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [visible, signSeq, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  if (!visible) return null

  const hasLawyer = Boolean(signSeq?.length)
  const current = hasLawyer ? signSeq[signIdx] || signSeq[0] : null

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[7.75rem] z-[25] flex justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1220]/92 px-3 py-3 ring-1 ring-[#3ecf8e]/30 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[#3ecf8e]">
            👤 للشخص · لغة إشارة (تقريبي)
          </p>
          {hasLawyer ? (
            <p className="truncate text-[11px] text-white/55">المحامي قال</p>
          ) : (
            <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
          )}
        </div>

        {hasLawyer ? (
          <div className="flex items-center gap-3">
            <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-[#152033] ring-2 ring-[#3ecf8e]/50">
              <span className="text-4xl leading-none gesture-nod" aria-hidden>
                {current.emoji}
              </span>
            </div>

            <div className="min-w-0 flex-1 text-right">
              <p className="text-base font-bold leading-6 text-white">{current.label}</p>
              <p className="mt-1 line-clamp-2 text-xs text-white/70">{lawyerPhrase.text}</p>
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {signSeq.map((s, i) => (
                  <span
                    key={`${s.label}-${i}`}
                    className={`rounded-lg px-1.5 py-0.5 text-lg leading-none ${
                      i === signIdx ? 'bg-[#3ecf8e]/25 ring-1 ring-[#3ecf8e]' : 'bg-white/5 opacity-50'
                    }`}
                    aria-hidden
                  >
                    {s.emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-[#152033] text-4xl ring-1 ring-white/15">
              🖐️
            </div>
            <p className="flex-1 text-right text-sm leading-6 text-white/75">
              عندما يتكلم <strong className="text-white">المحامي</strong> تظهر هنا إشارة يفهمها الشخص.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
