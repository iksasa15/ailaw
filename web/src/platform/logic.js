/**
 * منطق المنصة الصرف (بلا React ولا تخزين): المواعيد، حالات الحجز، المحضر، التقدّم.
 */

/** حالات تشغل الوقت عند المحامي. */
const OCCUPYING = new Set(['pending', 'confirmed', 'completed'])
/** الجلسة المؤكدة تبقى «جارية» ويمكن دخولها لهذه المدة بعد بدايتها. */
export const LIVE_WINDOW_MS = 60 * 60 * 1000

const pad = (n) => String(n).padStart(2, '0')
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * أوقات الحجز للأيام القادمة: توفر المحامي ناقص المحجوز ناقص الماضي.
 * يوم بلا توفر يعود بـ `slots: []`.
 */
export function availableSlots(lawyer, bookings, { from, days = 7, now }) {
  const taken = new Set(
    bookings
      .filter((b) => b.lawyerId === lawyer.id && OCCUPYING.has(b.status))
      .map((b) => new Date(b.start).getTime()),
  )
  const result = []
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const weekday = day.getDay()
    const hours = [...(lawyer.availability?.[weekday] || [])].sort((a, b) => a - b)
    const slots = hours
      .map((h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h))
      .filter((t) => t.getTime() > now.getTime() && !taken.has(t.getTime()))
      .map((t) => t.toISOString())
    result.push({ date: dateKey(day), weekday, slots })
  }
  return result
}

const TRANSITIONS = {
  pending: { accept: 'confirmed', decline: 'declined', cancel: 'cancelled' },
  confirmed: { complete: 'completed', cancel: 'cancelled' },
}

/** الانتقالات المسموحة فقط؛ غيرها يرمي `invalid-transition`. */
export function transition(booking, action) {
  const next = TRANSITIONS[booking.status]?.[action]
  if (!next) throw new Error('invalid-transition')
  return { ...booking, status: next }
}

const startMs = (b) => new Date(b.start).getTime()

/** قادمة (الأقرب أولاً) وسابقة (الأحدث أولاً). */
export function splitSessions(bookings, now) {
  const t = now.getTime()
  const upcoming = []
  const past = []
  for (const b of bookings) {
    const s = startMs(b)
    const isUpcoming =
      (b.status === 'pending' && s > t) || (b.status === 'confirmed' && t - s < LIVE_WINDOW_MS)
    ;(isUpcoming ? upcoming : past).push(b)
  }
  upcoming.sort((a, b) => startMs(a) - startMs(b))
  past.sort((a, b) => startMs(b) - startMs(a))
  return { upcoming, past }
}

export function nextSession(bookings, now) {
  return splitSessions(bookings, now).upcoming[0] || null
}

/** حذف التكرار المتتالي لنفس العبارة من نفس الدور. */
function dedupeConsecutive(entries) {
  const out = []
  for (const e of entries) {
    const last = out[out.length - 1]
    if (last && last.role === e.role && last.text === e.text) continue
    out.push(e)
  }
  return out
}

/**
 * يضيف عبارة إلى محادثة الجلسة. كلام المحامي يصل متنامياً («ماذا» ← «ماذا حدث»…)، فالجملة
 * الأطول تحلّ محل الجزء السابق بدل تكراره؛ نفس العبارة مرتين متتاليتين تُحفظ مرة.
 */
export function appendEntry(entries, entry) {
  const text = String(entry?.text || '').trim()
  if (!text) return entries
  const next = { ...entry, text }
  const last = entries[entries.length - 1]
  if (last && last.role === next.role) {
    if (last.text === text) return entries
    if (next.role === 'lawyer' && text.startsWith(last.text)) return [...entries.slice(0, -1), next]
  }
  return [...entries, next]
}

const uniqueTexts = (entries, role) => [...new Set(entries.filter((e) => e.role === role).map((e) => e.text))]

/** المحضر من سجل المحادثة. */
export function buildRecord(entries, startedAt, endedAt) {
  const clean = dedupeConsecutive(
    entries.filter((e) => e && (e.role === 'person' || e.role === 'lawyer') && String(e.text || '').trim()),
  )
  return {
    startedAt,
    endedAt,
    durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    entries: clean,
    summary: { facts: uniqueTexts(clean, 'person'), lawyerNotes: uniqueTexts(clean, 'lawyer') },
  }
}

const LOCALE = 'ar-SA-u-nu-latn-ca-gregory'
export const formatDate = (d) =>
  new Date(d).toLocaleDateString(LOCALE, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
export const formatTime = (d) => new Date(d).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
export const CHANNEL_LABELS = { sign: 'لغة الإشارة', text: 'الكتابة' }
const ROLE_NAMES = { person: 'الشخص', lawyer: 'المحامي' }

/** نص المحضر للتنزيل. */
export function recordToText({ booking, lawyer, person }) {
  const r = booking.record
  const lines = [
    'محضر جلسة — النظارة الذكية',
    `رقم الحجز: ${booking.id}`,
    `المحامي: ${lawyer?.name || '—'}`,
    `الموكّل: ${person?.name || '—'}`,
    `التاريخ: ${formatDate(booking.start)} ${formatTime(booking.start)}`,
    `نوع القضية: ${booking.caseType || '—'}`,
    `طريقة التواصل: ${CHANNEL_LABELS[booking.channel] || '—'}`,
    `المدة: ${Math.round((r?.durationSec || 0) / 60)} دقيقة`,
    '',
    'الوقائع:',
    ...(r?.summary.facts.length ? r.summary.facts.map((t) => `- ${t}`) : ['- لم تُسجَّل عبارات']),
    '',
    'أسئلة المحامي وتوجيهاته:',
    ...(r?.summary.lawyerNotes.length ? r.summary.lawyerNotes.map((t) => `- ${t}`) : ['- لم تُسجَّل عبارات']),
    '',
    'السجل الكامل:',
    ...(r?.entries || []).map((e) => `[${formatTime(e.at)}] ${ROLE_NAMES[e.role]}: ${e.text}`),
  ]
  return lines.join('\n')
}

/** نسبة إتمام دورة من خريطة دروسها المكتملة (`{ [lessonId]: true }`). */
export function courseProgress(course, done) {
  const total = course.lessons.length
  if (!total) return 0
  const count = course.lessons.filter((l) => done?.[l.id]).length
  return Math.round((count / total) * 100)
}
