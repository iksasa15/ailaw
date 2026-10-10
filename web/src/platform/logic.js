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

/** عبارات تنطقها العدسة بنفسها (ليست كلام المحامي). */
const SPOKEN_PROMPTS = ['وضع المحامي', 'وضع الشخص', 'احذر، حاجز قريب']
const normalizeArabic = (t) =>
  String(t || '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\u0600-\u06FF0-9\s]/g, ' ')
    .replace(/[،؟؛]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** كلمات النص (الأصلية ومطبّعتها للمقارنة: أ إ آ ٱ ← ا، ة ← ه، ى ← ي)؛ ما لا يبقى منه إلا علامات ترقيم يُسقَط */
const wordsOf = (text) =>
  String(text || '')
    .split(/\s+/)
    .map((word) => ({
      word,
      norm: normalizeArabic(word)
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ /g, ''),
    }))
    .filter((t) => t.norm)

/** موضع أول ظهور متتالٍ لـ `needle` داخل `hay` (كلمات كاملة مطبّعة)، أو -1 */
function indexOfRun(hay, needle) {
  if (!needle.length) return -1
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((n, k) => hay[i + k].norm === n.norm)) return i
  }
  return -1
}

const PROMPT_WORDS = SPOKEN_PROMPTS.map(wordsOf)
/** كلمات `words` هي بداية العبارة المنطوقة كلمةً كلمة (تنمو عبارة التنبيه كلمةً بعد كلمة) */
const isPromptStart = (words) =>
  PROMPT_WORDS.some((prompt) => words.length <= prompt.length && words.every((w, i) => w.norm === prompt[i].norm))

/**
 * هل `words` (كلام المحامي) صدى لعبارة الشخص `spoken`؟ عبارة من كلمتين فأكثر: كلمات متتالية إحداهما
 * داخل الأخرى. عبارة من كلمة واحدة («لا»، «نعم»): صدى فقط إن كان كلام المحامي هذه الكلمة بعينها،
 * فلا تُعدّ «لا تتحدث مع الطرف الآخر» صدى لـ«لا».
 */
const echoesPhrase = (words, spoken) =>
  spoken.length === 1
    ? words.length === 1 && words[0].norm === spoken[0].norm
    : indexOfRun(words, spoken) >= 0 || indexOfRun(spoken, words) >= 0

/**
 * على جهاز واحد يلتقط المايك ما تنطقه العدسة: عبارة «محامٍ» تطابق (أو جزء من) عبارة أشار بها
 * الشخص خلال `windowMs`، أو تنبيهاً منطوقاً، هي صدى وليست كلاماً. المطابقة بالكلمات الكاملة
 * وبعد توحيد الهمزة والتاء المربوطة والياء، فلا تُعدّ «الاوراق» صدى لـ«لا»، وتُعدّ «احتاج مساعده»
 * صدى لـ«أحتاج مساعدة».
 */
export function isEcho(entries, entry, windowMs = 10_000) {
  if (entry?.role !== 'lawyer') return false
  const words = wordsOf(entry.text)
  if (!words.length) return false
  if (isPromptStart(words)) return true
  return entries.some((e) => {
    if (e.role !== 'person' || entry.at < e.at || entry.at - e.at > windowMs) return false
    return echoesPhrase(words, wordsOf(e.text))
  })
}

/** كلمات `run` متتالية في `words` بدءاً من الموضع `at` */
const runAt = (words, run, at) => at >= 0 && run.every((r, k) => words[at + k]?.norm === r.norm)

/**
 * يُسقط صدى العدسة من عبارة «محامٍ»: ليست صدى ← العبارة نفسها. صدى كامل أو جزئي أو تنبيه منطوق
 * (كلام المحامي كله جزء من عبارة الشخص) ← `null`. وإن وردت عبارة الشخص في أول كلام أطول أو في
 * آخره (المحامي تكلم بعد الصدى أو قبله مباشرة) تُحذف منه، ويُحفظ الباقي إن بقيت كلمتان فأكثر وإلا
 * `null`. أما إن وردت في وسطه فقط فالمحامي يقتبس كلام الشخص («إذا التأمين رفض الدفع سنرفع دعوى»)
 * فتبقى العبارة نفسها. عبارة الشخص من كلمة واحدة لا تُحذف أبداً من جملة أطول (حذف «لا» يقلب
 * المعنى): هي صدى فقط حين تكون الجملة هي الكلمة نفسها، فيُسقَط الكل.
 */
export function removeEcho(entries, entry, windowMs = 10_000) {
  if (!isEcho(entries, entry, windowMs)) return entry
  const heard = wordsOf(entry.text)
  const phrases = entries
    .filter((e) => e.role === 'person' && entry.at >= e.at && entry.at - e.at <= windowMs)
    .map((e) => wordsOf(e.text))
  if (isPromptStart(heard) || phrases.some((phrase) => indexOfRun(phrase, heard) >= 0)) return null
  // حذف من الطرفين حتى لا يبقى صدى على أي منهما (صدى عبارتين متتاليتين بأي ترتيب)
  let words = heard
  let removed = false
  for (let again = true; again; ) {
    again = false
    for (const phrase of phrases) {
      if (phrase.length < 2 || phrase.length > words.length) continue
      if (runAt(words, phrase, 0)) words = words.slice(phrase.length)
      else if (runAt(words, phrase, words.length - phrase.length)) words = words.slice(0, -phrase.length)
      else continue
      removed = again = true
    }
  }
  if (!removed) return entry
  return words.length < 2 ? null : { ...entry, text: words.map((t) => t.word).join(' ') }
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
    'محضر جلسة — المحامون العرب',
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
