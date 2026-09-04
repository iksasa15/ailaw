import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * One shared getUserMedia(audio) stream for STT + ambient safety,
 * so the two features do not fight over the microphone.
 */
export function useSharedMic({ enabled = false } = {}) {
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState('idle') // idle | requesting | ready | denied | error
  const [error, setError] = useState(null)
  const streamRef = useRef(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('المتصفح لا يدعم المايكروفون')
      return
    }
    setStatus('requesting')
    setError(null)
    try {
      stop()
      const next = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
        video: false,
      })
      streamRef.current = next
      setStream(next)
      setStatus('ready')
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('denied')
        setError('تم رفض صلاحية المايكروفون')
      } else {
        setStatus('error')
        setError(err?.message || 'تعذر فتح المايكروفون')
      }
      streamRef.current = null
      setStream(null)
    }
  }, [stop])

  useEffect(() => {
    if (enabled) start()
    else stop()
    return stop
  }, [enabled, start, stop])

  return { stream, streamRef, status, error, start, stop }
}
