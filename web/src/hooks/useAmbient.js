import { useCallback, useEffect, useRef, useState } from 'react'
import { classifyAmbient } from '../services/api'

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export function useAmbient({ enabled = false, intervalMs = 2500, stream = null } = {}) {
  const [alert, setAlert] = useState(null)
  const [status, setStatus] = useState('idle')
  const ownStreamRef = useRef(null)
  const busy = useRef(false)

  const clearAlert = useCallback(() => setAlert(null), [])

  useEffect(() => {
    if (!enabled) {
      ownStreamRef.current?.getTracks().forEach((t) => t.stop())
      ownStreamRef.current = null
      setStatus('idle')
      return
    }

    let cancelled = false
    let timer

    async function setup() {
      try {
        let audioStream = stream
        if (audioStream?.active) {
          audioStream = audioStream.clone()
          ownStreamRef.current = audioStream
        } else {
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          })
          if (cancelled) {
            audioStream.getTracks().forEach((t) => t.stop())
            return
          }
          ownStreamRef.current = audioStream
        }

        setStatus('listening')
        const mime = pickMime()
        const activeStream = audioStream

        timer = setInterval(() => {
          if (busy.current || cancelled) return
          if (!activeStream?.active) return
          busy.current = true
          let rec
          try {
            rec = mime
              ? new MediaRecorder(activeStream, { mimeType: mime })
              : new MediaRecorder(activeStream)
          } catch {
            busy.current = false
            return
          }
          const chunks = []
          rec.ondataavailable = (e) => {
            if (e.data.size) chunks.push(e.data)
          }
          rec.onstop = async () => {
            try {
              if (!chunks.length) return
              const blob = new Blob(chunks, { type: mime || 'audio/webm' })
              const result = await classifyAmbient(blob)
              if (!cancelled && result.is_danger) {
                setAlert(result)
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
              }
            } catch {
              /* ignore transient errors */
            } finally {
              busy.current = false
            }
          }
          try {
            rec.start()
            setTimeout(() => {
              if (rec.state === 'recording') rec.stop()
              else busy.current = false
            }, 1200)
          } catch {
            busy.current = false
          }
        }, intervalMs)
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    setup()
    return () => {
      cancelled = true
      clearInterval(timer)
      ownStreamRef.current?.getTracks().forEach((t) => t.stop())
      ownStreamRef.current = null
    }
  }, [enabled, intervalMs, stream])

  return { alert, status, clearAlert }
}
