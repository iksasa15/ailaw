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
  onToggleReceive,
  onToggleSend,
  onToggleSafety,
  cameraFacing = 'user',
  onFlipCamera,
  sttStatus,
  sttError,
  onRetryStt,
  onClear,
}) {
  const btn = (active, onClick, label, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 min-w-[4.25rem] flex-col items-center justify-center rounded-xl px-2.5 py-1.5 text-sm font-semibold disabled:opacity-40 ${
        active ? 'bg-[#3ecf8e] text-[#062016]' : 'bg-white/15 text-white'
      }`}
    >
      {active ? `${label} ●` : label}
    </button>
  )

  const label = STT_LABELS[sttStatus] || sttStatus
  const isBack = cameraFacing === 'environment'

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-2">
        {btn(receiveOn, onToggleReceive, 'استقبال')}
        {!dedicated ? btn(sendOn, onToggleSend, 'إرسال') : null}
        {btn(safetyOn, onToggleSafety, 'أمان')}
        {onFlipCamera ? (
          <button
            type="button"
            onClick={onFlipCamera}
            className={`flex min-h-11 min-w-[4.25rem] flex-col items-center justify-center rounded-xl px-2.5 py-1.5 text-sm font-semibold ${
              isBack ? 'bg-[#5eb8ff] text-[#041018]' : 'bg-white/15 text-white'
            }`}
          >
            {isBack ? 'خلفية ●' : 'أمامية'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 text-sm text-white"
        >
          مسح
        </button>
      </div>
      <div className="mt-2 flex flex-col items-center gap-1 text-center">
        <p className={`text-xs ${sttStatus === 'error' ? 'text-[#ff8a95]' : 'text-white/60'}`}>
          الاستقبال: {label}
        </p>
        {sttStatus === 'error' && sttError ? (
          <p className="max-w-sm text-[11px] leading-4 text-[#ffb4bb]">{sttError}</p>
        ) : null}
        {sttStatus === 'error' && onRetryStt ? (
          <button
            type="button"
            onClick={onRetryStt}
            className="mt-0.5 rounded-lg bg-white/15 px-3 py-1 text-xs text-white"
          >
            إعادة المحاولة
          </button>
        ) : null}
      </div>
    </div>
  )
}
