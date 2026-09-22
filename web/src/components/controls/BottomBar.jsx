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
  title = null,
  subtitle = null,
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
  syncBadge = null,
}) {
  const btn = (active, onClick, label, disabled = false, tone = 'accent') => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-9 w-full items-center justify-center rounded-lg px-1.5 text-[11px] font-bold disabled:opacity-40 ${
        active
          ? tone === 'blue'
            ? 'bg-[var(--accent-2)] text-white'
            : 'bg-[var(--accent)] text-white'
          : 'bg-black/35 text-white/90 ring-1 ring-white/15'
      }`}
    >
      {active ? `${label} ●` : label}
    </button>
  )

  const label = STT_LABELS[sttStatus] || sttStatus
  const isBack = cameraFacing === 'environment'

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 top-0 z-30 px-2.5 pb-2"
      style={{
        paddingTop: 'max(0.45rem, env(safe-area-inset-top))',
        background:
          'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 70%, transparent 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-1.5">
        {title ? (
          <div className="flex items-start justify-between gap-2 px-0.5">
            <div className="min-w-0 text-right">
              <p className="font-brand text-sm font-bold text-white drop-shadow">{title}</p>
              {subtitle ? <p className="text-[11px] text-white/60">{subtitle}</p> : null}
            </div>
            {syncBadge}
          </div>
        ) : null}

        {/* صف 1 */}
        <div className="grid grid-cols-3 gap-1">
          {btn(receiveOn, onToggleReceive, 'استقبال')}
          {!dedicated ? btn(sendOn, onToggleSend, 'إرسال') : <div />}
          {btn(safetyOn, onToggleSafety, 'أمان')}
        </div>

        {/* صف 2 */}
        <div className="grid grid-cols-3 gap-1">
          {onToggleTranslate ? btn(translateOn, onToggleTranslate, 'ترجمة') : <div />}
          {onToggleLetters ? btn(lettersOn, onToggleLetters, 'حروف') : <div />}
          {onFlipCamera
            ? btn(isBack, onFlipCamera, isBack ? 'خلفية' : 'أمامية', false, 'blue')
            : <div />}
        </div>

        {/* صف 3 */}
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-9 w-full items-center justify-center rounded-lg bg-black/35 px-1.5 text-[11px] font-bold text-white ring-1 ring-white/15"
          >
            مسح
          </button>
          <div className="col-span-2 flex min-h-9 flex-col items-center justify-center rounded-lg bg-black/30 px-2 text-center ring-1 ring-white/10">
            <p
              className={`text-[10px] font-medium leading-tight ${
                sttStatus === 'error' ? 'text-[#ffb4bb]' : 'text-white/55'
              }`}
            >
              الاستقبال: {label}
            </p>
            {sttStatus === 'error' && sttError ? (
              <p className="mt-0.5 line-clamp-1 text-[9px] leading-3 text-[#ffb4bb]">{sttError}</p>
            ) : null}
            {sttStatus === 'error' && onRetryStt ? (
              <button
                type="button"
                onClick={onRetryStt}
                className="mt-0.5 text-[9px] font-bold text-white underline"
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
