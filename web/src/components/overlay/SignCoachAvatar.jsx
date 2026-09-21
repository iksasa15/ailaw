import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveSignClips } from '../../data/signLexicon'

/**
 * مترجم إشارة مرئي — مقاطع فيديو حقيقية متتابعة لشخص يوقّع.
 * mode: overlay | panel
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null, mode = 'overlay' }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [videoMissing, setVideoMissing] = useState(false)
  const videoRef = useRef(null)
  const clips = useMemo(() => resolveSignClips(lawyerPhrase), [lawyerPhrase])
  const hasSign = Boolean(clips?.length)
  const current = hasSign ? clips[stepIdx] || clips[0] : null

  useEffect(() => {
    if (!visible || !clips?.length) return undefined
    setStepIdx(0)
    setVideoMissing(false)
    return undefined
  }, [visible, clips, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  useEffect(() => {
    setVideoMissing(false)
    const el = videoRef.current
    if (!el || !current?.src) return undefined
    el.load()
    const play = el.play()
    if (play?.catch) play.catch(() => {})
    return undefined
  }, [current?.src, stepIdx])

  const advance = () => {
    if (!clips?.length) return
    setStepIdx((i) => (i + 1) % clips.length)
  }

  if (!visible) return null

  const stage = (
    <div
      className={`overflow-hidden rounded-2xl bg-[rgba(21,32,51,0.92)] ring-1 ring-[rgba(196,92,38,0.35)] shadow-xl ${
        mode === 'panel' ? 'w-full' : 'w-full max-w-lg backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <p className="text-[11px] font-bold text-[#E8A078]">مترجم الإشارة</p>
        {hasSign ? (
          <p className="text-[11px] text-white/55">
            إشارة {stepIdx + 1} من {clips.length}
          </p>
        ) : (
          <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
        )}
      </div>

      <div className={`relative overflow-hidden bg-[#0b1220] ${mode === 'panel' ? 'aspect-[4/3]' : 'aspect-[5/4]'}`}>
        {hasSign && current && !videoMissing ? (
          <video
            key={`${current.src}-${stepIdx}`}
            ref={videoRef}
            src={current.src}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            preload="auto"
            onEnded={advance}
            onError={() => setVideoMissing(true)}
            aria-label={current.label}
          />
        ) : null}

        {hasSign && current && videoMissing ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-semibold text-white/80">فيديو الإشارة غير متوفر</p>
            <p className="text-xs text-white/45">{current.label}</p>
            <p className="max-w-[16rem] text-[11px] leading-5 text-white/35">
              ضع الملف في public/signs/videos ثم أعد التحميل
            </p>
            {clips.length > 1 ? (
              <button
                type="button"
                className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80"
                onClick={() => {
                  setVideoMissing(false)
                  advance()
                }}
              >
                المقطع التالي
              </button>
            ) : null}
          </div>
        ) : null}

        {!hasSign ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#243552] text-3xl text-[#E8A078]">
              ◌
            </div>
            <p className="text-sm text-white/60">سيظهر هنا مترجم الإشارة</p>
          </div>
        ) : null}

        {hasSign && current && !videoMissing ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
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
                      i === stepIdx ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white/70'
                    }`}
                    onClick={() => {
                      setVideoMissing(false)
                      setStepIdx(i)
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm leading-6 text-white/75">
            عندما يتكلم أو يرسل المحامي عبارة، تُعرض هنا{' '}
            <strong className="text-white">فيديوهات إشارة حقيقية</strong> متتابعة.
          </p>
        )}
      </div>
    </div>
  )

  if (mode === 'panel') {
    return <div className="pointer-events-auto w-full">{stage}</div>
  }

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[6.5rem] z-[25] flex justify-center">
      {stage}
    </div>
  )
}
