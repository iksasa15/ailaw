import { useCallback, useEffect, useRef, useState } from 'react'

/** عبارات دور المحامي — حوار قضية متسلسل */
export const LAWYER_PHRASES = {
  1: 'أنا محاميك، تفضّل',
  2: 'ما تفاصيل القضية؟',
  3: 'متى حدث ذلك؟',
  4: 'هل لديك شهود؟',
  5: 'أين الدليل؟',
  6: 'سأراجع أوراقك',
  7: 'لا تخف، سأدافع عنك',
  8: 'نحتاج مستندات إضافية',
  9: 'وقّع التوكيل من فضلك',
  10: 'القضية تحت المتابعة',
}

/** عبارات دور الشخص — يحكي قضيته إصبعاً بإصبع */
export const PERSON_PHRASES = {
  1: 'عندي قضية',
  2: 'اتُهمت ظلماً',
  3: 'حدث ذلك الأسبوع الماضي',
  4: 'لدي شهود',
  5: 'عندي دليل صورة',
  6: 'أحتاج محامياً',
  7: 'أنا خائف من النتيجة',
  8: 'لم أفعل شيئاً خطأ',
  9: 'ساعدني من فضلك',
  10: 'شكراً لك',
}

/** توافق خلفي: القاموس الافتراضي = شخص */
export const FINGER_PHRASES = PERSON_PHRASES

export const ROLE_LABELS = {
  lawyer: 'محامي',
  person: 'شخص',
}

/** دمج تعديلات المستخدم مع الافتراضي (1–10) */
export function mergePhraseMap(custom, defaults = PERSON_PHRASES) {
  const out = { ...defaults }
  if (!custom || typeof custom !== 'object') return out
  for (let i = 1; i <= 10; i += 1) {
    const raw = custom[i] ?? custom[String(i)]
    if (typeof raw === 'string' && raw.trim()) out[i] = raw.trim()
  }
  return out
}

export function phrasesForRole(role, lawyerMap, personMap) {
  return role === 'lawyer'
    ? mergePhraseMap(lawyerMap, LAWYER_PHRASES)
    : mergePhraseMap(personMap, PERSON_PHRASES)
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
  lawyerPhrases,
  personPhrases,
  lockedRole = null, // 'lawyer' | 'person' | null — شاشة مستقلة بدون تبديل
} = {}) {
  const initialRole = lockedRole === 'lawyer' || lockedRole === 'person' ? lockedRole : 'person'
  const [result, setResult] = useState(null)
  const [role, setRole] = useState(initialRole)
  const [roleHoldProgress, setRoleHoldProgress] = useState(0)
  const [roleChanged, setRoleChanged] = useState(null)

  const qualityRef = useRef(trackingQuality)
  const roleRef = useRef(role)
  const lockedRef = useRef(lockedRole)
  const lawyerRef = useRef(lawyerPhrases)
  const personRef = useRef(personPhrases)
  const streakRef = useRef({ count: 0, value: -1 })
  const lastAcceptedRef = useRef(null)
  const roleHoldStartRef = useRef(null)
  const roleHoldFingersRef = useRef(0)
  const roleSwitchDoneRef = useRef(false)

  qualityRef.current = trackingQuality
  roleRef.current = role
  lockedRef.current = lockedRole
  lawyerRef.current = lawyerPhrases
  personRef.current = personPhrases

  useEffect(() => {
    if (lockedRole === 'lawyer' || lockedRole === 'person') {
      roleRef.current = lockedRole
      setRole(lockedRole)
      lastAcceptedRef.current = null
      setRoleHoldProgress(0)
    }
  }, [lockedRole])

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
      const map = phrasesForRole(roleRef.current, lawyerRef.current, personRef.current)
      const phrase = map[fingers]
      const need = locked ? stableNeed : stableNeed + 4

      // --- Role hold: فقط إذا الدور غير مقفول على شاشة مستقلة ---
      const roleCandidate = fingers === 1 ? 'lawyer' : fingers === 2 ? 'person' : null
      if (!lockedRef.current && locked && roleCandidate && streak.value === fingers) {
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

  const setRoleManual = useCallback((next) => {
    if (lockedRef.current) return
    if (next !== 'lawyer' && next !== 'person') return
    if (roleRef.current === next) return
    roleRef.current = next
    lastAcceptedRef.current = null
    roleHoldStartRef.current = null
    roleSwitchDoneRef.current = false
    setRoleHoldProgress(0)
    setRole(next)
    setResult(null)
    setRoleChanged({ role: next, at: Date.now() })
  }, [])

  const toggleRole = useCallback(() => {
    if (lockedRef.current) return
    const next = roleRef.current === 'lawyer' ? 'person' : 'lawyer'
    setRoleManual(next)
  }, [setRoleManual])

  return {
    result,
    role,
    roleHoldProgress,
    roleChanged,
    clearRoleChanged,
    setRoleManual,
    toggleRole,
    lockedRole: lockedRole || null,
    phrases: phrasesForRole(role, lawyerPhrases, personPhrases),
  }
}
