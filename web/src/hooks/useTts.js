import { useCallback, useEffect, useRef } from 'react'

/**
 * Browser TTS (SpeechSynthesis).
 * Call unlock() from a tap (e.g. «إرسال») so mobile browsers allow audio.
 */
export function useTts({ cooldownMs = 1600 } = {}) {
  const lastRef = useRef({ text: '', at: 0 })
  const voicesRef = useRef([])
  const timerRef = useRef(0)

  useEffect(() => {
    if (!window.speechSynthesis) return undefined

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices() || []
    }
    loadVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
    window.speechSynthesis.getVoices()

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices)
      window.clearTimeout(timerRef.current)
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const pickArabicVoice = useCallback(() => {
    const voices = voicesRef.current.length
      ? voicesRef.current
      : window.speechSynthesis?.getVoices?.() || []
    return (
      voices.find((v) => /^ar(-|$)/i.test(v.lang)) ||
      voices.find((v) => /arabic/i.test(v.name)) ||
      null
    )
  }, [])

  const speakNow = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return false

      window.clearTimeout(timerRef.current)
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }

      // Chrome often drops speak() right after cancel()
      timerRef.current = window.setTimeout(() => {
        const u = new SpeechSynthesisUtterance(String(text))
        u.lang = 'ar-SA'
        u.rate = 0.92
        u.pitch = 1
        u.volume = 1
        const ar = pickArabicVoice()
        if (ar) {
          u.voice = ar
          if (ar.lang) u.lang = ar.lang
        }
        try {
          window.speechSynthesis.resume()
        } catch {
          /* ignore */
        }
        window.speechSynthesis.speak(u)
      }, 80)

      return true
    },
    [pickArabicVoice],
  )

  /** Warm up synthesis from a user gesture (needed on iOS/Android). */
  const unlock = useCallback(() => {
    if (!window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const warm = new SpeechSynthesisUtterance('أ')
      warm.volume = 0
      warm.rate = 2
      warm.lang = 'ar-SA'
      window.speechSynthesis.speak(warm)
      window.speechSynthesis.resume()
      window.setTimeout(() => {
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* ignore */
        }
      }, 120)
    } catch {
      /* ignore */
    }
  }, [])

  const speak = useCallback(
    (text, { force = false } = {}) => {
      if (!text || !window.speechSynthesis) return false
      const now = Date.now()
      if (
        !force &&
        lastRef.current.text === text &&
        now - lastRef.current.at < cooldownMs
      ) {
        return false
      }
      lastRef.current = { text, at: now }
      return speakNow(text)
    },
    [cooldownMs, speakNow],
  )

  const stop = useCallback(() => {
    window.clearTimeout(timerRef.current)
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
  }, [])

  return { speak, stop, unlock }
}
