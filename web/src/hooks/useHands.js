import { useCallback, useEffect, useRef, useState } from 'react'

const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
]

const FINGER_COLORS = {
  thumb: '#E8A078',
  index: '#C45C26',
  middle: '#2F6FED',
  ring: '#7B8FA8',
  pinky: '#D64545',
  palm: '#94a3b8',
}

function edgeColor(a, b) {
  if (a <= 4 && b <= 4) return FINGER_COLORS.thumb
  if ((a >= 5 && a <= 8) || (b >= 5 && b <= 8)) return FINGER_COLORS.index
  if ((a >= 9 && a <= 12) || (b >= 9 && b <= 12)) return FINGER_COLORS.middle
  if ((a >= 13 && a <= 16) || (b >= 13 && b <= 16)) return FINGER_COLORS.ring
  if ((a >= 17 && a <= 20) || (b >= 17 && b <= 20)) return FINGER_COLORS.pinky
  return FINGER_COLORS.palm
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function emaLandmarks(prev, next, alpha = 0.35) {
  if (!next) return null
  if (!prev || prev.length !== next.length) return next.map((p) => [...p])
  return next.map((p, i) => [
    alpha * p[0] + (1 - alpha) * prev[i][0],
    alpha * p[1] + (1 - alpha) * prev[i][1],
    alpha * p[2] + (1 - alpha) * prev[i][2],
  ])
}

function landmarkMotion(a, b) {
  if (!a || !b || a.length !== b.length) return 1
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    const dx = a[i][0] - b[i][0]
    const dy = a[i][1] - b[i][1]
    sum += Math.hypot(dx, dy)
  }
  return sum / a.length
}

/** Match CSS object-cover so skeleton sits on the visible video pixels. */
function getObjectCoverLayout(video, displayW, displayH) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh || !displayW || !displayH) return null
  const scale = Math.max(displayW / vw, displayH / vh)
  const drawnW = vw * scale
  const drawnH = vh * scale
  return {
    vw,
    vh,
    scale,
    offsetX: (displayW - drawnW) / 2,
    offsetY: (displayH - drawnH) / 2,
  }
}

function toDisplayPoint(lm, layout) {
  return {
    x: layout.offsetX + lm.x * layout.vw * layout.scale,
    y: layout.offsetY + lm.y * layout.vh * layout.scale,
    z: lm.z,
  }
}

function syncCanvasToDisplay(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssW = Math.max(1, Math.round(rect.width))
  const cssH = Math.max(1, Math.round(rect.height))
  const pixelW = Math.round(cssW * dpr)
  const pixelH = Math.round(cssH * dpr)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }
  return { cssW, cssH, dpr }
}

function handBounds(handDisplay, pad = 28) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of handDisplay) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  }
}

