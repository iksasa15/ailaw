import { useCallback, useEffect, useRef, useState } from 'react'

/** عبارات دور المحامي — سيناريو قضية */
export const LAWYER_PHRASES = {
  1: 'أنا محاميك',
  2: 'ما هي المشكلة؟',
  3: 'هل لديك أدلة؟',
  4: 'سأدافع عنك',
  5: 'وقّع هنا من فضلك',
  6: 'مقبول قانونياً',
  7: 'مرفوض',
  8: 'نحتاج شهوداً',
  9: 'الجلسة مؤجلة',
  10: 'القضية انتهت',
}

/** عبارات دور الشخص / الموكل */
export const PERSON_PHRASES = {
  1: 'أحتاج محامياً',
  2: 'هذه قضيتي',
  3: 'اتُهمت ظلماً',
  4: 'لدي دليل',
  5: 'أوافق',
  6: 'نعم',
  7: 'لا أوافق',
  8: 'ساعدني من فضلك',
  9: 'أنا قلق',
  10: 'شكراً لك',
}

/** توافق خلفي: القاموس الافتراضي = شخص */
export const FINGER_PHRASES = PERSON_PHRASES

export const ROLE_LABELS = {
  lawyer: 'محامي',
  person: 'شخص',
}

export function phrasesForRole(role) {
  return role === 'lawyer' ? LAWYER_PHRASES : PERSON_PHRASES
}

const ROLE_HOLD_MS = 5000

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
    if (dist(tip, wrist) > dist(pip, wrist) * 1.12) n += 1
  }

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
 * Finger phrases with lawyer/person roles.
 * Hold 1 finger 5s → lawyer; hold 2 fingers 5s → person.
 * Short stable hold speaks the current role's phrase.
 */
export function useFingerPhrases({
  landmarksRef,
  allHandsRef,
  enabled = false,
  trackingQuality = 'lost',
  intervalMs = 120,
  stableNeed = 8,
  roleHoldMs = ROLE_HOLD_MS,
} = {}) {
  const [result, setResult] = useState(null)
  const [role, setRole] = useState('person')
  const [roleHoldProgress, setRoleHoldProgress] = useState(0) // 0..1 while holding 1 or 2
  const [roleChanged, setRoleChanged] = useState(null) // { role, at } once per switch

  const qualityRef = useRef(trackingQuality)
  const roleRef = useRef(role)
  const streakRef = useRef({ count: 0, value: -1 })
  const lastAcceptedRef = useRef(null)
  const roleHoldStartRef = useRef(null) // timestamp when started holding 1 or 2 locked
  const roleHoldFingersRef = useRef(0)
  const roleSwitchDoneRef = useRef(false) // one switch per continuous hold

  qualityRef.current = trackingQuality
  roleRef.current = role

  useEffect(() => {
    if (trackingQuality === 'lost') {
      streakRef.current = { count: 0, value: -1 }
      lastAcceptedRef.current = null
      roleHoldStartRef.current = null
      roleHoldFingersRef.current = 0
      roleSwitchDoneRef.current = false
      setResult(null)
      setRoleHoldProgress(0)
    }
  }, [trackingQuality])

  useEffect(() => {
    if (!enabled) {
      setResult(null)
      setRoleHoldProgress(0)
      roleHoldStartRef.current = null
      roleSwitchDoneRef.current = false
      return undefined
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
        lastAcceptedRef.current = null
      }

      const locked = qualityRef.current === 'locked'
      const map = phrasesForRole(roleRef.current)
      const phrase = map[fingers]
      const need = locked ? stableNeed : stableNeed + 4

      // --- Role hold: 1 → lawyer, 2 → person (5s while locked) ---
      const roleCandidate = fingers === 1 ? 'lawyer' : fingers === 2 ? 'person' : null
      if (locked && roleCandidate && streak.value === fingers) {
        if (roleHoldFingersRef.current !== fingers) {
          roleHoldFingersRef.current = fingers
          roleHoldStartRef.current = Date.now()
          roleSwitchDoneRef.current = false
        }
        const started = roleHoldStartRef.current || Date.now()
        const elapsed = Date.now() - started
        const progress = Math.min(1, elapsed / roleHoldMs)
        setRoleHoldProgress(progress)

        if (!roleSwitchDoneRef.current && elapsed >= roleHoldMs) {
          roleSwitchDoneRef.current = true
          if (roleRef.current !== roleCandidate) {
            roleRef.current = roleCandidate
            setRole(roleCandidate)
            lastAcceptedRef.current = null
            setRoleChanged({ role: roleCandidate, at: Date.now() })
          }
          setRoleHoldProgress(0)
        }
      } else {
        roleHoldStartRef.current = null
        roleHoldFingersRef.current = 0
        roleSwitchDoneRef.current = false
        setRoleHoldProgress(0)
      }

      // --- Phrase accept (current role map) ---
      if (phrase && streak.count >= need) {
        const next = {
          fingers,
          display: phrase,
          label: phrase,
          role: roleRef.current,
          confidence: Math.min(0.95, 0.55 + streak.count * 0.03),
          accepted: true,
        }
        const acceptKey = `${roleRef.current}:${fingers}:${phrase}`
        if (lastAcceptedRef.current !== acceptKey) {
          lastAcceptedRef.current = acceptKey
          setResult(next)
        } else {
          setResult((r) => (r ? { ...r, confidence: next.confidence } : next))
        }
      } else if (phrase && locked && streak.count >= 3) {
        setResult((r) => {
          if (r?.accepted && r.display === phrase && r.role === roleRef.current) return r
          return {
            fingers,
            display: phrase,
            label: phrase,
            role: roleRef.current,
            confidence: 0.35 + streak.count * 0.05,
            accepted: false,
          }
        })
      } else if (!phrase && !lastAcceptedRef.current) {
        setResult(null)
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [enabled, landmarksRef, allHandsRef, intervalMs, stableNeed, roleHoldMs])

  const clearRoleChanged = useCallback(() => setRoleChanged(null), [])

  return {
    result,
    role,
    roleHoldProgress,
    roleChanged,
    clearRoleChanged,
    phrases: phrasesForRole(role),
  }
}
