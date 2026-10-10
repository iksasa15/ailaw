/**
 * ربط جهاز ثانٍ بغرفة الجلسة عبر رمز QR: رابط الانضمام وما يحمله، وعناوين يصلها الجوال.
 */

const ROOM_RE = /^[a-zA-Z0-9_-]{4,32}$/
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

const hostOf = (origin) => {
  try {
    return new URL(origin).hostname
  } catch {
    return ''
  }
}

/** localhost لا يصله الجوال: يجب فتح المنصة من عنوان الشبكة. */
export function isLocalOrigin(origin) {
  return LOCAL_HOSTS.has(hostOf(origin))
}

/**
 * عنوان الخادم كما يراه الجوال:
 * - مسار وكيل التطوير (/api) ← عبر عنوان الموقع نفسه
 * - خادم على localhost ← نفس المنفذ على عنوان شبكة الموقع
 * - خادم خارجي (نفق) ← كما هو
 */
export function inviteApiBase(apiBase, siteOrigin) {
  const site = siteOrigin.replace(/\/$/, '')
  const raw = String(apiBase || '').trim().replace(/\/$/, '')
  if (!raw || raw.startsWith('/')) return `${site}${raw || '/api'}`
  try {
    const url = new URL(raw)
    if (url.pathname.replace(/\/$/, '') === '/api' && LOCAL_HOSTS.has(url.hostname)) return `${site}/api`
    if (LOCAL_HOSTS.has(url.hostname)) {
      url.hostname = hostOf(site)
      return url.toString().replace(/\/$/, '')
    }
    return raw
  } catch {
    return `${site}/api`
  }
}

/** رابط الانضمام الذي يحمله رمز QR. */
export function makeJoinUrl({ siteOrigin, api, room, role, booking }) {
  const q = new URLSearchParams({
    api,
    room,
    role,
    b: booking?.id || '',
    l: booking?.lawyerName || '',
    p: booking?.personName || '',
    c: booking?.caseType || '',
  })
  return `${siteOrigin.replace(/\/$/, '')}/join?${q.toString()}`
}

/** يقرأ رابط الانضمام؛ null لأي رابط ناقص أو غير آمن. */
export function parseJoinParams(params) {
  const api = (params.get('api') || '').replace(/\/$/, '')
  const room = params.get('room') || ''
  const role = params.get('role') || ''
  if (!/^https?:\/\//i.test(api) || !ROOM_RE.test(room) || (role !== 'person' && role !== 'lawyer')) return null
  return {
    api,
    room,
    role,
    bookingId: params.get('b') || '',
    lawyerName: params.get('l') || '',
    personName: params.get('p') || '',
    caseType: params.get('c') || '',
  }
}

/**
 * عناوين الخادم المحتملة بالترتيب: المحفوظ (قد يكون نفقاً قديماً)، ثم وكيل خادم التطوير (/api)،
 * ثم المنفذ 8000 على نفس الجهاز (لا يُجرّب من صفحة https لأن المتصفح يحجبه).
 */
export function serverCandidates(stored, location) {
  const list = [String(stored || '').replace(/\/$/, ''), `${location.origin}/api`]
  if (location.protocol === 'http:') list.push(`http://${location.hostname}:8000`)
  return [...new Set(list.filter(Boolean))]
}
