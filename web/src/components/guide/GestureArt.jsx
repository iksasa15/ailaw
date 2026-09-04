/** محادثة مرقّمة بالأصابع — عرض بإيموجي */

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

export const GESTURE_CLIPS = [
  {
    display: 'السلام عليكم',
    number: 1,
    emoji: FINGER_EMOJI[1],
    how: [
      'ارفع إصبعاً واحداً فقط (السبابة) — يد واحدة كافية.',
      'أبقِ باقي الأصابع مطوية وثبّت اليد.',
      'ستظهر في الوسط: «1 · السلام عليكم» ثم يُنطق الصوت.',
    ],
  },
  {
    display: 'كيف حالك؟',
    number: 2,
    emoji: FINGER_EMOJI[2],
    how: [
      'ارفع إصبعين (سبابة + وسطى).',
      'ثبّت اليد أمام الكاميرا.',
      'ستظهر: «2 · كيف حالك؟».',
    ],
  },
  {
    display: 'شكراً',
    number: 3,
    emoji: FINGER_EMOJI[3],
    how: [
      'ارفع ثلاثة أصابع.',
      'ثبّت الإشارة ثانيتين.',
      'ستظهر: «3 · شكراً».',
    ],
  },
  {
    display: 'مساعدة',
    number: 4,
    emoji: FINGER_EMOJI[4],
    how: [
      'ارفع أربعة أصابع.',
      'ثبّت اليد في منتصف الإطار.',
      'ستظهر: «4 · مساعدة».',
    ],
  },
  {
    display: 'مع السلامة',
    number: 5,
    emoji: FINGER_EMOJI[5],
    how: [
      'افتح الأصابع الخمسة كلها (يد واحدة).',
      'ثبّت اليد.',
      'ستظهر: «5 · مع السلامة».',
    ],
  },
  {
    display: 'نعم',
    number: 6,
    emoji: FINGER_EMOJI[6],
    how: [
      'استخدم يدين: مثلاً 5 + 1، أو أي مجموع = 6.',
      'أظهر اليدين معاً في الإطار وثبّتهما.',
      'ستظهر: «6 · نعم».',
    ],
  },
  {
    display: 'لا',
    number: 7,
    emoji: FINGER_EMOJI[7],
    how: [
      'يدين بمجموع 7 أصابع (مثل 5 + 2).',
      'ثبّت اليدين حتى يظهر القفل.',
      'ستظهر: «7 · لا».',
    ],
  },
  {
    display: 'من فضلك',
    number: 8,
    emoji: FINGER_EMOJI[8],
    how: [
      'مجموع 8 أصابع من اليدين (مثل 5 + 3).',
      'ثبّت الإشارة.',
      'ستظهر: «8 · من فضلك».',
    ],
  },
  {
    display: 'أنا آسف',
    number: 9,
    emoji: FINGER_EMOJI[9],
    how: [
      'مجموع 9 أصابع (مثل 5 + 4).',
      'ثبّت اليدين في المنتصف.',
      'ستظهر: «9 · أنا آسف».',
    ],
  },
  {
    display: 'أنا بخير',
    number: 10,
    emoji: FINGER_EMOJI[10],
    how: [
      'افتح اليدين العشر أصابع كلها.',
      'ثبّت اليدين معاً.',
      'ستظهر: «10 · أنا بخير».',
    ],
  },
]

export function GestureArt({ name, number, emoji }) {
  const clip = GESTURE_CLIPS.find((c) => c.display === name)
  const n = number || clip?.number || 1
  const face = emoji || clip?.emoji || FINGER_EMOJI[n] || '✋'
  return (
    <div
      className="flex h-full min-h-[9rem] w-full flex-col items-center justify-center gap-2 bg-[#152033] gesture-nod"
      role="img"
      aria-label={name || `إشارة ${n}`}
    >
      <span className="text-6xl leading-none" aria-hidden>
        {face}
      </span>
      <span className="rounded-full bg-[#3ecf8e]/20 px-3 py-0.5 text-sm font-bold text-[#3ecf8e]">
        {n}
      </span>
    </div>
  )
}

export function GestureClipCard({ clip }) {
  const twoHands = clip.number > 5
  return (
    <article className="overflow-hidden rounded-2xl bg-[#0b1220]/80 ring-1 ring-white/10">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <GestureArt name={clip.display} number={clip.number} emoji={clip.emoji} />
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white/90">
          رقم {clip.number}
        </span>
        <span className="absolute bottom-2 left-2 rounded-md bg-[#3ecf8e] px-2 py-0.5 text-[11px] font-bold text-[#062016]">
          {twoHands ? `${clip.number} · يدين` : `${clip.number} أصابع`}
        </span>
      </div>
      <div className="space-y-2 px-3 py-3">
        <h3 className="text-lg font-bold text-[#3ecf8e]">
          <span aria-hidden>{clip.emoji} </span>
          {clip.number} — {clip.display}
        </h3>
        <ol className="list-decimal space-y-1.5 pr-5 text-sm leading-6 text-white/80">
          {clip.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </article>
  )
}
