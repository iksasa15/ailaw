import { useEffect, useState } from 'react'
import { mergePhraseMap, PERSON_PHRASES, LAWYER_PHRASES } from '../../hooks/useFingerPhrases'

const FINGER_EMOJI = {
  1: '☝️',
  2: '✌️',
  3: '🤟',
  4: '🖖',
  5: '🖐️',
  6: '🖐️☝️',
  7: '🖐️✌️',
  8: '🖐️🤟',
  9: '🖐️🖖',
  10: '👐',
}

const HOW_HINT = {
  1: 'إصبع واحد (السبابة)',
  2: 'إصبعان معاً',
  3: 'ثلاثة أصابع',
  4: 'أربعة أصابع',
  5: 'كف مفتوح',
  6: 'يدين: 5 + 1',
  7: 'يدين: 5 + 2',
  8: 'يدين: 5 + 3',
  9: 'يدين: 5 + 4',
  10: 'اليدين العشر',
}

/**
 * أفتار أسفل الشاشة يشرح تقريبياً إشارة الأصابع (ليس ArSL حرفياً 100%).
 */
export function SignCoachAvatar({
  visible = false,
  role = 'person',
  phrases,
  activeFingers = null,
}) {
  const [step, setStep] = useState(1)

  const map =
    role === 'lawyer'
      ? mergePhraseMap(phrases, LAWYER_PHRASES)
      : mergePhraseMap(phrases, PERSON_PHRASES)

  useEffect(() => {
    if (!visible) return undefined
    if (activeFingers >= 1 && activeFingers <= 10) {
      setStep(activeFingers)
      return undefined
    }
    const id = window.setInterval(() => {
      setStep((n) => (n >= 10 ? 1 : n + 1))
    }, 2800)
    return () => window.clearInterval(id)
  }, [visible, activeFingers])

  if (!visible) return null

  const n = step
  const phrase = map[n] || ''
  const isPerson = role === 'person'
  const avatarFace = isPerson ? '🧑' : '👔'
  const title = isPerson ? 'شرح للشخص' : 'شرح للمحامي'

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[7.75rem] z-[25] flex justify-center">
      <div className="flex max-w-lg w-full items-center gap-3 rounded-2xl bg-[#0b1220]/88 px-3 py-2.5 ring-1 ring-white/15 shadow-xl backdrop-blur-sm">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#152033] ring-1 ring-[#3ecf8e]/35">
          <span className="text-3xl leading-none" aria-hidden>
            {avatarFace}
          </span>
          <span
            className="absolute -bottom-1 -left-1 rounded-full bg-black/70 px-1.5 text-xl leading-none gesture-nod"
            aria-hidden
          >
            {FINGER_EMOJI[n]}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-[11px] font-semibold text-[#3ecf8e]">
            {title} · تقريبي
          </p>
          <p className="truncate text-sm font-bold text-white">
            {n} — {phrase}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/65">
            {HOW_HINT[n]} · اتبع الصورة ثم ثبّت اليد
          </p>
        </div>

        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3ecf8e]/15 text-2xl"
          aria-hidden
        >
          {FINGER_EMOJI[n]}
        </div>
      </div>
    </div>
  )
}
