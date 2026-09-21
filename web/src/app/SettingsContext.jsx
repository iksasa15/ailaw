import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LAWYER_PHRASES, PERSON_PHRASES, mergePhraseMap } from '../hooks/useFingerPhrases'

const SettingsContext = createContext(null)

const PHRASE_PACK = 'case-story-v1'

const DEFAULTS = {
  apiBase: '',
  roomId: '',
  language: 'ar',
  fontScale: 1,
  overlayOpacity: 0.55,
  confidence: 0.38,
  receiveEnabled: true,
  sendEnabled: true,
  safetyEnabled: true,
  arslEnabled: false,
  onboarded: false,
  phrasePack: PHRASE_PACK,
  lawyerPhrases: { ...LAWYER_PHRASES },
  personPhrases: { ...PERSON_PHRASES },
}

function load() {
  try {
    const raw = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('sg-settings') || '{}') }
    const packChanged = raw.phrasePack !== PHRASE_PACK
    return {
      ...raw,
      phrasePack: PHRASE_PACK,
      lawyerPhrases: packChanged
        ? { ...LAWYER_PHRASES }
        : mergePhraseMap(raw.lawyerPhrases, LAWYER_PHRASES),
      personPhrases: packChanged
        ? { ...PERSON_PHRASES }
        : mergePhraseMap(raw.personPhrases, PERSON_PHRASES),
    }
  } catch {
    return {
      ...DEFAULTS,
      lawyerPhrases: { ...LAWYER_PHRASES },
      personPhrases: { ...PERSON_PHRASES },
    }
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  // HTTPS page must use same-origin /api proxy (mixed content + WSS / no TLS on :8000).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.protocol !== 'https:') return
    const proxy = `${window.location.origin}/api`
    const stored = (localStorage.getItem('apiBase') || settings.apiBase || '').replace(/\/$/, '')
    let force = !stored || stored.startsWith('http://')
    if (!force && stored) {
      try {
        const u = new URL(stored, window.location.origin)
        force = u.origin !== window.location.origin || u.port === '8000'
      } catch {
        force = true
      }
    }
    if (force) {
      localStorage.setItem('apiBase', proxy)
      setSettings((s) => (s.apiBase === proxy ? s : { ...s, apiBase: proxy }))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sg-settings', JSON.stringify(settings))
    if (settings.apiBase) localStorage.setItem('apiBase', settings.apiBase)
    if (settings.roomId) localStorage.setItem('roomId', settings.roomId)
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale))
    document.documentElement.style.setProperty(
      '--caption-bg',
      `rgba(0,0,0,${settings.overlayOpacity})`,
    )
  }, [settings])

  const value = useMemo(
    () => ({
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      reset: () =>
        setSettings({
          ...DEFAULTS,
          phrasePack: PHRASE_PACK,
          lawyerPhrases: { ...LAWYER_PHRASES },
          personPhrases: { ...PERSON_PHRASES },
        }),
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings outside provider')
  return ctx
}
