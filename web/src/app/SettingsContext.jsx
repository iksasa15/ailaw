import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SettingsContext = createContext(null)

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
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('sg-settings') || '{}') }
  } catch {
    return { ...DEFAULTS }
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
      reset: () => setSettings({ ...DEFAULTS }),
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
