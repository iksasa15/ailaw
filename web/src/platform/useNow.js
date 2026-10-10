import { useEffect, useState } from 'react'

/** الوقت الحالي، يُحدَّث كل `intervalMs` (للعدّ التنازلي وحالة «جارية»). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

/** «تبدأ بعد 25 دقيقة» / «جارية الآن» / «غداً 10:00»… */
export function relativeStart(startIso, now) {
  const diff = new Date(startIso).getTime() - now.getTime()
  const min = Math.round(diff / 60_000)
  if (diff <= 0) return 'جارية الآن'
  if (min < 60) return `تبدأ بعد ${min} دقيقة`
  const hours = Math.round(min / 60)
  if (hours < 24) return `تبدأ بعد ${hours} ساعة`
  const days = Math.round(hours / 24)
  return days === 1 ? 'غداً' : `بعد ${days} أيام`
}
