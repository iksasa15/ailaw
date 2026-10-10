import { availableSlots, buildRecord, transition } from './logic'
import { buildSeed } from './seed'

export const STORAGE_KEY = 'sg-platform-v1'
const VERSION = 2

/** الحالة المحفوظة، أو بيانات العرض إن كانت مفقودة/تالفة/من إصدار آخر. */
export function loadState(storage, now) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === VERSION && Array.isArray(parsed.lawyers) && Array.isArray(parsed.bookings)) {
        return parsed
      }
    }
  } catch {
    /* تالف أو التخزين محجوب: نبدأ من بيانات العرض */
  }
  return buildSeed(now)
}

export function saveState(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* التخزين ممتلئ أو محجوب: تبقى الحالة في الذاكرة */
  }
}

const newId = () => `b-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function updateBooking(state, id, action) {
  return {
    ...state,
    bookings: state.bookings.map((b) => (b.id === id ? transition(b, action) : b)),
  }
}

/** كل تغيير على المنصة. يرمي `slot-taken` و`invalid-transition`. */
export function reducer(state, action) {
  switch (action.type) {
    case 'login':
      return { ...state, role: action.role }
    case 'logout':
      return { ...state, role: null }
    case 'switchRole':
      return { ...state, role: state.role === 'lawyer' ? 'person' : 'lawyer' }
    case 'book': {
      const lawyer = state.lawyers.find((l) => l.id === action.lawyerId)
      const days = lawyer ? availableSlots(lawyer, state.bookings, { from: action.now, days: 7, now: action.now }) : []
      if (!days.some((d) => d.slots.includes(action.start))) throw new Error('slot-taken')
      const booking = {
        id: newId(),
        personId: 'p1',
        lawyerId: action.lawyerId,
        start: action.start,
        durationMin: 30,
        caseType: action.caseType,
        description: String(action.description || '').slice(0, 300),
        channel: action.channel,
        status: 'pending',
        createdAt: action.now.toISOString(),
      }
      return { ...state, bookings: [...state.bookings, booking], lastBookingId: booking.id }
    }
    case 'instant': {
      const booking = {
        id: newId(),
        personId: 'p1',
        lawyerId: action.lawyerId,
        start: action.now.toISOString(),
        durationMin: 30,
        caseType: action.caseType,
        description: 'استشارة فورية',
        channel: 'sign',
        status: 'confirmed',
        kind: 'instant',
        createdAt: action.now.toISOString(),
      }
      return { ...state, bookings: [...state.bookings, booking], lastBookingId: booking.id }
    }
    case 'rate': {
      const booking = state.bookings.find((b) => b.id === action.id)
      const stars = Math.max(1, Math.min(5, Math.round(action.stars)))
      if (!booking || booking.status !== 'completed' || booking.rating) throw new Error('invalid-rating')
      const text = String(action.text || '').trim().slice(0, 300)
      const author = (state.users[booking.personId]?.name || 'موكّل').split(' ')[0]
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, rating: { stars, text, at: action.now.toISOString() } } : b,
        ),
        lawyers: state.lawyers.map((l) => {
          if (l.id !== booking.lawyerId) return l
          const count = l.reviewsCount + 1
          return {
            ...l,
            reviewsCount: count,
            rating: Math.round(((l.rating * l.reviewsCount + stars) / count) * 10) / 10,
            reviews: [{ author, stars, text: text || 'بدون تعليق' }, ...l.reviews],
          }
        }),
      }
    }
    case 'accept':
    case 'decline':
    case 'cancel':
      return updateBooking(state, action.id, action.type)
    case 'complete': {
      const next = updateBooking(state, action.id, 'complete')
      const record = buildRecord(action.entries, action.startedAt, action.endedAt)
      return { ...next, bookings: next.bookings.map((b) => (b.id === action.id ? { ...b, record } : b)) }
    }
    case 'toggleAvailability':
      return {
        ...state,
        lawyers: state.lawyers.map((l) => {
          if (l.id !== action.lawyerId) return l
          const hours = l.availability?.[action.weekday] || []
          const nextHours = hours.includes(action.hour)
            ? hours.filter((h) => h !== action.hour)
            : [...hours, action.hour].sort((a, b) => a - b)
          return { ...l, availability: { ...l.availability, [action.weekday]: nextHours } }
        }),
      }
    case 'markLesson':
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.course]: { ...(state.progress?.[action.course] || {}), [action.lesson]: true },
        },
      }
    case 'reset':
      return { ...buildSeed(action.now), role: state.role }
    default:
      return state
  }
}
