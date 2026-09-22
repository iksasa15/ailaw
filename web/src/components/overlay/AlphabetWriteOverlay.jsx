import { LETTER_SIGN_CLIPS } from '../../data/signLexicon'

/** عرض الحرف المتعرَّف عليه والنص المكتوب على الشاشة */
export function AlphabetWriteOverlay({
  letter = null,
  text = '',
  pulse = false,
  visible = false,
  onClear,
  onBackspace,
  onSpace,
}) {
  if (!visible) return null
  const clip = letter?.letter ? LETTER_SIGN_CLIPS[letter.letter] : null

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[4.75rem] z-[28] flex flex-col items-center gap-2">
      <div
        className={`flex w-full max-w-md items-center gap-3 rounded-2xl bg-[rgba(21,32,51,0.92)] px-3 py-2.5 shadow-xl ring-1 ring-[rgba(196,92,38,0.4)] ${
          pulse ? 'sign-pulse' : ''
        }`}
      >
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
          {clip?.src ? (
            <img src={clip.src} alt={letter.letter} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-bold text-[var(--ink)]">
              {letter?.letter || '…'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[11px] font-semibold text-[#E8A078]">اكتب بالحروف · لغة الإشارة</p>
          <p className="mt-0.5 text-3xl font-black text-white">
            {letter?.letter || '—'}
            {letter?.confidence != null ? (
              <span className="mr-2 text-sm font-semibold text-white/45">
                {Math.round(letter.confidence * 100)}%
              </span>
            ) : null}
          </p>
          <p className="mt-1 line-clamp-2 text-base font-bold leading-6 text-white/95">
            {text || <span className="font-normal text-white/40">شكّل حرفاً باليد ليُكتب هنا</span>}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto flex gap-2">
        <button
          type="button"
          onClick={onSpace}
          className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
        >
          مسافة
        </button>
        <button
          type="button"
          onClick={onBackspace}
          className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
        >
          مسح حرف
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
        >
          مسح الكل
        </button>
      </div>
    </div>
  )
}
