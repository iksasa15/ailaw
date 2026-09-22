import { useEffect, useRef, useState } from 'react'

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** أي الأصابع ممدودة من landmarks MediaPipe */
export function fingerFlags(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { t: false, i: false, m: false, r: false, p: false }
  }
  const wrist = landmarks[0]
  const tips = [8, 12, 16, 20]
  const pips = [6, 10, 14, 18]
  const names = ['i', 'm', 'r', 'p']
  const out = { t: false, i: false, m: false, r: false, p: false }
  for (let n = 0; n < 4; n += 1) {
    const tip = landmarks[tips[n]]
    const pip = landmarks[pips[n]]
    out[names[n]] = dist(tip, wrist) > dist(pip, wrist) * 1.12
  }
  const thumbTip = landmarks[4]
  const thumbIp = landmarks[3]
  const pinkyMcp = landmarks[17]
  out.t = dist(thumbTip, pinkyMcp) > dist(thumbIp, pinkyMcp) * 1.08
  return out
}

function tipSpread(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0
  const tips = [8, 12, 16, 20].map((i) => landmarks[i])
  let s = 0
  for (let i = 0; i < tips.length - 1; i += 1) s += dist(tips[i], tips[i + 1])
  return s
}

function thumbIndexPinch(landmarks) {
  if (!landmarks || landmarks.length < 21) return 1
  return dist(landmarks[4], landmarks[8])
}

/**
 * تصنيف تقريبي لحرف أبجدية لغة الإشارة من شكل اليد.
 * يغطي الحروف الأكثر تميزاً بالأصابع الممدودة.
 */
export function classifyAlphabetLetter(landmarks) {
  const f = fingerFlags(landmarks)
  if (!landmarks || landmarks.length < 21) return null

  const pattern = `${+f.t}${+f.i}${+f.m}${+f.r}${+f.p}`
  const spread = tipSpread(landmarks)
  const pinch = thumbIndexPinch(landmarks)
  const wrist = landmarks[0]
  const indexTip = landmarks[8]
  const pinkyTip = landmarks[20]

  // أنماط واضحة
  switch (pattern) {
    case '10000':
      return { letter: 'أ', confidence: 0.82 }
    case '01000':
      return { letter: 'ب', confidence: 0.8 }
    case '01100':
      return { letter: 'ت', confidence: 0.8 }
    case '01110':
      return { letter: 'ث', confidence: 0.78 }
    case '00100':
      return { letter: 'د', confidence: 0.7 }
    case '00010':
      return { letter: 'ر', confidence: 0.65 }
    case '00001':
      return { letter: 'ي', confidence: 0.72 } // غالباً خنصر+إبهام؛ يُصحَّح أدناه
    case '10001':
      return { letter: 'ي', confidence: 0.85 } // إبهام + خنصر
    case '11000':
      // لام تقريباً أو لا
      if (dist(landmarks[4], landmarks[8]) > 0.12) return { letter: 'ل', confidence: 0.75 }
      return { letter: 'ط', confidence: 0.6 }
    case '01111':
      return { letter: 'ب', confidence: 0.78 } // أربعة أصابع مسطحة
    case '11111':
      return {
        letter: spread > 0.22 ? 'ش' : 'س',
        confidence: 0.8,
      }
    case '00000':
      return { letter: 'م', confidence: 0.7 }
    case '10111':
    case '11011':
      return { letter: 'ص', confidence: 0.55 }
    case '11100':
      return { letter: 'ظ', confidence: 0.6 }
    case '00111':
      return { letter: 'ض', confidence: 0.55 }
    case '01001':
      return { letter: 'لا', confidence: 0.8 } // سبابة + خنصر
    default:
      break
  }

  // قرصة إبهام+سبابة → ف / ق
  if (pinch < 0.05 && f.m && f.r) {
    return { letter: 'ف', confidence: 0.65 }
  }
  if (pinch < 0.055 && !f.m) {
    return { letter: 'ق', confidence: 0.6 }
  }

  // كف مفتوح بدون إبهام واضح
  if (!f.t && f.i && f.m && f.r && f.p) {
    return { letter: spread > 0.22 ? 'ش' : 'ك', confidence: 0.7 }
  }

  // سبابة منحنية تقريباً نون إن الطرف أقرب للرسغ
  if (f.i && !f.m && !f.r && !f.p && dist(indexTip, wrist) < 0.28) {
    return { letter: 'ن', confidence: 0.55 }
  }

  if (f.i && f.p && !f.m && !f.r) {
    return { letter: 'لا', confidence: 0.75 }
  }

  if (f.t && f.p && !f.i && !f.m && !f.r) {
    return { letter: 'ي', confidence: 0.8 }
  }

  // أقرب نمط بعدد الأصابع
  const n = +f.t + +f.i + +f.m + +f.r + +f.p
  if (n === 1 && f.t) return { letter: 'أ', confidence: 0.55 }
  if (n === 1 && f.i) return { letter: 'ب', confidence: 0.55 }
  if (n === 2 && f.i && f.m) return { letter: 'ت', confidence: 0.55 }
  if (n === 3 && f.i && f.m && f.r) return { letter: 'ث', confidence: 0.55 }
  if (n === 5) return { letter: spread > 0.22 ? 'ش' : 'س', confidence: 0.55 }
  if (n === 0) return { letter: 'م', confidence: 0.5 }

  // تجاهل وضع غير واضح
  if (dist(pinkyTip, wrist) < 0.05) return null
  return null
}

