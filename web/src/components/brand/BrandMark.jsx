/**
 * شعار «المحامون العرب»: ثلاثة أشخاص (أزرق، برتقالي، بنفسجي) + الاسم.
 * على الخلفيات الداكنة نعرض الأشخاص فقط، لأن حروف الاسم داكنة.
 */
export function BrandMark({ height = 40, tone = 'brand', className = '' }) {
  const onDark = tone === 'white'
  return (
    <img
      src={onDark ? '/brand/logo-mark.png' : '/brand/logo-full.png'}
      alt="شعار المحامون العرب"
      style={{ height }}
      className={`w-auto max-w-full object-contain ${className}`}
      draggable="false"
    />
  )
}

/** أيقونة مربعة: الأشخاص الثلاثة على بطاقة بيضاء. */
export function BrandIcon({ size = 48, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[22%] bg-white shadow-[0_8px_24px_rgba(19,111,176,0.25)] ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/brand/logo-mark.png" alt="المحامون العرب" className="h-auto w-[80%]" draggable="false" />
    </span>
  )
}
