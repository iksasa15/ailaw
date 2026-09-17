import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LAWYER_PHRASES, PERSON_PHRASES, mergePhraseMap } from '../hooks/useFingerPhrases'

const SettingsContext = createContext(null)

const PHRASE_PACK = 'case-story-v1'

const DEFAULTS = {
  apiBase: '',
  language: 'ar',
  fontScale: 1,
  overlayOpacity: 0.55,
  confidence: 0.38,
  receiveEnabled: true,
  sendEnabled: true,
  safetyEnabled: true,
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

  useEffect(() => {
    localStorage.setItem('sg-settings', JSON.stringify(settings))
    if (settings.apiBase) localStorage.setItem('apiBase', settings.apiBase)
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
