import { useCallback, useEffect, useRef, useState } from 'react'
import { getWsBase } from '../services/api'

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export function useSttSocket({
  enabled = false,
  language = 'ar',
  chunkMs = 1800,
  stream = null,
} = {}) {
  const [text, setText] = useState('')
  const [partial, setPartial] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const recorderRef = useRef(null)
  const ownStreamRef = useRef(null)
  const enabledRef = useRef(enabled)
  const languageRef = useRef(language)
  const retryRef = useRef(0)
  const startRef = useRef(null)

  enabledRef.current = enabled
  languageRef.current = language

  const cleanupMedia = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null
    // Only stop tracks we opened ourselves — never stop a shared stream
    ownStreamRef.current?.getTracks().forEach((t) => t.stop())
    ownStreamRef.current = null
    try {
      wsRef.current?.close()
    } catch {
      /* ignore */
    }
    wsRef.current = null
  }, [])

  const stop = useCallback(() => {
    cleanupMedia()
    setStatus('idle')
  }, [cleanupMedia])

  const start = useCallback(async () => {
    cleanupMedia()
    setError(null)
    setStatus('connecting')

    try {
      let audioStream = stream
      if (audioStream?.active) {
        audioStream = audioStream.clone()
        ownStreamRef.current = audioStream
      } else {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
          video: false,
        })
        ownStreamRef.current = audioStream
      }

      const ws = new WebSocket(`${getWsBase()}/ws/stt`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('انتهت مهلة الاتصال بالخادم')), 8000)
        ws.onopen = () => {
          clearTimeout(t)
          resolve()
        }
        ws.onerror = () => {
          clearTimeout(t)
          reject(new Error('فشل الاتصال بـ WebSocket — تحقق من عنوان Backend'))
        }
      })

      if (!enabledRef.current) {
        cleanupMedia()
        return
      }

      ws.send(JSON.stringify({ type: 'config', language: languageRef.current }))

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'partial') setPartial(msg.text || '')
          if (msg.type === 'final' && msg.text) {
            setPartial('')
            setText((prev) => `${prev} ${msg.text}`.trim().slice(-280))
          }
        } catch {
          /* ignore */
        }
      }

      ws.onclose = () => {
        if (!enabledRef.current) return
        setStatus('error')
        setError('انقطع اتصال الاستقبال')
        // Auto-retry a few times
        if (retryRef.current < 3) {
          retryRef.current += 1
          setTimeout(() => {
            if (enabledRef.current) startRef.current?.()
          }, 1200)
        }
      }

      const mime = pickMime()
      const recorder = mime
        ? new MediaRecorder(audioStream, { mimeType: mime, audioBitsPerSecond: 64000 })
        : new MediaRecorder(audioStream)
      recorderRef.current = recorder

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          const buf = await e.data.arrayBuffer()
          ws.send(buf)
        }
      }
      recorder.onerror = () => {
        setStatus('error')
        setError('تعذر تسجيل الصوت')
      }

      // timeslice keeps sending complete blobs without restarting the recorder
      recorder.start(chunkMs)
      retryRef.current = 0
      setStatus('listening')
    } catch (err) {
      cleanupMedia()
      setStatus('error')
      setError(err?.message || 'تعذر تشغيل الاستقبال')
    }
  }, [chunkMs, cleanupMedia, stream])

  startRef.current = start

  useEffect(() => {
    if (enabled) start()
    else stop()
    return () => {
      cleanupMedia()
    }
  }, [enabled, stream, start, stop, cleanupMedia])

  const clearText = useCallback(() => {
    setText('')
    setPartial('')
  }, [])

  return { text, partial, status, error, start, stop, clearText }
}
