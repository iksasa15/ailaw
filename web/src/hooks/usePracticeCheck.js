import { useEffect, useState } from 'react'
import { classifyAlphabetLetter } from './useAlphabetSign'
import { countFingersFromHands } from './useFingerPhrases'
import { practiceStep } from '../platform/practice'

/**
 * تدريب الدرس: يقرأ اليد كل 100ms، وعندما تطابق القراءة المطلوب لمدة `holdMs` متصلة يصبح `done`.
 * `practice`: `{ kind: 'letter', target: 'أ' }` أو `{ kind: 'fingers', target: 3 }`.
 */
export function usePracticeCheck({ landmarksRef, allHandsRef, practice, holdMs = 1500, enabled }) {
  const [state, setState] = useState({ reading: null, progress: 0, done: false })

  // Lesson remounts this hook per lesson (key), so the state starts fresh.
  useEffect(() => {
    if (!enabled || !practice) return undefined
    let step = { since: null, progress: 0, done: false }
    const t = window.setInterval(() => {
      const reading =
        practice.kind === 'letter'
          ? classifyAlphabetLetter(landmarksRef.current)?.letter ?? null
          : (allHandsRef.current?.length ? countFingersFromHands(allHandsRef.current) : null)
      step = practiceStep(step, reading, practice.target, Date.now(), holdMs)
      setState({ reading, progress: step.progress, done: step.done })
      if (step.done) window.clearInterval(t)
    }, 100)
    return () => window.clearInterval(t)
  }, [enabled, practice, holdMs, landmarksRef, allHandsRef])

  return state
}
