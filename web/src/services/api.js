const DEFAULT_API = 'http://localhost:8000'

export function getApiBase() {
  return localStorage.getItem('apiBase') || import.meta.env.VITE_API_URL || DEFAULT_API
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
