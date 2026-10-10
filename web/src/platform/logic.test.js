import { describe, expect, test } from 'vitest'
import {
  availableSlots,
  buildRecord,
  courseProgress,
  nextSession,
  recordToText,
  splitSessions,
  transition,
} from './logic'

const iso = (...args) => new Date(...args).toISOString()

describe('availableSlots', () => {
  const lawyer = { id: 'l1', availability: { 0: [9, 10], 1: [9] } }
  const now = new Date(2026, 9, 11, 9, 30) // Sunday 09:30

  test('slots exclude booked, past and off days', () => {
    const booked = [{ lawyerId: 'l1', start: iso(2026, 9, 12, 9), status: 'pending' }]
    const days = availableSlots(lawyer, booked, { from: now, days: 7, now })
    expect(days).toHaveLength(7)
    expect(days[0].date).toBe('2026-10-11')
    expect(days[0].slots).toEqual([iso(2026, 9, 11, 10)]) // 9:00 already passed
    expect(days[1].slots).toEqual([]) // Monday 9:00 booked
    expect(days.find((d) => d.weekday === 5).slots).toEqual([]) // Friday off
  })

  test('cancelled and declined bookings free the slot', () => {
    const booked = [
      { lawyerId: 'l1', start: iso(2026, 9, 12, 9), status: 'cancelled' },
      { lawyerId: 'l1', start: iso(2026, 9, 11, 10), status: 'declined' },
    ]
    const days = availableSlots(lawyer, booked, { from: now, days: 2, now })
    expect(days[0].slots).toEqual([iso(2026, 9, 11, 10)])
    expect(days[1].slots).toEqual([iso(2026, 9, 12, 9)])
  })

  test("another lawyer's booking does not take the slot", () => {
    const booked = [{ lawyerId: 'l2', start: iso(2026, 9, 12, 9), status: 'confirmed' }]
    const days = availableSlots(lawyer, booked, { from: now, days: 2, now })
    expect(days[1].slots).toEqual([iso(2026, 9, 12, 9)])
  })
})

describe('transition', () => {
  test('pending → accept → confirmed → complete', () => {
    const confirmed = transition({ id: 'b', status: 'pending' }, 'accept')
    expect(confirmed.status).toBe('confirmed')
    expect(transition(confirmed, 'complete').status).toBe('completed')
  })

  test('pending can be declined or cancelled', () => {
    expect(transition({ status: 'pending' }, 'decline').status).toBe('declined')
    expect(transition({ status: 'pending' }, 'cancel').status).toBe('cancelled')
  })

  test('completed cannot be cancelled', () => {
    expect(() => transition({ status: 'completed' }, 'cancel')).toThrow('invalid-transition')
  })

  test('pending cannot be completed', () => {
    expect(() => transition({ status: 'pending' }, 'complete')).toThrow('invalid-transition')
  })
})

describe('splitSessions / nextSession', () => {
  const now = new Date(2026, 9, 11, 12, 0)
  const b = (id, start, status) => ({ id, start, status })

  test('confirmed session started 30 min ago is still upcoming', () => {
    const { upcoming, past } = splitSessions([b('a', iso(2026, 9, 11, 11, 30), 'confirmed')], now)
    expect(upcoming.map((x) => x.id)).toEqual(['a'])
    expect(past).toEqual([])
  })

  test('completed, cancelled and declined are past; old pending is past', () => {
    const all = [
      b('c', iso(2026, 9, 12, 9), 'completed'),
      b('x', iso(2026, 9, 12, 10), 'cancelled'),
      b('d', iso(2026, 9, 12, 11), 'declined'),
      b('p', iso(2026, 9, 10, 9), 'pending'),
    ]
    const { upcoming, past } = splitSessions(all, now)
    expect(upcoming).toEqual([])
    expect(past.map((x) => x.id).sort()).toEqual(['c', 'd', 'p', 'x'])
  })

  test('upcoming is sorted soonest first, past newest first', () => {
    const all = [
      b('late', iso(2026, 9, 14, 9), 'pending'),
      b('soon', iso(2026, 9, 11, 13), 'confirmed'),
      b('old', iso(2026, 9, 1, 9), 'completed'),
      b('older', iso(2026, 8, 1, 9), 'completed'),
    ]
    const { upcoming, past } = splitSessions(all, now)
    expect(upcoming.map((x) => x.id)).toEqual(['soon', 'late'])
    expect(past.map((x) => x.id)).toEqual(['old', 'older'])
    expect(nextSession(all, now).id).toBe('soon')
  })

  test('no upcoming session gives null', () => {
    expect(nextSession([], now)).toBeNull()
  })
})

describe('buildRecord', () => {
  test('record dedupes consecutive phrases and splits roles', () => {
    const r = buildRecord(
      [
        { role: 'person', text: 'أ', at: 1 },
        { role: 'person', text: 'أ', at: 2 },
        { role: 'lawyer', text: 'ب', at: 3 },
        { role: 'person', text: 'ج', at: 4 },
      ],
      0,
      600000,
    )
    expect(r.durationSec).toBe(600)
    expect(r.summary.facts).toEqual(['أ', 'ج'])
    expect(r.summary.lawyerNotes).toEqual(['ب'])
    expect(r.entries).toHaveLength(3)
  })

  test('empty conversation gives an empty summary', () => {
    const r = buildRecord([], 1000, 61000)
    expect(r.durationSec).toBe(60)
    expect(r.summary).toEqual({ facts: [], lawyerNotes: [] })
    expect(r.entries).toEqual([])
  })
})

describe('recordToText', () => {
  test('includes parties, case, summary and transcript', () => {
    const booking = {
      id: 'b1',
      start: iso(2026, 9, 9, 10),
      caseType: 'حادث مروري',
      channel: 'sign',
      record: buildRecord(
        [
          { role: 'lawyer', text: 'ماذا حدث؟', at: new Date(2026, 9, 9, 10, 1).getTime() },
          { role: 'person', text: 'اصطدم بي', at: new Date(2026, 9, 9, 10, 2).getTime() },
        ],
        new Date(2026, 9, 9, 10).getTime(),
        new Date(2026, 9, 9, 10, 12).getTime(),
      ),
    }
    const text = recordToText({ booking, lawyer: { name: 'أ. سارة' }, person: { name: 'أحمد' } })
    for (const part of ['محضر جلسة', 'أ. سارة', 'أحمد', 'حادث مروري', 'اصطدم بي', 'ماذا حدث؟', '12']) {
      expect(text).toContain(part)
    }
  })
})

describe('courseProgress', () => {
  test('progress rounds to a percent', () => {
    const course = { id: 'c', lessons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
    expect(courseProgress(course, { a: true })).toBe(33)
    expect(courseProgress(course, { a: true, b: true, c: true })).toBe(100)
    expect(courseProgress(course, undefined)).toBe(0)
  })
})
