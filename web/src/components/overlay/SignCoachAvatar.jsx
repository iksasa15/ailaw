import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveSignClips } from '../../data/signLexicon'

const LETTER_MS = 900
const VIDEO_FALLBACK_MS = 2800

/**
 * مترجم إشارة — فيديوهات السيناريو أو تهجئة أبجدية خارج النص.
 * mode: overlay | panel
 */
export function SignCoachAvatar({
  visible = false,
  lawyerPhrase = null,
  mode = 'overlay',
  spellLetters = false,
}) {
  const [stepIdx, setStepIdx] = useState(0)
  const [mediaMissing, setMediaMissing] = useState(false)
  const videoRef = useRef(null)
  const clips = useMemo(
    () => resolveSignClips(lawyerPhrase, { spellLetters }),
    [lawyerPhrase, spellLetters],
  )
  const hasSign = Boolean(clips?.length)
  const current = hasSign ? clips[stepIdx] || clips[0] : null
  const isLetterMode = clips?.some((c) => c.type === 'letter')
  const isImage = current?.type === 'letter' || current?.type === 'image'

  useEffect(() => {
    if (!visible || !clips?.length) return undefined
    setStepIdx(0)
    setMediaMissing(false)
    return undefined
  }, [visible, clips, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at, spellLetters])

  useEffect(() => {
    setMediaMissing(false)
    if (!current?.src || isImage) return undefined
    const el = videoRef.current
    if (!el) return undefined
    el.load()
    const play = el.play()
    if (play?.catch) play.catch(() => {})
    return undefined
  }, [current?.src, stepIdx, isImage])

  // Auto-advance for letter images (and video fallback if onEnded never fires)
  useEffect(() => {
    if (!visible || !clips?.length || !current) return undefined
    if (isImage || mediaMissing) {
      const id = window.setTimeout(() => {
        setStepIdx((i) => (i + 1) % clips.length)
      }, isImage ? LETTER_MS : VIDEO_FALLBACK_MS)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [visible, clips, current, stepIdx, isImage, mediaMissing])

  const advance = () => {
    if (!clips?.length) return
    setStepIdx((i) => (i + 1) % clips.length)
  }

  if (!visible) return null

  const stage = (
    <div
      className={`overflow-hidden rounded-xl bg-[var(--panel)] ring-1 ring-[var(--panel-ring)] shadow-lg ${
        mode === 'panel' ? 'w-full' : 'w-[9.5rem] backdrop-blur-sm'
      }`}
    >
      <div className={`flex items-center justify-between gap-1 ${mode === 'panel' ? 'px-3 pt-2.5' : 'px-2 pt-1.5'}`}>
        <p className={`font-bold text-[var(--highlight)] ${mode === 'panel' ? 'text-[11px]' : 'text-[9px]'}`}>
          {isLetterMode ? 'تهجئة' : 'مترجم'}
        </p>
        {hasSign ? (
          <p className={`text-white/55 ${mode === 'panel' ? 'text-[11px]' : 'text-[8px]'}`}>
            {stepIdx + 1}/{clips.length}
          </p>
        ) : mode === 'panel' ? (
          <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
        ) : null}
      </div>

      <div
        className={`relative overflow-hidden bg-[#0b1220] ${
          mode === 'panel' ? 'aspect-[4/3]' : 'aspect-square'
        }`}
      >
        {hasSign && current && !mediaMissing && isImage ? (
          <img
            key={`${current.src}-${stepIdx}`}
            src={current.src}
            alt={current.label}
            className={`absolute inset-0 h-full w-full object-contain bg-white ${mode === 'panel' ? 'p-3' : 'p-1.5'}`}
            onError={() => setMediaMissing(true)}
          />
        ) : null}

        {hasSign && current && !mediaMissing && !isImage ? (
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
            onError={() => setMediaMissing(true)}
            aria-label={current.label}
          />
        ) : null}

        {hasSign && current && mediaMissing ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
            <p className={`font-bold text-white ${mode === 'panel' ? 'text-4xl' : 'text-lg'}`}>{current.label}</p>
            {mode === 'panel' ? <p className="text-sm text-white/55">تعذّر تحميل صورة الحرف</p> : null}
          </div>
        ) : null}

        {!hasSign ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
            <div
              className={`flex items-center justify-center rounded-full bg-[rgba(15,118,110,0.22)] text-[var(--highlight)] ${
                mode === 'panel' ? 'h-20 w-20 text-3xl' : 'h-10 w-10 text-lg'
              }`}
            >
              ◌
            </div>
            {mode === 'panel' ? (
              <p className="text-sm text-white/60">سيظهر هنا مترجم الإشارة</p>
            ) : (
              <p className="text-[9px] leading-3 text-white/55">بانتظار الكلام</p>
            )}
          </div>
        ) : null}

        {hasSign && current && !mediaMissing ? (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent ${
              mode === 'panel' ? 'px-3 pb-3 pt-8' : 'px-1.5 pb-1.5 pt-4'
            }`}
          >
            <p className={`text-center font-bold text-white ${mode === 'panel' ? 'text-2xl' : 'text-xs'}`}>
              {current.label}
            </p>
          </div>
        ) : null}
      </div>

      {mode === 'panel' || hasSign ? (
        <div className={`space-y-1 text-right ${mode === 'panel' ? 'px-3 py-3' : 'px-1.5 py-1.5'}`}>
          {hasSign ? (
            <>
              {mode === 'panel' ? (
                <p className="text-[11px] font-semibold text-white/50">
                  {isLetterMode ? 'كلام خارج النص — تهجئة حرفاً حرفاً' : 'ترجمة كلام المحامي'}
                </p>
              ) : null}
              <p
                className={`font-bold text-white ${
                  mode === 'panel' ? 'text-base leading-6' : 'line-clamp-2 text-[10px] leading-3'
                }`}
              >
                {lawyerPhrase?.text}
              </p>
              {clips.length > 1 ? (
                <div
                  className={`flex flex-wrap justify-end gap-1 overflow-y-auto ${
                    mode === 'panel' ? 'max-h-24 pt-1' : 'max-h-10 pt-0.5'
                  }`}
                >
                  {clips.map((c, i) => (
                    <button
                      key={`${c.label}-${i}`}
                      type="button"
                      className={`rounded-md font-semibold ${
                        mode === 'panel' ? 'px-2 py-1 text-xs' : 'px-1 py-0.5 text-[8px]'
                      } ${i === stepIdx ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white/70'}`}
                      onClick={() => {
                        setMediaMissing(false)
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
              عبارات السيناريو تظهر كإشارات جاهزة. أي كلام{' '}
              <strong className="text-white">خارج النص</strong> يُهجَّأ بأبجدية لغة الإشارة.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )

  if (mode === 'panel') {
    return <div className="pointer-events-auto w-full">{stage}</div>
  }

  return (
    <div className="pointer-events-auto absolute bottom-24 end-3 z-[25]">
      {stage}
    </div>
  )
}
