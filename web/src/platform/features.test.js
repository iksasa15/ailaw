import { describe, expect, test } from 'vitest'
import { buildSeed } from './seed'
import { reducer } from './store'
import { certificateNumber, earnedBadges, impactStats, pickInstantLawyer } from './features'

const NOW = new Date(2026, 9, 11, 10, 15) // Sunday 10:15

describe('pickInstantLawyer', () => {
  const lawyers = [
    { id: 'a', onlineNow: true, signFluent: false, rating: 4.9, specialties: ['جنائي'] },
    { id: 'b', onlineNow: true, signFluent: true, rating: 4.6, specialties: ['مرور'] },
    { id: 'c', onlineNow: false, signFluent: true, rating: 5, specialties: ['مرور'] },
    { id: 'd', onlineNow: true, signFluent: true, rating: 4.8, specialties: ['أسرة'] },
  ]

  test('prefers the matching specialty among online lawyers', () => {
    expect(pickInstantLawyer(lawyers, [], NOW, 'جنائي').id).toBe('a')
    expect(pickInstantLawyer(lawyers, [], NOW, 'مرور').id).toBe('b')
  })

  test('without a match prefers sign-fluent, then rating', () => {
    expect(pickInstantLawyer(lawyers, [], NOW, 'عقود').id).toBe('d')
  })

  test('a lawyer in a session now is skipped', () => {
    const busy = [{ lawyerId: 'b', status: 'confirmed', start: new Date(2026, 9, 11, 10, 0).toISOString() }]
    expect(pickInstantLawyer(lawyers, busy, NOW, 'مرور').id).toBe('d')
  })

  test('nobody online gives null', () => {
    expect(pickInstantLawyer([{ id: 'x', onlineNow: false }], [], NOW, 'مرور')).toBeNull()
  })
})

describe('instant and rate actions', () => {
  const seed = buildSeed(NOW)

  test('instant creates a confirmed session starting now', () => {
    const s = reducer(seed, { type: 'instant', lawyerId: 'l3', caseType: 'أسرة', now: NOW })
    const b = s.bookings.find((x) => x.id === s.lastBookingId)
    expect(b).toMatchObject({ personId: 'p1', lawyerId: 'l3', status: 'confirmed', kind: 'instant', caseType: 'أسرة' })
    expect(new Date(b.start).getTime()).toBe(NOW.getTime())
  })

  test('rating a completed session adds a review and updates the average', () => {
    const before = seed.lawyers.find((l) => l.id === 'l1')
    const s = reducer(seed, { type: 'rate', id: 'b-done', stars: 5, text: 'ممتازة', now: NOW })
    const after = s.lawyers.find((l) => l.id === 'l1')
    expect(after.reviewsCount).toBe(before.reviewsCount + 1)
    expect(after.reviews[0]).toMatchObject({ author: 'أحمد', stars: 5, text: 'ممتازة' })
    expect(after.rating).toBe(Math.round(((before.rating * before.reviewsCount + 5) / (before.reviewsCount + 1)) * 10) / 10)
    expect(s.bookings.find((b) => b.id === 'b-done').rating).toMatchObject({ stars: 5, text: 'ممتازة' })
  })

  test('a session can be rated once, and only when completed', () => {
    const s = reducer(seed, { type: 'rate', id: 'b-done', stars: 4, text: '', now: NOW })
    expect(() => reducer(s, { type: 'rate', id: 'b-done', stars: 4, text: '', now: NOW })).toThrow('invalid-rating')
    expect(() => reducer(seed, { type: 'rate', id: 'b-req', stars: 4, text: '', now: NOW })).toThrow('invalid-rating')
  })
})

describe('earnedBadges', () => {
  test('nothing earned on an empty progress without sessions', () => {
    const state = { progress: {}, bookings: [] }
    expect(earnedBadges(state).every((b) => !b.earned)).toBe(true)
  })

  test('first lesson, ten letters, first session and first rating', () => {
    const letters = Object.fromEntries(['alef', 'ba', 'ta', 'tha', 'jeem', 'ha', 'kha', 'dal', 'dhal', 'ra'].map((k) => [k, true]))
    const state = {
      progress: { letters },
      bookings: [{ personId: 'p1', status: 'completed', rating: { stars: 5 } }],
    }
    const earned = earnedBadges(state).filter((b) => b.earned).map((b) => b.id)
    expect(earned).toEqual(expect.arrayContaining(['first-lesson', 'ten-letters', 'first-session', 'first-rating']))
    expect(earned).not.toContain('all-letters')
  })
})

describe('certificateNumber', () => {
  test('is stable and course specific', () => {
    expect(certificateNumber('letters', 'أحمد')).toBe(certificateNumber('letters', 'أحمد'))
    expect(certificateNumber('letters', 'أحمد')).not.toBe(certificateNumber('words', 'أحمد'))
    expect(certificateNumber('letters', 'أحمد')).toMatch(/^SG-[A-Z]{3}-[0-9A-F]{6}$/)
  })
})

describe('impactStats', () => {
  const at = (d, h = 10) => new Date(2026, 9, d, h).toISOString()
  const record = (entries) => ({ durationSec: 600, entries })
  const bookings = [
    { status: 'completed', start: at(9), caseType: 'مرور', record: record([{ role: 'person' }, { role: 'lawyer' }, { role: 'person' }]) },
    { status: 'completed', start: at(1), caseType: 'أسرة', record: record([{ role: 'lawyer' }]) },
    { status: 'confirmed', start: at(12), caseType: 'مرور' },
    { status: 'cancelled', start: at(8), caseType: 'عمل' },
  ]

  test('totals count completed sessions only', () => {
    const s = impactStats(bookings, NOW, 8)
    expect(s.completed).toBe(2)
    expect(s.minutes).toBe(20)
    expect(s.phrases).toBe(4)
    expect(s.signToVoice).toBe(2)
    expect(s.voiceToSign).toBe(2)
  })

  test('weekly counts cover the requested weeks, oldest first', () => {
    const s = impactStats(bookings, NOW, 8)
    expect(s.perWeek).toHaveLength(8)
    // Weeks start on Sunday: Oct 11–17 (current), Oct 4–10 (holds Oct 9), Sep 27–Oct 3 (holds Oct 1).
    expect(s.perWeek.map((w) => w.count).slice(-3)).toEqual([1, 1, 0])
    expect(s.perWeek.at(-1).start).toBe('2026-10-11')
  })

  test('case types are sorted by count', () => {
    const s = impactStats(bookings, NOW, 8)
    expect(s.caseTypes).toEqual([
      { type: 'أسرة', count: 1 },
      { type: 'مرور', count: 1 },
    ])
  })
})
