import { describe, expect, test } from 'vitest'
import { buildSeed } from './seed'
import { STORAGE_KEY, loadState, reducer, saveState } from './store'
import { availableSlots } from './logic'

const NOW = new Date(2026, 9, 11, 10, 15) // Sunday 10:15

function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[STORAGE_KEY, initial]])
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  }
}

describe('seed', () => {
  test('demo data: two users, six lawyers, bookings in each state', () => {
    const s = buildSeed(NOW)
    expect(s.version).toBe(2)
    expect(s.role).toBeNull()
    expect(s.users.p1.name).toBe('أحمد العتيبي')
    expect(s.users.l1.name).toBe('أ. سارة القحطاني')
    expect(s.lawyers).toHaveLength(6)
    const statuses = s.bookings.map((b) => b.status)
    expect(statuses).toContain('pending')
    expect(statuses).toContain('confirmed')
    expect(statuses).toContain('completed')
    const done = s.bookings.find((b) => b.status === 'completed')
    expect(done.record.summary.facts.length).toBeGreaterThan(5)
  })

  test('three lawyers are online for instant consultations', () => {
    expect(buildSeed(NOW).lawyers.filter((l) => l.onlineNow).map((l) => l.id)).toEqual(['l1', 'l3', 'l6'])
  })

  test('past completed sessions over the last weeks feed the impact charts', () => {
    const history = buildSeed(NOW).bookings.filter((b) => b.status === 'completed' && b.id.startsWith('h-'))
    expect(history.length).toBeGreaterThanOrEqual(10)
    expect(history.every((b) => b.record.entries.length >= 2 && new Date(b.start) < NOW)).toBe(true)
  })

  test("today's confirmed session starts at least 30 minutes after the data is created", () => {
    for (const minute of [0, 29, 31, 59]) {
      const now = new Date(2026, 9, 11, 13, minute)
      const start = new Date(buildSeed(now).bookings.find((b) => b.id === 'b-today').start)
      expect(start.getTime() - now.getTime()).toBeGreaterThanOrEqual(30 * 60_000)
    }
  })

  test("today's confirmed session moves to tomorrow late in the day", () => {
    const late = buildSeed(new Date(2026, 9, 11, 16, 30))
    const confirmed = late.bookings.find((b) => b.status === 'confirmed' && b.lawyerId === 'l1')
    expect(new Date(confirmed.start).getDate()).toBe(12)
  })
})

describe('loadState', () => {
  test('empty storage seeds', () => {
    expect(loadState(memoryStorage(), NOW).lawyers).toHaveLength(6)
  })

  test('corrupt json seeds', () => {
    expect(loadState(memoryStorage('{bad json'), NOW).lawyers).toHaveLength(6)
  })

  test('old version seeds', () => {
    expect(loadState(memoryStorage(JSON.stringify({ version: 0 })), NOW).lawyers).toHaveLength(6)
  })

  test('version 1 data (before instant consultations) is replaced by the new seed', () => {
    const old = { ...buildSeed(NOW), version: 1 }
    expect(loadState(memoryStorage(JSON.stringify(old)), NOW).version).toBe(2)
  })

  test('saved state round-trips', () => {
    const storage = memoryStorage()
    const s = reducer(buildSeed(NOW), { type: 'login', role: 'person' })
    saveState(storage, s)
    expect(loadState(storage, NOW).role).toBe('person')
  })
})

describe('reducer', () => {
  const seed = buildSeed(NOW)
  const lawyer = seed.lawyers.find((l) => l.id === 'l2')
  const slot = availableSlots(lawyer, seed.bookings, { from: NOW, days: 7, now: NOW }).find((d) => d.slots.length)
    .slots[0]
  const bookAction = {
    type: 'book',
    lawyerId: 'l2',
    start: slot,
    caseType: 'جنائي',
    description: 'وصف',
    channel: 'sign',
    now: NOW,
  }

  test('login, switchRole and logout', () => {
    const s = reducer(seed, { type: 'login', role: 'person' })
    expect(s.role).toBe('person')
    expect(reducer(s, { type: 'switchRole' }).role).toBe('lawyer')
    expect(reducer(s, { type: 'logout' }).role).toBeNull()
  })

  test('book an available slot creates a pending booking for p1', () => {
    const s = reducer(seed, bookAction)
    const b = s.bookings[s.bookings.length - 1]
    expect(s.bookings).toHaveLength(seed.bookings.length + 1)
    expect(b).toMatchObject({ personId: 'p1', lawyerId: 'l2', start: slot, status: 'pending', channel: 'sign' })
    expect(s.lastBookingId).toBe(b.id)
  })

  test('booking the same slot twice throws slot-taken', () => {
    const s = reducer(seed, bookAction)
    expect(() => reducer(s, bookAction)).toThrow('slot-taken')
  })

  test('accept then complete builds the record', () => {
    let s = reducer(seed, bookAction)
    const id = s.lastBookingId
    s = reducer(s, { type: 'accept', id })
    expect(s.bookings.find((b) => b.id === id).status).toBe('confirmed')
    s = reducer(s, {
      type: 'complete',
      id,
      entries: [{ role: 'person', text: 'مرحبا', at: 5 }],
      startedAt: 0,
      endedAt: 120000,
    })
    const done = s.bookings.find((b) => b.id === id)
    expect(done.status).toBe('completed')
    expect(done.record.summary.facts).toEqual(['مرحبا'])
    expect(done.record.durationSec).toBe(120)
  })

  test('decline and cancel', () => {
    const s = reducer(seed, bookAction)
    expect(reducer(s, { type: 'decline', id: s.lastBookingId }).bookings.at(-1).status).toBe('declined')
    expect(reducer(s, { type: 'cancel', id: s.lastBookingId }).bookings.at(-1).status).toBe('cancelled')
  })

  test('toggleAvailability adds and removes the hour', () => {
    const before = seed.lawyers.find((l) => l.id === 'l1').availability[2] || []
    const hour = before.includes(16) ? 16 : 16
    const s1 = reducer(seed, { type: 'toggleAvailability', lawyerId: 'l1', weekday: 2, hour })
    const s2 = reducer(s1, { type: 'toggleAvailability', lawyerId: 'l1', weekday: 2, hour })
    const after1 = s1.lawyers.find((l) => l.id === 'l1').availability[2] || []
    expect(after1.includes(hour)).toBe(!before.includes(hour))
    expect([...(s2.lawyers.find((l) => l.id === 'l1').availability[2] || [])].sort()).toEqual([...before].sort())
  })

  test('markLesson stores progress per course', () => {
    const s = reducer(seed, { type: 'markLesson', course: 'letters', lesson: 'alef' })
    expect(s.progress.letters.alef).toBe(true)
  })

  test('reset returns the seed but keeps the role', () => {
    let s = reducer(seed, { type: 'login', role: 'lawyer' })
    s = reducer(s, bookAction)
    const r = reducer(s, { type: 'reset', now: NOW })
    expect(r.bookings).toHaveLength(seed.bookings.length)
    expect(r.role).toBe('lawyer')
  })
})
