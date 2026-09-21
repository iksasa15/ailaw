import { useEffect, useMemo, useState } from 'react'
import { resolveSignClips } from '../../data/signLexicon'

/**
 * أفتار ترجمة بلغة إشارة مرئية (صور إشارات) — ليس عدّ أصابع.
 * mode: overlay | panel
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null, mode = 'overlay' }) {
  const [stepIdx, setStepIdx] = useState(0)
  const clips = useMemo(() => resolveSignClips(lawyerPhrase), [lawyerPhrase])
  const hasSign = Boolean(clips?.length)
  const current = hasSign ? clips[stepIdx] || clips[0] : null

  useEffect(() => {
    if (!visible || !clips?.length) return undefined
    setStepIdx(0)
    const id = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % clips.length)
    }, 1400)
    return () => window.clearInterval(id)
  }, [visible, clips, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  if (!visible) return null

  const stage = (
    <div
      className={`overflow-hidden rounded-2xl bg-[#0b1220] ring-1 ring-[#3ecf8e]/35 shadow-xl ${
        mode === 'panel' ? 'w-full' : 'w-full max-w-lg backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <p className="text-[11px] font-bold text-[#3ecf8e]">أفتار لغة الإشارة</p>
        {hasSign ? (
          <p className="text-[11px] text-white/55">
            إشارة {stepIdx + 1} من {clips.length}
          </p>
        ) : (
          <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
        )}
      </div>

      <div className={`relative bg-[#152033] ${mode === 'panel' ? 'aspect-[4/3]' : 'aspect-[5/4]'}`}>
        {hasSign && current ? (
          <img
            key={`${current.src}-${stepIdx}`}
            src={current.src}
            alt={current.label}
            className="h-full w-full object-contain p-2 sign-fade"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1e3a5f] text-4xl text-[#3ecf8e]">
              ◌
            </div>
            <p className="text-sm text-white/60">سيظهر هنا مترجم الإشارة</p>
          </div>
        )}
        {hasSign && current ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <p className="text-center text-lg font-bold text-white">{current.label}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 px-3 py-3 text-right">
        {hasSign ? (
          <>
            <p className="text-[11px] font-semibold text-white/50">ترجمة كلام المحامي</p>
            <p className="text-base font-bold leading-6 text-white">{lawyerPhrase?.text}</p>
            {clips.length > 1 ? (
              <div className="flex flex-wrap justify-end gap-1.5 pt-1">
                {clips.map((c, i) => (
                  <button
                    key={`${c.label}-${i}`}
                    type="button"
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      i === stepIdx
                        ? 'bg-[#3ecf8e] text-[#062016]'
                        : 'bg-white/10 text-white/70'
                    }`}
                    onClick={() => setStepIdx(i)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm leading-6 text-white/75">
            عندما يتكلم أو يرسل المحامي عبارة، تُعرض هنا <strong className="text-white">إشارات مرئية</strong>{' '}
            متتابعة — وليست أرقام أصابع.
          </p>
        )}
      </div>
    </div>
  )

  if (mode === 'panel') {
    return <div className="pointer-events-auto w-full">{stage}</div>
  }

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[7.25rem] z-[25] flex justify-center">
      {stage}
    </div>
  )
}
