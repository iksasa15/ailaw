const DEFAULT_API = 'http://localhost:8000'

/** Same-origin Vite proxy path used on HTTPS so camera + WS stay secure. */
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

function defaultApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return proxyApiBase()
  }
  return DEFAULT_API
}

/**
 * On HTTPS pages, never use raw http:// API (mixed content blocks fetch/WebSocket).
 * Auto-upgrade to the Vite /api proxy instead.
 */
export function getApiBase() {
  const stored = (localStorage.getItem('apiBase') || '').replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (!stored || isInsecureHttp(stored)) {
      const proxy = proxyApiBase()
      // Persist so Settings / pairing show the working URL
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
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && isInsecureHttp(next)) {
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
  // Fallback: legacy replace (https → wss via http match)
  return base.replace(/^https/, 'wss').replace(/^http/, 'ws')
}

export async function checkHealth() {
  const res = await fetch(`${getApiBase()}/health`)
  if (!res.ok) throw new Error('health failed')
  return res.json()
}

export async function postStt(blob, language = 'ar') {
  const form = new FormData()
  form.append('file', blob, 'audio.webm')
  form.append('language', language)
  const res = await fetch(`${getApiBase()}/stt`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('stt failed')
  return res.json()
}

export async function predictArsl(landmarks, threshold) {
  const res = await fetch(`${getApiBase()}/arsl/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landmarks, threshold }),
  })
  if (!res.ok) throw new Error('arsl failed')
  return res.json()
}

export async function fetchVocab() {
  const res = await fetch(`${getApiBase()}/arsl/vocab`)
  if (!res.ok) throw new Error('vocab failed')
  return res.json()
}

export async function classifyAmbient(blob) {
  const form = new FormData()
  form.append('file', blob, 'ambient.webm')
  const res = await fetch(`${getApiBase()}/ambient`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('ambient failed')
  return res.json()
}

export async function publishScenePhrase({ role, text, fingers }) {
  const res = await fetch(`${getApiBase()}/scene/phrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, text, fingers }),
  })
  if (!res.ok) throw new Error('scene publish failed')
  return res.json()
}

export async function fetchLawyerScene() {
  const res = await fetch(`${getApiBase()}/scene/lawyer`)
  if (!res.ok) throw new Error('scene lawyer failed')
  return res.json()
}

export async function fetchPersonScene() {
  const res = await fetch(`${getApiBase()}/scene/person`)
  if (!res.ok) throw new Error('scene person failed')
  return res.json()
}