/**
 * عند تفعيل وضع الحروف: يتعرّف على شكل الحرف من الكاميرا ويكتبه على الشاشة.
 */
export function useAlphabetSign({
  landmarksRef,
  enabled = false,
  trackingQuality = 'lost',
  intervalMs = 100,
  stableNeed = 7,
  appendCooldownMs = 900,
} = {}) {
  const [letter, setLetter] = useState(null)
  const [text, setText] = useState('')
  const [pulse, setPulse] = useState(false)

  const streakRef = useRef({ letter: null, count: 0 })
  const lastAppendAtRef = useRef(0)
  const lastAppendLetterRef = useRef('')
  const qualityRef = useRef(trackingQuality)
  qualityRef.current = trackingQuality

  useEffect(() => {
    if (!enabled || trackingQuality === 'lost') {
      streakRef.current = { letter: null, count: 0 }
      setLetter(null)
    }
  }, [enabled, trackingQuality])

  useEffect(() => {
    if (!enabled) return undefined
    const id = window.setInterval(() => {
      if (qualityRef.current === 'lost') {
        setLetter(null)
        return
      }
      const lm = landmarksRef?.current
      const hit = classifyAlphabetLetter(lm)
      if (!hit?.letter) {
        streakRef.current = { letter: null, count: 0 }
        setLetter(null)
        return
      }

      const s = streakRef.current
      if (s.letter === hit.letter) s.count += 1
      else {
        s.letter = hit.letter
        s.count = 1
      }

      if (s.count >= Math.max(3, Math.floor(stableNeed / 2))) {
        setLetter({ letter: hit.letter, confidence: hit.confidence })
      }

      if (s.count < stableNeed) return
      const now = Date.now()
      // كف مفتوح ثابت → مسافة
      if (hit.letter === 'س' || hit.letter === 'ش') {
        // لا تكتب س/ش مكررة بسرعة؛ مسافة عند ثبات أطول
        if (s.count === stableNeed + 4 && now - lastAppendAtRef.current > 1200) {
          setText((t) => (t.endsWith(' ') ? t : `${t} `))
          lastAppendAtRef.current = now
          lastAppendLetterRef.current = ' '
          setPulse(true)
          window.setTimeout(() => setPulse(false), 280)
        }
      }

      if (now - lastAppendAtRef.current < appendCooldownMs) return
      if (lastAppendLetterRef.current === hit.letter && now - lastAppendAtRef.current < appendCooldownMs * 2) {
        return
      }
      lastAppendAtRef.current = now
      lastAppendLetterRef.current = hit.letter
      setText((t) => `${t}${hit.letter}`)
      setPulse(true)
      window.setTimeout(() => setPulse(false), 280)
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [enabled, landmarksRef, intervalMs, stableNeed, appendCooldownMs])

  const clear = () => {
    setText('')
    setLetter(null)
    lastAppendLetterRef.current = ''
  }

  const backspace = () => {
    setText((t) => t.slice(0, -1))
  }

  return { letter, text, pulse, clear, backspace, setText }
}
