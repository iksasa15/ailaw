const STT_LABELS = {
  idle: 'متوقف',
  connecting: 'يتصل…',
  listening: 'يستمع',
  error: 'خطأ',
  requesting: 'يطلب المايك…',
  ready: 'جاهز',
  denied: 'المايك مرفوض',
}

export function BottomBar({
  dedicated = false,
  receiveOn,
  sendOn,
  safetyOn,
  translateOn = true,
  lettersOn = false,
  onToggleReceive,
  onToggleSend,
  onToggleSafety,
  onToggleTranslate,
  onToggleLetters,
  cameraFacing = 'user',
  onFlipCamera,
  sttStatus,
  sttError,
  onRetryStt,
  onClear,
}) {
  const btn = (active, onClick, label, disabled = false, tone = 'accent') => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 min-w-[3.9rem] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-xs font-bold disabled:opacity-40 ${
        active
          ? tone === 'blue'
            ? 'bg-[var(--accent-2)] text-white shadow-md shadow-[var(--accent-2)]/30'
            : 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30'
          : 'bg-white/12 text-white ring-1 ring-white/10'
      }`}
    >
      {active ? `${label} ●` : label}
    </button>
  )

  const label = STT_LABELS[sttStatus] || sttStatus
  const isBack = cameraFacing === 'environment'

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-2 pt-10">
      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-1.5">
        {btn(receiveOn, onToggleReceive, 'استقبال')}
        {!dedicated ? btn(sendOn, onToggleSend, 'إرسال') : null}
        {btn(safetyOn, onToggleSafety, 'أمان')}
        {onToggleTranslate ? btn(translateOn, onToggleTranslate, 'ترجمة') : null}
        {onToggleLetters ? btn(lettersOn, onToggleLetters, 'حروف') : null}
        {onFlipCamera ? btn(isBack, onFlipCamera, isBack ? 'خلفية' : 'أمامية', false, 'blue') : null}
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10"
        >
          مسح
        </button>
      </div>
      <div className="mt-1.5 flex flex-col items-center gap-1 text-center">
        <p className={`text-[11px] ${sttStatus === 'error' ? 'text-[#ffb4bb]' : 'text-white/55'}`}>
          الاستقبال: {label}
        </p>
        {sttStatus === 'error' && sttError ? (
          <p className="max-w-sm text-[10px] leading-4 text-[#ffb4bb]">{sttError}</p>
        ) : null}
        {sttStatus === 'error' && onRetryStt ? (
          <button
            type="button"
            onClick={onRetryStt}
            className="mt-0.5 rounded-lg bg-white/15 px-3 py-1 text-[11px] text-white"
          >
            إعادة المحاولة
          </button>
        ) : null}
      </div>
    </div>
  )
}
