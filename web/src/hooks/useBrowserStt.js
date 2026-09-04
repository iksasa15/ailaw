import { useCallback, useEffect, useRef, useState } from 'react'

const TRANSIENT = new Set(['no-speech', 'aborted', 'audio-capture'])

export function useBrowserStt({ enabled = false, language = 'ar-SA' } = {}) {
  const [text, setText] = useState('')
  const [partial, setPartial] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const recRef = useRef(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    recRef.current = null
    setStatus('idle')
  }, [])

  const start = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    recRef.current = null

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('error')
      setError('التعرف الصوتي غير مدعوم — شغّل الـ Backend (Whisper)')
      return
    }

    const rec = new SR()
    rec.lang = language.startsWith('ar') ? 'ar-SA' : language
    rec.continuous = true
    rec.interimResults = true

    rec.onstart = () => {
      setStatus('listening')
      setError(null)
    }

    rec.onerror = (e) => {
      const code = e?.error || 'error'
      if (TRANSIENT.has(code)) {
        // Keep listening; onend will restart
        return
      }
      setStatus('error')
      if (code === 'not-allowed') setError('ارفض المايكروفون أو امنعه — اسمح به من المتصفح')
      else if (code === 'network') setError('خطأ شبكة في التعرف الصوتي بالمتصفح')
      else setError(`خطأ التعرف: ${code}`)
    }

    rec.onresult = (event) => {
      let interim = ''
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalChunk += t
        else interim += t
      }
      if (interim) setPartial(interim)
      if (finalChunk) {
        setPartial('')
        setText((prev) => `${prev} ${finalChunk}`.trim().slice(-280))
      }
    }

    rec.onend = () => {
      if (enabledRef.current && recRef.current === rec) {
        try {
          rec.start()
        } catch {
          /* ignore restart errors */
        }
      }
    }

    recRef.current = rec
    try {
      rec.start()
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'تعذر بدء التعرف')
    }
  }, [language])

  useEffect(() => {
    if (enabled) start()
    else stop()
    return stop
  }, [enabled, start, stop])

  return {
    text,
    partial,
    status,
    error,
    start,
    clearText: () => {
      setText('')
      setPartial('')
    },
  }
}
