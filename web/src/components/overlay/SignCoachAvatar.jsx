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
      className={`overflow-hidden rounded-2xl bg-[var(--panel)] ring-1 ring-[var(--panel-ring)] shadow-xl ${
        mode === 'panel' ? 'w-full' : 'w-full max-w-lg backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <p className="text-[11px] font-bold text-[var(--highlight)]">
          {isLetterMode ? 'تهجئة إشارة (أبجدية)' : 'مترجم الإشارة'}
        </p>
        {hasSign ? (
          <p className="text-[11px] text-white/55">
            {isLetterMode ? 'حرف' : 'إشارة'} {stepIdx + 1} من {clips.length}
          </p>
        ) : (
          <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
        )}
      </div>

      <div
        className={`relative overflow-hidden bg-[#0b1220] ${
          mode === 'panel' ? 'aspect-[4/3]' : 'aspect-[5/4]'
        }`}
      >
        {hasSign && current && !mediaMissing && isImage ? (
          <img
            key={`${current.src}-${stepIdx}`}
            src={current.src}
            alt={current.label}
            className="absolute inset-0 h-full w-full object-contain bg-white p-3"
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
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-4xl font-bold text-white">{current.label}</p>
            <p className="text-sm text-white/55">تعذّر تحميل صورة الحرف</p>
          </div>
        ) : null}

        {!hasSign ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(15,118,110,0.22)] text-3xl text-[var(--highlight)]">
              ◌
            </div>
            <p className="text-sm text-white/60">سيظهر هنا مترجم الإشارة</p>
          </div>
        ) : null}

        {hasSign && current && !mediaMissing ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <p className="text-center text-2xl font-bold text-white">{current.label}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 px-3 py-3 text-right">
        {hasSign ? (
          <>
            <p className="text-[11px] font-semibold text-white/50">
              {isLetterMode ? 'كلام خارج النص — تهجئة حرفاً حرفاً' : 'ترجمة كلام المحامي'}
            </p>
            <p className="text-base font-bold leading-6 text-white">{lawyerPhrase?.text}</p>
            {clips.length > 1 ? (
              <div className="flex max-h-24 flex-wrap justify-end gap-1 overflow-y-auto pt-1">
                {clips.map((c, i) => (
                  <button
                    key={`${c.label}-${i}`}
                    type="button"
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      i === stepIdx ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white/70'
                    }`}
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
