const DEFAULT_API = 'http://localhost:8000'

function defaultApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location
    // HTTPS LAN (phone): use Vite proxy → same origin /api
    if (protocol === 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${origin}/api`
    }
  }
  return DEFAULT_API
}

export function getApiBase() {
  return localStorage.getItem('apiBase') || defaultApiBase()
}

export function setApiBase(url) {
  localStorage.setItem('apiBase', url.replace(/\/$/, ''))
}

export function getWsBase() {
  const base = getApiBase()
  return base.replace(/^http/, 'ws')
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
