import { COURSES } from './courses'
import { courseProgress, dateKey } from './logic'

/** المحامي الأنسب لاستشارة فورية: متصل الآن، ليس في جلسة، تخصص مطابق، ثم يتقن الإشارة، ثم التقييم. */
export function pickInstantLawyer(lawyers, bookings, now, caseType) {
  const t = now.getTime()
  const busy = new Set(
    bookings
      .filter((b) => b.status === 'confirmed' && Math.abs(new Date(b.start).getTime() - t) < 30 * 60_000)
      .map((b) => b.lawyerId),
  )
  const free = lawyers.filter((l) => l.onlineNow && !busy.has(l.id))
  if (!free.length) return null
  const score = (l) => [l.specialties?.includes(caseType) ? 1 : 0, l.signFluent ? 1 : 0, l.rating || 0]
  return [...free].sort((a, b) => {
    const [sa, sb] = [score(a), score(b)]
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i]
    return 0
  })[0]
}

const done = (progress, courseId) => Object.keys(progress?.[courseId] || {}).length
const course = (id) => COURSES.find((c) => c.id === id)

/** أوسمة الشخص الأصم (p1) محسوبة من التقدّم والجلسات. */
export function earnedBadges(state, personId = 'p1') {
  const mine = (state.bookings || []).filter((b) => b.personId === personId)
  const pct = (id) => courseProgress(course(id), state.progress?.[id])
  const anyLesson = COURSES.some((c) => done(state.progress, c.id) > 0)
  return [
    { id: 'first-lesson', icon: 'sparkles', title: 'البداية', text: 'أول درس', earned: anyLesson },
    { id: 'ten-letters', icon: 'hand', title: 'عشرة حروف', text: '10 حروف بالإشارة', earned: done(state.progress, 'letters') >= 10 },
    { id: 'all-letters', icon: 'award', title: 'الأبجدية', text: 'كل الحروف', earned: pct('letters') === 100 },
    { id: 'words', icon: 'star', title: 'الكلمات', text: 'كلمات ArSL العشر', earned: pct('words') === 100 },
    { id: 'phrases', icon: 'message', title: 'لغة القضية', text: 'عبارات القضية', earned: pct('phrases') === 100 },
    { id: 'first-session', icon: 'video', title: 'أول جلسة', text: 'جلسة مكتملة', earned: mine.some((b) => b.status === 'completed') },
    { id: 'first-rating', icon: 'check', title: 'صوتك مسموع', text: 'قيّمت محامياً', earned: mine.some((b) => b.rating) },
  ]
}

/** رقم شهادة ثابت لكل دورة واسم: SG-LET-1A2B3C. */
export function certificateNumber(courseId, name) {
  let h = 2166136261
  for (const ch of `${courseId}:${name}`) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  return `SG-${courseId.slice(0, 3).toUpperCase()}-${(h & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`
}

const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - x.getDay()) // الأسبوع يبدأ الأحد
  return x
}

/** أرقام لوحة الأثر من الجلسات المكتملة فقط. */
export function impactStats(bookings, now, weeks = 8) {
  const completed = bookings.filter((b) => b.status === 'completed')
  const entries = completed.flatMap((b) => b.record?.entries || [])
  const thisWeek = startOfWeek(now)
  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - (weeks - 1 - i) * 7)
    return { start: dateKey(start), count: 0 }
  })
  for (const b of completed) {
    const key = dateKey(startOfWeek(new Date(b.start)))
    const week = perWeek.find((w) => w.start === key)
    if (week) week.count += 1
  }
  const types = new Map()
  for (const b of completed) types.set(b.caseType, (types.get(b.caseType) || 0) + 1)
  return {
    completed: completed.length,
    minutes: Math.round(completed.reduce((n, b) => n + (b.record?.durationSec || 0), 0) / 60),
    phrases: entries.length,
    signToVoice: entries.filter((e) => e.role === 'person').length,
    voiceToSign: entries.filter((e) => e.role === 'lawyer').length,
    perWeek,
    caseTypes: [...types.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, 'ar')),
  }
}
