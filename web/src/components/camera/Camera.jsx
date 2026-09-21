export function VideoFeed({ videoRef, mirrored = true }) {
  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 h-full w-full bg-black object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      playsInline
      webkit-playsinline="true"
      muted
      autoPlay
    />
  )
}

export function PermissionGate({ status, error, onRetry, children }) {
  const ready = status === 'ready'
  const messages = {
    idle: 'جاري التحضير…',
    requesting: 'يرجى السماح بالوصول إلى الكاميرا',
    denied: 'تم رفض صلاحية الكاميرا. فعّلها من إعدادات المتصفح ثم أعد المحاولة.',
    unsupported: 'الكاميرا تحتاج HTTPS على الجوال. افتح الرابط بصيغة https:// ثم اقبل التحذير مرة واحدة.',
    error: error || 'حدث خطأ في فتح الكاميرا',
  }

  return (
    <div className="absolute inset-0">
      {/* Always mount video so the stream can attach (iOS + React timing) */}
      {children}
      {!ready ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[rgba(21,32,51,0.92)] px-6 text-center">
          <p className="max-w-sm text-lg text-white">{messages[status] || messages.error}</p>
          {(status === 'denied' || status === 'error') && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-primary min-h-11 rounded-xl px-5 text-base"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function HandLandmarkCanvas({ canvasRef, mirrored = true }) {
  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${mirrored ? 'scale-x-[-1]' : ''}`}
      style={{ objectFit: 'cover' }}
    />
  )
}
