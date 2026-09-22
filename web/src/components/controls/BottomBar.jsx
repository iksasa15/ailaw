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
      className={`flex min-h-10 w-full items-center justify-center rounded-xl px-2 text-[12px] font-bold disabled:opacity-40 ${
        active
          ? tone === 'blue'
            ? 'bg-[var(--accent-2)] text-white'
            : tone === 'muted'
              ? 'bg-white/20 text-white'
              : 'bg-[var(--accent)] text-white'
          : 'bg-white/10 text-white/90 ring-1 ring-white/12'
      }`}
    >
      {active ? `${label} ●` : label}
    </button>
  )

  const label = STT_LABELS[sttStatus] || sttStatus
  const isBack = cameraFacing === 'environment'

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 px-3 pt-6"
      style={{
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-1.5">
        {/* صف 1: أوضاع العدسة */}
        <div className="grid grid-cols-3 gap-1.5">
          {btn(receiveOn, onToggleReceive, 'استقبال')}
          {!dedicated ? btn(sendOn, onToggleSend, 'إرسال') : <div />}
          {btn(safetyOn, onToggleSafety, 'أمان')}
        </div>

        {/* صف 2: أدوات */}
        <div className="grid grid-cols-3 gap-1.5">
          {onToggleTranslate ? btn(translateOn, onToggleTranslate, 'ترجمة') : <div />}
          {onToggleLetters ? btn(lettersOn, onToggleLetters, 'حروف') : <div />}
          {onFlipCamera
            ? btn(isBack, onFlipCamera, isBack ? 'خلفية' : 'أمامية', false, 'blue')
            : <div />}
        </div>

        {/* صف 3: مسح + حالة */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-10 w-full items-center justify-center rounded-xl bg-white/10 px-2 text-[12px] font-bold text-white ring-1 ring-white/12"
          >
            مسح
          </button>
          <div className="col-span-2 flex min-h-10 flex-col items-center justify-center rounded-xl bg-black/25 px-2 text-center ring-1 ring-white/8">
            <p className={`text-[11px] font-medium leading-tight ${sttStatus === 'error' ? 'text-[#ffb4bb]' : 'text-white/60'}`}>
              الاستقبال: {label}
            </p>
            {sttStatus === 'error' && sttError ? (
              <p className="mt-0.5 line-clamp-1 text-[10px] leading-3 text-[#ffb4bb]">{sttError}</p>
            ) : null}
            {sttStatus === 'error' && onRetryStt ? (
              <button
                type="button"
                onClick={onRetryStt}
                className="mt-0.5 text-[10px] font-bold text-white underline"
              >
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
