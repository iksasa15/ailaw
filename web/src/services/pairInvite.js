import { getApiBase, setApiBase } from './api'

/** Web path twin of iOS `ailaw://pair?...` */
export function makeWebPairPath(apiBase, role = 'person') {
  const api = (apiBase || getApiBase()).replace(/\/$/, '')
  const q = new URLSearchParams({ api, role })
  return `/pair?${q.toString()}`
}

export function makeWebPairURL(apiBase, role = 'person') {
  if (typeof window === 'undefined') return makeWebPairPath(apiBase, role)
  return `${window.location.origin}${makeWebPairPath(apiBase, role)}`
}

/** Same scheme as the iOS app — useful when the other phone runs Ailaw. */
export function makeAilawPairURL(apiBase, role = 'person') {
  const api = (apiBase || getApiBase()).replace(/\/$/, '')
  const q = new URLSearchParams({ api, role })
  return `ailaw://pair?${q.toString()}`
}

/**
 * Parse invite from:
 * - ailaw://pair?api=&role=
 * - /pair?api=&role= or full https URL
 * - plain http(s) API base (defaults role=person)
 */
export function parsePairInvite(raw) {
  const text = String(raw || '').trim()
  if (!text) return null

  if (text.startsWith('ailaw:') || text.includes('ailaw://')) {
    try {
      const q = text.includes('?') ? text.slice(text.indexOf('?') + 1) : ''
      const params = new URLSearchParams(q)
      const api = (params.get('api') || '').replace(/\/$/, '')
      const role = params.get('role') || 'person'
      if (!api) return null
      if (role !== 'lawyer' && role !== 'person') return null
      return { api, role }
    } catch {
      return null
    }
  }

  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const url = new URL(text, base)
    if (url.pathname.includes('/pair') || url.searchParams.has('api')) {
      const api = (url.searchParams.get('api') || '').replace(/\/$/, '')
      const role = url.searchParams.get('role') || 'person'
      if (api && (role === 'lawyer' || role === 'person')) return { api, role }
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (!url.pathname.includes('/pair') && !url.searchParams.has('role')) {
        return { api: `${url.origin}${url.pathname}`.replace(/\/$/, ''), role: 'person' }
      }
    }
  } catch {
    /* fall through */
  }

  if (/^https?:\/\//i.test(text)) {
    return { api: text.replace(/\/$/, ''), role: 'person' }
  }
  return null
}

export function applyPairInvite(invite, updateSettings) {
  if (!invite?.api) return null
  setApiBase(invite.api)
  updateSettings?.({
    apiBase: invite.api.replace(/\/$/, ''),
    onboarded: true,
  })
  return invite.role === 'lawyer' ? '/screen/lawyer' : '/screen/person'
}

export function qrImageURL(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}
