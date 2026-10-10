import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadState, reducer, saveState } from './store'

const PlatformContext = createContext(null)

const storage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const ERROR_MESSAGES = {
  'slot-taken': 'هذا الموعد لم يعد متاحاً، اختر وقتاً آخر.',
  'invalid-transition': 'لا يمكن تنفيذ هذا الإجراء على الحجز في حالته الحالية.',
}

export function PlatformProvider({ children }) {
  const [state, setState] = useState(() => loadState(storage(), new Date()))
  // الحالة الأحدث متزامنة: نقرتان سريعتان على «تأكيد» ترى الحجز الأول.
  const latest = useRef(state)

  useEffect(() => {
    saveState(storage(), state)
  }, [state])

  const run = useCallback((action) => {
    const next = reducer(latest.current, action)
    latest.current = next
    setState(next)
    return next
  }, [])

  /** ينفّذ إجراءً قد يُرفض ويعيد `{ ok, error? }` بدل الرمي. */
  const attempt = useCallback(
    (action) => {
      try {
        return { ok: true, state: run(action) }
      } catch (e) {
        return { ok: false, error: ERROR_MESSAGES[e.message] || 'حدث خطأ غير متوقع.' }
      }
    },
    [run],
  )

  const value = useMemo(() => {
    const me = state.role === 'lawyer' ? state.users.l1 : state.role === 'person' ? state.users.p1 : null
    return {
      state,
      me,
      lawyerById: (id) => state.lawyers.find((l) => l.id === id) || null,
      userById: (id) => state.users[id] || null,
      /** حجوزات الحساب الحالي فقط. */
      myBookings:
        state.role === 'lawyer'
          ? state.bookings.filter((b) => b.lawyerId === 'l1')
          : state.bookings.filter((b) => b.personId === 'p1'),
      login: (role) => run({ type: 'login', role }),
      logout: () => run({ type: 'logout' }),
      switchRole: () => run({ type: 'switchRole' }),
      book: ({ lawyerId, start, caseType, description, channel }) => {
        const r = attempt({ type: 'book', lawyerId, start, caseType, description, channel, now: new Date() })
        return r.ok ? { ok: true, id: r.state.lastBookingId } : r
      },
      accept: (id) => attempt({ type: 'accept', id }),
      decline: (id) => attempt({ type: 'decline', id }),
      cancel: (id) => attempt({ type: 'cancel', id }),
      complete: (id, entries, startedAt, endedAt = Date.now()) =>
        attempt({ type: 'complete', id, entries, startedAt, endedAt }),
      toggleAvailability: (weekday, hour) => run({ type: 'toggleAvailability', lawyerId: 'l1', weekday, hour }),
      markLesson: (course, lesson) => run({ type: 'markLesson', course, lesson }),
      resetDemo: () => run({ type: 'reset', now: new Date() }),
    }
  }, [state, run, attempt])

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider')
  return ctx
}
