/** محادثة قضية: محامي ↔ شخص — عرض بإيموجي */

import { LAWYER_PHRASES, PERSON_PHRASES } from '../../hooks/useFingerPhrases'

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

function clipsFromMap(map, role) {
  return Object.entries(map).map(([num, display]) => {
    const number = Number(num)
    const twoHands = number > 5
    return {
      display,
      number,
      role,
      emoji: FINGER_EMOJI[number],
      how: [
        role === 'lawyer'
          ? 'تأكد أنك في وضع المحامي (ثبّت إصبعاً واحداً 5 ثوانٍ).'
          : 'تأكد أنك في وضع الشخص (ثبّت إصبعين 5 ثوانٍ).',
        twoHands
          ? `ارفع مجموع ${number} أصابع باليدين وثبّت.`
          : `ارفع ${number} أصابع وثبّت اليد.`,
        `ستظهر: «${number} · ${display}» ثم يُنطق الصوت.`,
      ],
    }
  })
}

export const LAWYER_CLIPS = clipsFromMap(LAWYER_PHRASES, 'lawyer')
export const PERSON_CLIPS = clipsFromMap(PERSON_PHRASES, 'person')

/** قائمة موحّدة للعرض (شخص أولاً ثم محامي) */
export const GESTURE_CLIPS = [...PERSON_CLIPS, ...LAWYER_CLIPS]

export function GestureArt({ name, number, emoji }) {
  const clip = GESTURE_CLIPS.find((c) => c.display === name && (number == null || c.number === number))
  const n = number || clip?.number || 1
  const face = emoji || clip?.emoji || FINGER_EMOJI[n] || '✋'
  return (
    <div
      className="flex h-full min-h-[9rem] w-full flex-col items-center justify-center gap-2 bg-[#dce9ee] gesture-nod"
      role="img"
      aria-label={name || `إشارة ${n}`}
    >
      <span className="text-6xl leading-none" aria-hidden>
        {face}
      </span>
      <span className="rounded-full bg-[rgba(15,118,110,0.14)] px-3 py-0.5 text-sm font-bold text-[var(--accent)]">
        {n}
      </span>
    </div>
  )
}

export function GestureClipCard({ clip }) {
  const twoHands = clip.number > 5
  const roleTag = clip.role === 'lawyer' ? 'محامي' : 'شخص'
  return (
    <article className="overflow-hidden rounded-2xl app-surface ring-1 ring-[var(--ring)]">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <GestureArt name={clip.display} number={clip.number} emoji={clip.emoji} />
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
          {roleTag} · رقم {clip.number}
        </span>
        <span className="absolute bottom-2 left-2 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">
          {twoHands ? `${clip.number} · يدين` : `${clip.number} أصابع`}
        </span>
      </div>
      <div className="space-y-2 px-3 py-3">
        <h3 className="text-lg font-bold text-[var(--accent)]">
          {clip.number} — {clip.display}
        </h3>
        <ol className="list-decimal space-y-1.5 pr-5 text-sm leading-6 text-[var(--muted)]">
          {clip.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </article>
  )
}
