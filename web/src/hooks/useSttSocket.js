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
  chunkMs = 1200,
  stream = null,
} = {}) {
  const [text, setText] = useState('')
  const [partial, setPartial] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const recorderRef = useRef(null)
  const ownStreamRef = useRef(null)
  const streamRef = useRef(stream)
  const enabledRef = useRef(enabled)
  const languageRef = useRef(language)
  const chunkMsRef = useRef(chunkMs)
  const retryRef = useRef(0)
  const startRef = useRef(null)
  const intentionalCloseRef = useRef(false)
  const retryTimerRef = useRef(0)
  const generationRef = useRef(0)

  streamRef.current = stream
  enabledRef.current = enabled
  languageRef.current = language
  chunkMsRef.current = chunkMs

  const cleanupMedia = useCallback(() => {
    intentionalCloseRef.current = true
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = 0
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null
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
    generationRef.current += 1
    cleanupMedia()
    setStatus('idle')
    setError(null)
  }, [cleanupMedia])

  const start = useCallback(async () => {
    const gen = ++generationRef.current
    cleanupMedia()
    intentionalCloseRef.current = false
    setError(null)
    setStatus('connecting')

    try {
      let audioStream = streamRef.current
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

      if (gen !== generationRef.current || !enabledRef.current) {
        cleanupMedia()
        return
      }

      const wsUrl = `${getWsBase()}/ws/stt`
      const ws = new WebSocket(wsUrl)
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
        ws.onclose = () => {
          clearTimeout(t)
          reject(new Error('فشل الاتصال بـ WebSocket — تحقق من عنوان Backend'))
        }
      })

      if (gen !== generationRef.current || !enabledRef.current) {
        cleanupMedia()
        return
      }

      // Clear handshake handlers; attach runtime handlers
      ws.onclose = () => {
        if (intentionalCloseRef.current) return
        if (!enabledRef.current) return
        if (gen !== generationRef.current) return
        setStatus('error')
        setError('انقطع اتصال الاستقبال')
        if (retryRef.current < 3) {
          retryRef.current += 1
          retryTimerRef.current = window.setTimeout(() => {
            if (enabledRef.current && gen === generationRef.current) {
              startRef.current?.()
            }
          }, 1500)
        }
      }
      ws.onerror = () => {
        /* onclose handles retry */
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

      recorder.start(chunkMsRef.current)
      retryRef.current = 0
      setStatus('listening')
    } catch (err) {
      if (gen !== generationRef.current) return
      cleanupMedia()
      intentionalCloseRef.current = false
      setStatus('error')
      setError(err?.message || 'تعذر تشغيل الاستقبال')
      if (enabledRef.current && retryRef.current < 3) {
        retryRef.current += 1
        retryTimerRef.current = window.setTimeout(() => {
          if (enabledRef.current) startRef.current?.()
        }, 1500)
      }
    }
  }, [cleanupMedia])

  startRef.current = start

  useEffect(() => {
    if (enabled) start()
    else stop()
    return () => {
      generationRef.current += 1
      cleanupMedia()
    }
    // Reconnect only when receive toggles — stream identity must not thrash the socket
  }, [enabled, start, stop, cleanupMedia])

  const clearText = useCallback(() => {
    setText('')
    setPartial('')
  }, [])

  return { text, partial, status, error, start, stop, clearText }
}
