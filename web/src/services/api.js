const DEFAULT_API = 'http://localhost:8000'

/** True when running Vite HTTPS with the local /api → :8000 proxy. */
export function hasLocalApiProxy() {
  return Boolean(import.meta.env.DEV)
}

/** Same-origin Vite proxy path used in local HTTPS so camera + WS stay secure. */
function proxyApiBase() {
  if (typeof window === 'undefined') return '/api'
  return `${window.location.origin}/api`
}

function isInsecureHttp(url) {
  try {
    return new URL(url).protocol === 'http:'
  } catch {
    return String(url || '').startsWith('http://')
  }
}

function isSameOriginApi(url) {
  if (typeof window === 'undefined') return false
  try {
    const u = new URL(url, window.location.origin)
    const path = u.pathname.replace(/\/$/, '')
    return u.origin === window.location.origin && (path === '/api' || path.endsWith('/api'))
  } catch {
    return false
  }
}

function defaultApiBase() {
  if (import.meta.env.VITE_API_URL) return String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  // Local Vite HTTPS only — production hosts (Vercel) have no /api backend.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && hasLocalApiProxy()) {
    return proxyApiBase()
  }
  return DEFAULT_API
}

/**
 * On HTTPS pages, block plain http:// backends (mixed content).
 * Allow https:// tunnels (ngrok / Cloudflare) and same-origin /api in Vite only.
 */
function shouldForceProxy(url) {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') return false
  if (!hasLocalApiProxy()) return false
  if (!url) return true
  if (isInsecureHttp(url)) return true
  try {
    const u = new URL(url, window.location.origin)
    if (u.origin !== window.location.origin) {
      // External https:// is fine (tunnel). External http:// already caught above.
      return false
    }
    if (!u.pathname.replace(/\/$/, '').endsWith('/api') && u.pathname.replace(/\/$/, '') !== '/api') {
      return u.port === '8000' || u.pathname === '' || u.pathname === '/'
    }
  } catch {
    return true
  }
  return false
}

export function getApiBase() {
  const stored = (localStorage.getItem('apiBase') || '').replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    // Production: do not silently rewrite to useless same-origin /api
    if (!hasLocalApiProxy()) {
      if (stored && isSameOriginApi(stored)) return stored
      return stored || (import.meta.env.VITE_API_URL || '')
    }
    if (shouldForceProxy(stored)) {
      const proxy = proxyApiBase()
      if (stored !== proxy) {
        try {
          localStorage.setItem('apiBase', proxy)
        } catch {
          /* ignore */
        }
      }
      return proxy
    }
  }
  return stored || defaultApiBase()
}

export function setApiBase(url) {
  let next = String(url || '').trim().replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && shouldForceProxy(next)) {
    next = proxyApiBase()
  }
  localStorage.setItem('apiBase', next)
}

export function getWsBase() {
  const base = getApiBase()
  if (base.startsWith('https://')) return `wss://${base.slice('https://'.length)}`
  if (base.startsWith('http://')) return `ws://${base.slice('http://'.length)}`
  if (base.startsWith('/')) {
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173'
    return `${proto}//${host}${base}`
  }
  return base.replace(/^https/, 'wss').replace(/^http/, 'ws')
}

async function readJsonOrThrow(res, label) {
  const text = await res.text()
  const trimmed = text.trim()
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
    throw new Error(
      'هذا العنوان واجهة فقط وليس Backend. شغّل الخادم محلياً أو ضع رابط نفق HTTPS (ngrok / Cloudflare Tunnel).',
    )
  }
  if (!res.ok) throw new Error(`${label} failed`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: استجابة غير JSON`)
  }
}

export async function checkHealth() {
  const base = getApiBase()
  if (!base) {
    throw new Error('لم يُحدد عنوان الخادم. ضع رابط Backend (نفق HTTPS) ثم احفظ.')
  }
  const res = await fetch(`${base}/health`)
  return readJsonOrThrow(res, 'health')
}

export async function postStt(blob, language = 'ar') {
  const form = new FormData()
  form.append('file', blob, 'audio.webm')
  form.append('language', language)
  const res = await fetch(`${getApiBase()}/stt`, { method: 'POST', body: form })
  return readJsonOrThrow(res, 'stt')
}

export async function predictArsl(landmarks, threshold) {
  const res = await fetch(`${getApiBase()}/arsl/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landmarks, threshold }),
  })
  return readJsonOrThrow(res, 'arsl')
}

export async function fetchVocab() {
  const res = await fetch(`${getApiBase()}/arsl/vocab`)
  return readJsonOrThrow(res, 'vocab')
}

export async function classifyAmbient(blob) {
  const form = new FormData()
  form.append('file', blob, 'ambient.webm')
  const res = await fetch(`${getApiBase()}/ambient`, { method: 'POST', body: form })
  return readJsonOrThrow(res, 'ambient')
}

export async function publishScenePhrase({ role, text, fingers, room }) {
  const res = await fetch(`${getApiBase()}/scene/phrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, text, fingers, room: room || undefined }),
  })
  return readJsonOrThrow(res, 'scene publish')
}

export async function fetchLawyerScene(room) {
  const q = room ? `?room=${encodeURIComponent(room)}` : ''
  const res = await fetch(`${getApiBase()}/scene/lawyer${q}`)
  return readJsonOrThrow(res, 'scene lawyer')
}

export async function fetchPersonScene(room) {
  const q = room ? `?room=${encodeURIComponent(room)}` : ''
  const res = await fetch(`${getApiBase()}/scene/person${q}`)
  return readJsonOrThrow(res, 'scene person')
}

export async function createSceneRoom() {
  const res = await fetch(`${getApiBase()}/scene/room`, { method: 'POST' })
  return readJsonOrThrow(res, 'scene room')
}

/** Local fallback room id when backend create fails. */
export function makeLocalRoomId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length]
  return out
}
