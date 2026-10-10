import { expect, test } from 'vitest'
import { advance, currentStep, enqueue, initialQueue, MAX_PENDING, pending, replay, skipToLatest } from './signQueue'

const S1 = { id: 'a', text: 'السلام عليكم، أنا محاميك' } // خطوتان
const S2 = { id: 'b', text: 'أين وقع الحادث؟' } // خطوتان
const S3 = { id: 'c', text: 'هل أصيب أحد؟' } // خطوتان
const S4 = { id: 'd', text: 'شكرا' } // خطوة
const S5 = { id: 'e', text: 'نعم' } // خطوة
const all = (...s) => s.reduce((q, x) => enqueue(q, x), initialQueue)

test('the first sentence starts at once', () => {
  const q = all(S1)
  expect(currentStep(q).item.id).toBe('a')
  expect([q.step, pending(q)]).toEqual([0, 0])
})
test('a new sentence waits — it never cuts the current one', () => {
  const q = all(S1, S2)
  expect(currentStep(q).item.id).toBe('a')
  expect(pending(q)).toBe(1)
})
test('advance walks steps, then sentences, then stops after the last', () => {
  let q = all(S1, S2)
  q = advance(q)
  expect([q.current, q.step]).toEqual([0, 1])
  q = advance(q)
  expect([q.current, q.step]).toEqual([1, 0])
  q = advance(advance(q))
  expect(q.done).toBe(true)
  expect(advance(q)).toBe(q)
})
test('a sentence after the end starts right away', () => {
  let q = advance(all(S4))
  expect(q.done).toBe(true)
  q = enqueue(q, S5)
  expect(currentStep(q).item.id).toBe('e')
  expect(q.done).toBe(false)
})
test('duplicate ids and sentences with nothing to sign are ignored', () => {
  const q = all(S1)
  expect(enqueue(q, S1)).toBe(q)
  expect(enqueue(q, { id: 'z', text: 'في على' })).toBe(q)
})
test(`more than ${MAX_PENDING} waiting jumps to the newest`, () => {
  let q = all(S1, S2, S3, S4)
  expect([q.current, pending(q)]).toEqual([0, 3])
  q = enqueue(q, S5)
  expect(currentStep(q).item.id).toBe('e')
  expect(pending(q)).toBe(0)
})
test('five sentences at once start at the newest (phone joins late)', () => {
  expect(currentStep(all(S1, S2, S3, S4, S5)).item.id).toBe('e')
})
test('skipToLatest and replay', () => {
  let q = skipToLatest(all(S1, S2))
  expect([q.current, q.step]).toEqual([1, 0])
  q = replay(advance(q))
  expect(q.step).toBe(0)
  expect(skipToLatest(initialQueue)).toBe(initialQueue)
  expect(replay(initialQueue)).toBe(initialQueue)
})
