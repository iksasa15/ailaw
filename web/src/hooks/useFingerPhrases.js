import { useEffect, useRef, useState } from 'react'

/** محادثة مرقّمة: مجموع الأصابع من يد أو يدين → جملة (1–10) */
export const FINGER_PHRASES = {
  1: 'السلام عليكم',
  2: 'كيف حالك؟',
  3: 'شكراً',
  4: 'مساعدة',
  5: 'مع السلامة',
  6: 'نعم',
  7: 'لا',
  8: 'من فضلك',
  9: 'أنا آسف',
  10: 'أنا بخير',
}

function dist(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.hypot(dx, dy)
}

/**
 * Count extended fingers from MediaPipe 21 landmarks [[x,y,z], ...].
 * y grows downward in image space.
 */
export function countExtendedFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0
  const wrist = landmarks[0]
  const tips = [8, 12, 16, 20]
  const pips = [6, 10, 14, 18]
  let n = 0

  for (let i = 0; i < tips.length; i += 1) {
    const tip = landmarks[tips[i]]
    const pip = landmarks[pips[i]]
    // Extended if tip is farther from wrist than the PIP joint
    if (dist(tip, wrist) > dist(pip, wrist) * 1.12) n += 1
  }

  // Thumb: compare tip(4) vs ip(3) distance from pinky-side reference (mcp 17)
  const thumbTip = landmarks[4]
  const thumbIp = landmarks[3]
  const ref = landmarks[17]
  if (dist(thumbTip, ref) > dist(thumbIp, ref) * 1.08) n += 1

  return Math.min(5, n)
}

/** Sum fingers across one or more hands (max 10). */
export function countFingersFromHands(hands) {
  if (!hands) return 0
  const list = Array.isArray(hands[0]?.[0]) ? hands : hands.length >= 21 ? [hands] : []
  let total = 0
  for (const hand of list) {
    total += countExtendedFingers(hand)
  }
  return Math.min(10, total)
}

/**
 * Poll allHandsRef / landmarksRef; when tracking is locked and finger count
 * is stable, emit the matching conversation phrase (supports two hands → 1–10).
 */
export function useFingerPhrases({
  landmarksRef,
  allHandsRef,
  enabled = false,
  trackingQuality = 'lost',
  intervalMs = 120,
  stableNeed = 8,
} = {}) {
  const [result, setResult] = useState(null)
  const qualityRef = useRef(trackingQuality)
  const streakRef = useRef({ count: 0, value: -1 })
  const lastAcceptedRef = useRef(null)
  qualityRef.current = trackingQuality

  useEffect(() => {
    if (trackingQuality === 'lost') {
      streakRef.current = { count: 0, value: -1 }
      lastAcceptedRef.current = null
      setResult(null)
    }
  }, [trackingQuality])

  useEffect(() => {
    if (!enabled) {
      setResult(null)
      return
    }

    const id = setInterval(() => {
      if (qualityRef.current === 'lost') return

      const fromAll = allHandsRef?.current
      const fromOne = landmarksRef?.current
      const hands =
        Array.isArray(fromAll) && fromAll.length
          ? fromAll
          : fromOne
            ? [fromOne]
            : []
      if (!hands.length) return

      const fingers = countFingersFromHands(hands)
      const streak = streakRef.current

      if (fingers === streak.value) {
        streak.count += 1
      } else {
        streak.value = fingers
        streak.count = 1
      }

      const phrase = FINGER_PHRASES[fingers]
      const locked = qualityRef.current === 'locked'
      const need = locked ? stableNeed : stableNeed + 4

      if (phrase && streak.count >= need) {
        const next = {
          fingers,
          display: phrase,
          label: phrase,
          confidence: Math.min(0.95, 0.55 + streak.count * 0.03),
          accepted: true,
        }
        if (lastAcceptedRef.current !== phrase) {
          lastAcceptedRef.current = phrase
          setResult(next)
        } else {
          setResult((r) => (r ? { ...r, confidence: next.confidence } : next))
        }
      } else if (phrase && locked && streak.count >= 3) {
        // Live preview while stabilizing
        setResult((r) => {
          if (r?.accepted && r.display === phrase) return r
          return {
            fingers,
            display: phrase,
            label: phrase,
            confidence: 0.35 + streak.count * 0.05,
            accepted: false,
          }
        })
      } else if (!phrase && !lastAcceptedRef.current) {
        setResult(null)
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [enabled, landmarksRef, allHandsRef, intervalMs, stableNeed])

  return { result, phrases: FINGER_PHRASES }
}
