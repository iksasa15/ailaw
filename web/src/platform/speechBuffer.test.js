import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createSpeechBuffer, speechStateOf } from './speechBuffer'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const collect = (opts) => {
  const out = []
  return { out, b: createSpeechBuffer({ ...opts, onSentence: (t) => out.push(t) }) }
}

test('chunks within the pause become one sentence, once', () => {
  const { out, b } = collect({ pauseMs: 800 })
  b.push('أين')
  vi.advanceTimersByTime(500)
  b.push('وقع الحادث')
  vi.advanceTimersByTime(799)
  expect(out).toEqual([])
  vi.advanceTimersByTime(1)
  expect(out).toEqual(['أين وقع الحادث'])
  vi.advanceTimersByTime(5000)
  expect(out).toEqual(['أين وقع الحادث'])
})
test('a long monologue is cut every 12 words without waiting for a pause', () => {
  const { out, b } = collect({})
  const words = 'ا ب ت ث ج ح خ د ذ ر ز س ش'.split(' ')
  b.push(words.slice(0, 10).join(' '))
  b.push(words.slice(10).join(' '))
  expect(out).toEqual([words.join(' ')])
  b.push('بعد')
  vi.advanceTimersByTime(800)
  expect(out).toEqual([words.join(' '), 'بعد'])
})
test('flush emits now, cancel drops, blank chunks are ignored', () => {
  const { out, b } = collect({})
  b.push('   ')
  vi.advanceTimersByTime(1000)
  expect(out).toEqual([])
  b.push('نعم')
  b.flush()
  expect(out).toEqual(['نعم'])
  b.push('لا')
  b.cancel()
  vi.advanceTimersByTime(1000)
  expect(out).toEqual(['نعم'])
})
test('speech state for the translator status line', () => {
  expect(speechStateOf({ receiveEnabled: false, supported: false, status: 'error' })).toBe('off')
  expect(speechStateOf({ receiveEnabled: true, supported: false, status: 'idle' })).toBe('unsupported')
  expect(speechStateOf({ receiveEnabled: true, supported: true, status: 'error' })).toBe('error')
  expect(speechStateOf({ receiveEnabled: true, supported: true, status: 'idle' })).toBe('listening')
})