function drawHand(ctx, handDisplay, { pulse = false, quality = 'weak' } = {}) {
  const palm = handDisplay[0]
  const mid = handDisplay[9]
  const cx = (palm.x + mid.x) / 2
  const cy = (palm.y + mid.y) / 2
  const radius = Math.hypot(mid.x - palm.x, mid.y - palm.y) * 1.4
  const locked = quality === 'locked'
  const accent = locked ? 'rgba(62,207,142,0.95)' : 'rgba(251,191,36,0.9)'

  // Soft palm highlight only (no heavy box / corners)
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius)
  grad.addColorStop(0, pulse ? 'rgba(62,207,142,0.4)' : locked ? 'rgba(62,207,142,0.22)' : 'rgba(251,191,36,0.16)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, radius * (pulse ? 1.15 : 1), 0, Math.PI * 2)
  ctx.fill()

  // Thin oval outline around hand
  const box = handBounds(handDisplay, 22)
  ctx.save()
  ctx.strokeStyle = accent
  ctx.lineWidth = locked ? 2.5 : 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(
    box.x + box.w / 2,
    box.y + box.h / 2,
    box.w / 2,
    box.h / 2,
    0,
    0,
    Math.PI * 2,
  )
  ctx.stroke()
  ctx.restore()

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const [a, b] of HAND_EDGES) {
    ctx.strokeStyle = edgeColor(a, b)
    ctx.lineWidth = locked ? 3.4 : 2.8
    ctx.globalAlpha = quality === 'weak' ? 0.8 : 0.98
    ctx.beginPath()
    ctx.moveTo(handDisplay[a].x, handDisplay[a].y)
    ctx.lineTo(handDisplay[b].x, handDisplay[b].y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < handDisplay.length; i += 1) {
    const p = handDisplay[i]
    const isTip = [4, 8, 12, 16, 20].includes(i)
    ctx.beginPath()
    ctx.fillStyle = isTip ? '#ffffff' : '#e2e8f0'
    ctx.arc(p.x, p.y, isTip ? 5 : 3.2, 0, Math.PI * 2)
    ctx.fill()
    if (isTip && locked) {
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
  }
}

export function useHands({ videoRef, enabled = false, maxHands = 2, pulseToken = 0 } = {}) {
  const [landmarks, setLandmarks] = useState(null)
  const [ready, setReady] = useState(false)
  const [trackingQuality, setTrackingQuality] = useState('lost')
  const landmarksRef = useRef(null)
  const allHandsRef = useRef([]) // every smoothed hand (for two-hand finger phrases)
  const smoothRef = useRef([]) // one smoothed hand per detected hand
  const handsRef = useRef(null)
  const rafRef = useRef(0)
  const canvasRef = useRef(null)
  const lastPublishRef = useRef(0)
  const stableFramesRef = useRef(0)
  const lostFramesRef = useRef(0)
  const qualityRef = useRef('lost')
  const pulseUntilRef = useRef(0)
  const busyRef = useRef(false)

  useEffect(() => {
    if (pulseToken) pulseUntilRef.current = Date.now() + 450
  }, [pulseToken])

  useEffect(() => {
    if (!enabled) {
      setLandmarks(null)
      setReady(false)
      setTrackingQuality('lost')
      landmarksRef.current = null
      allHandsRef.current = []
      smoothRef.current = []
      qualityRef.current = 'lost'
      cancelAnimationFrame(rafRef.current)
      handsRef.current?.close?.()
      handsRef.current = null
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    let cancelled = false

    async function boot() {
      const cdn = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
      await loadScript(`${cdn}/hands.js`)
      if (cancelled) return
      const HandsCtor = window.Hands
      if (!HandsCtor) throw new Error('MediaPipe Hands unavailable')

      const hands = new HandsCtor({
        locateFile: (file) => `${cdn}/${file}`,
      })
      // selfieMode false: landmarks match raw video; we CSS-mirror video+canvas together
      hands.setOptions({
        maxNumHands: maxHands,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
        selfieMode: false,
      })

      hands.onResults((results) => {
        if (cancelled) return
        const rawHands = results.multiHandLandmarks || []
        const mappedHands = rawHands.map((hand) => hand.map((p) => [p.x, p.y, p.z]))

        // Smooth each hand independently; ArSL uses the first (primary) hand
        const prevAll = smoothRef.current
        const smoothedHands = mappedHands.map((mapped, i) =>
          emaLandmarks(prevAll[i] || null, mapped, 0.35),
        )
        smoothRef.current = smoothedHands

        const primary = smoothedHands[0] || null
        landmarksRef.current = primary
        allHandsRef.current = smoothedHands

        if (primary) {
          lostFramesRef.current = 0
          // Average motion across all visible hands (supports two-hand demos)
          let motion = landmarkMotion(prevAll[0] || null, primary)
          if (smoothedHands[1]) {
            const m2 = landmarkMotion(prevAll[1] || null, smoothedHands[1])
            motion = (motion + m2) / 2
          }
          if (motion < 0.012) stableFramesRef.current += 1
          else stableFramesRef.current = Math.max(0, stableFramesRef.current - 2)

          let nextQ = 'weak'
          if (stableFramesRef.current >= 10) nextQ = 'locked'
          else if (stableFramesRef.current >= 3) nextQ = 'weak'
          if (qualityRef.current !== nextQ) {
            qualityRef.current = nextQ
            setTrackingQuality(nextQ)
          }
        } else {
          stableFramesRef.current = 0
          lostFramesRef.current += 1
          if (lostFramesRef.current >= 5 && qualityRef.current !== 'lost') {
            qualityRef.current = 'lost'
            setTrackingQuality('lost')
          }
        }

        const now = Date.now()
        if (now - lastPublishRef.current >= 90) {
          lastPublishRef.current = now
          setLandmarks(primary)
        }

        const canvas = canvasRef.current
        const video = videoRef?.current
        if (!canvas || !video) return

        const { cssW, cssH, dpr } = syncCanvasToDisplay(canvas)
        const layout = getObjectCoverLayout(video, cssW, cssH)
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, cssW, cssH)
        if (!smoothedHands.length || !layout) return

        const pulse = Date.now() < pulseUntilRef.current
        smoothedHands.forEach((hand, index) => {
          if (!hand) return
          const handDisplay = hand.map(([x, y, z]) => toDisplayPoint({ x, y, z }, layout))
          drawHand(ctx, handDisplay, {
            pulse: pulse && index === 0,
            quality: qualityRef.current,
          })
        })
      })

      handsRef.current = hands
      setReady(true)

      const loop = async () => {
        if (cancelled) return
        const video = videoRef?.current
        if (video && video.readyState >= 2 && handsRef.current && !busyRef.current) {
          busyRef.current = true
          try {
            await handsRef.current.send({ image: video })
          } catch {
            /* ignore */
          } finally {
            busyRef.current = false
          }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    boot().catch(() => setReady(false))

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      handsRef.current?.close?.()
      handsRef.current = null
    }
  }, [enabled, maxHands, videoRef])

  const clear = useCallback(() => {
    setLandmarks(null)
    landmarksRef.current = null
    allHandsRef.current = []
    smoothRef.current = []
  }, [])

  return {
    landmarks,
    landmarksRef,
    allHandsRef,
    ready,
    canvasRef,
    clear,
    trackingQuality,
  }
}
