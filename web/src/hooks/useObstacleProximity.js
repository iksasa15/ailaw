import { useCallback, useEffect, useRef, useState } from 'react'

const W = 80
const H = 60

/** Warning beeps (companion / demo speakers). */
function playProximityAlarm(times = 4) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    for (let i = 0; i < times; i += 1) {
      const t0 = now + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, t0)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.2)
    }
    window.setTimeout(() => {
      try {
        ctx.close()
      } catch {
        /* ignore */
      }
    }, 1600)
  } catch {
    /* ignore */
  }
}

function sampleFrame(video, canvas, ctx) {
  if (!video || video.readyState < 2) return null
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)
  const gray = new Float32Array(W * H)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return gray
}

function meanStd(gray) {
  let sum = 0
  for (let i = 0; i < gray.length; i += 1) sum += gray[i]
  const mean = sum / gray.length
  let varSum = 0
  for (let i = 0; i < gray.length; i += 1) {
    const d = gray[i] - mean
    varSum += d * d
  }
  return { mean, std: Math.sqrt(varSum / gray.length) }
}

/** Edge energy — drops when a plain wall/barrier fills the lens up close. */
function edgeEnergy(gray) {
  let e = 0
  let n = 0
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x
      const gx = gray[i + 1] - gray[i - 1]
      const gy = gray[i + W] - gray[i - W]
      e += Math.abs(gx) + Math.abs(gy)
      n += 1
    }
  }
  return e / n
}

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let s = 0
  for (let i = 0; i < a.length; i += 1) s += Math.abs(a[i] - b[i])
  return s / a.length
}

/**
 * Detects a close barrier/wall filling the camera (looming / low detail surface).
 * Fires visual alert + alarm sound when proximity is sustained.
 */
export function useObstacleProximity({
  videoRef,
  enabled = false,
  intervalMs = 180,
  cooldownMs = 4500,
} = {}) {
  const [alert, setAlert] = useState(null)
  const [near, setNear] = useState(false)
  const prevGrayRef = useRef(null)
  const streakRef = useRef(0)
  const lastAlertAtRef = useRef(0)
  const canvasRef = useRef(null)

  const clearAlert = useCallback(() => setAlert(null), [])

  useEffect(() => {
    if (!enabled) {
      streakRef.current = 0
      prevGrayRef.current = null
      setNear(false)
      setAlert(null)
      return undefined
    }

    if (!canvasRef.current) {
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      canvasRef.current = c
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const id = window.setInterval(() => {
      const video = videoRef?.current
      const gray = sampleFrame(video, canvas, ctx)
      if (!gray) return

      const { mean, std } = meanStd(gray)
      const edges = edgeEnergy(gray)
      const diff = frameDiff(prevGrayRef.current, gray)
      prevGrayRef.current = gray

      // Close barrier heuristics (demo-friendly on phone camera):
      // 1) Surface fills view → low spatial detail (few edges)
      // 2) Fairly uniform brightness (wall/door/person too close)
      // 3) Not pitch-black / washed-out sensor fail
      // 4) Optional looming: rising frame difference while edges stay low
      const uniformClose = std < 26 && edges < 16 && mean > 20 && mean < 230
      const softClose = edges < 11 && mean > 28 && mean < 215
      const looming = softClose && diff > 7 && diff < 48
      const hit = uniformClose || looming

      if (hit) streakRef.current += 1
      else streakRef.current = Math.max(0, streakRef.current - 2)

      const isNear = streakRef.current >= 6
      setNear(isNear)

      if (isNear && Date.now() - lastAlertAtRef.current > cooldownMs) {
        lastAlertAtRef.current = Date.now()
        const next = {
          is_danger: true,
          kind: 'obstacle',
          label: 'حاجز قريب — انتبه!',
          score: Math.min(0.99, 0.55 + streakRef.current * 0.05),
        }
        setAlert(next)
        playProximityAlarm(5)
        if (navigator.vibrate) {
          navigator.vibrate([180, 80, 180, 80, 320, 80, 180])
        }
      }
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [enabled, videoRef, intervalMs, cooldownMs])

  return { alert, near, clearAlert }
}
