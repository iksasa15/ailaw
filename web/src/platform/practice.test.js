import { describe, expect, test } from 'vitest'
import { practiceStep } from './practice'

describe('practiceStep', () => {
  const start = { since: null, progress: 0, done: false }

  test('matching reading held for holdMs completes', () => {
    let s = practiceStep(start, 'أ', 'أ', 1000, 1500)
    expect(s).toEqual({ since: 1000, progress: 0, done: false })
    s = practiceStep(s, 'أ', 'أ', 1750, 1500)
    expect(s.progress).toBe(0.5)
    s = practiceStep(s, 'أ', 'أ', 2500, 1500)
    expect(s.done).toBe(true)
    expect(s.progress).toBe(1)
  })

  test('a wrong or missing reading restarts the hold', () => {
    let s = practiceStep(start, 3, 3, 0, 1500)
    s = practiceStep(s, 3, 3, 1000, 1500)
    s = practiceStep(s, 2, 3, 1100, 1500)
    expect(s).toEqual({ since: null, progress: 0, done: false })
    s = practiceStep(s, null, 3, 1200, 1500)
    expect(s.since).toBeNull()
  })

  test('done stays done', () => {
    const done = { since: 0, progress: 1, done: true }
    expect(practiceStep(done, null, 'ب', 9999, 1500)).toBe(done)
  })
})
