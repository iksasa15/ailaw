import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera({ facingMode = 'user', enabled = true } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | requesting | ready | denied | unsupported | error
  const [error, setError] = useState(null)

  const attachStream = useCallback(async (stream) => {
    const video = videoRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    video.muted = true
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    try {
      await video.play()
    } catch {
      /* iOS may need a tap; muted autoplay usually works */
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    setError(null)
    try {
      stop()
      // Soft constraints — harsh ideals often fail on iOS Safari
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      streamRef.current = stream
      await attachStream(stream)
      setStatus('ready')
      // Re-attach next paint in case <video> mounted after PermissionGate flipped
      requestAnimationFrame(() => {
        attachStream(stream)
      })
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('denied')
      } else {
        setStatus('error')
        setError(err?.message || 'تعذر فتح الكاميرا')
      }
    }
  }, [facingMode, stop, attachStream])

  // When <video> appears (or remounts), bind the live stream
  useEffect(() => {
    if (status !== 'ready' || !streamRef.current) return
    attachStream(streamRef.current)
  }, [status, attachStream])

  useEffect(() => {
    if (enabled) start()
    else {
      stop()
      setStatus('idle')
    }
    return stop
  }, [enabled, start, stop])

  return { videoRef, status, error, start, stop, streamRef }
}
