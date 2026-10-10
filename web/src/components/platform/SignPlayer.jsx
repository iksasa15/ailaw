import { useEffect, useMemo, useState } from 'react'
import { resolveSignClips } from '../../data/signLexicon'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const LETTER_MS = 900

/**
 * يعرض قائمة عبارات بلغة الإشارة: فيديو لكل عبارة معروفة، وتهجئة حرفاً حرفاً لغيرها.
 * `phrases`: نصوص بالترتيب (توجيهات المحامي في المحضر).
 */
export function SignPlayer({ title, phrases, onClose }) {
  const [index, setIndex] = useState(0)
  const [clip, setClip] = useState(0)
  const clips = useMemo(() => resolveSignClips({ text: phrases[index] }) || [], [phrases, index])
  const current = clips[clip]
  const last = index === phrases.length - 1

  const nextClip = () => {
    if (clip + 1 < clips.length) setClip(clip + 1)
    else if (!last) {
      setIndex(index + 1)
      setClip(0)
    }
  }

  // الحروف صور: تتقدّم كل 0.9 ث. الفيديو يتقدّم عند انتهائه.
  useEffect(() => {
    if (!current || current.type === 'video') return undefined
    const t = window.setTimeout(nextClip, LETTER_MS)
    return () => window.clearTimeout(t)
  })

  const go = (i) => {
    setIndex(Math.max(0, Math.min(phrases.length - 1, i)))
    setClip(0)
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-[#0b1c24]/70 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#0b1630] text-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5">
          <div>
            <div className="text-sm font-bold text-[#f9bd29]">{title}</div>
            <div className="text-xs text-white/60 tabular-nums">
              العبارة {index + 1} من {phrases.length}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="إغلاق">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="m-5 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-black">
          {current?.type === 'video' ? (
            <video key={`${index}-${clip}`} src={current.src} autoPlay muted playsInline onEnded={nextClip} onError={nextClip} className="h-full w-full object-contain" />
          ) : current ? (
            <img key={`${index}-${clip}`} src={current.src} alt={current.label} className="h-full w-full object-contain p-6" />
          ) : (
            <span className="text-white/60">لا توجد إشارة لهذه العبارة</span>
          )}
        </div>
        <div className="px-6 text-center">
          <div className="text-2xl font-black leading-snug">{phrases[index]}</div>
          {current ? <div className="mt-1 text-sm font-bold text-[#f9bd29]">{current.type === 'video' ? current.label : `حرف ${current.label}`}</div> : null}
          <div className="mt-3 flex justify-center gap-1">
            {clips.map((c, i) => (
              <span key={`${c.src}-${i}`} className={`h-1.5 rounded-full transition-all ${i === clip ? 'w-6 bg-[#f9bd29]' : 'w-1.5 bg-white/25'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-5">
          <Button variant="dark" onClick={() => go(index - 1)} disabled={index === 0}>
            السابقة
          </Button>
          <Button variant="dark" onClick={() => go(index)}>
            <Icon name="play" size={16} /> إعادة
          </Button>
          <Button onClick={() => (last ? onClose() : go(index + 1))}>{last ? 'إنهاء' : 'التالية'}</Button>
        </div>
      </div>
    </div>
  )
}
