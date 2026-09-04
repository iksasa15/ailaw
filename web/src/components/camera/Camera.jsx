export function VideoFeed({ videoRef, mirrored = true }) {
  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      playsInline
      muted
      autoPlay
    />
  )
}

export function PermissionGate({ status, error, onRetry, children }) {
  if (status === 'ready') return children

  const messages = {
    idle: 'جاري التحضير…',
    requesting: 'يرجى السماح بالوصول إلى الكاميرا',
    denied: 'تم رفض صلاحية الكاميرا. فعّلها من إعدادات المتصفح ثم أعد المحاولة.',
    unsupported: 'هذا المتصفح لا يدعم getUserMedia.',
    error: error || 'حدث خطأ في فتح الكاميرا',
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0b1220] px-6 text-center">
      <p className="max-w-sm text-lg text-[#f4f7fb]">{messages[status] || messages.error}</p>
      {(status === 'denied' || status === 'error') && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl bg-[#3ecf8e] px-5 text-base font-semibold text-[#0b1220]"
        >
          إعادة المحاولة
        </button>
      )}
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
