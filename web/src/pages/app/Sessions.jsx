import { useState } from 'react'
import { Link } from 'react-router-dom'
import { splitSessions } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { SessionCard } from '../../components/platform/SessionCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'

/** «جلساتي» للدورين: قادمة (الأقرب أولاً) وسابقة. */
export default function Sessions() {
  const { state, myBookings } = usePlatform()
  const now = useNow()
  const [tab, setTab] = useState('upcoming')
  const { upcoming, past } = splitSessions(myBookings, now)
  const list = tab === 'upcoming' ? upcoming : past
  return (
    <div>
      <div className="mb-5 inline-flex rounded-2xl bg-white p-1 ring-1 ring-[var(--ring)]">
        {[
          ['upcoming', `قادمة (${upcoming.length})`],
          ['past', `سابقة (${past.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-10 rounded-xl px-5 text-sm font-bold ${tab === key ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="flex flex-col gap-3">
          {list.map((b) => (
            <SessionCard key={b.id} booking={b} now={now} upcoming={tab === 'upcoming'} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="calendar"
          title={tab === 'upcoming' ? 'لا جلسات قادمة' : 'لا جلسات سابقة'}
          text={state.role === 'person' ? 'احجز جلسة مع محامٍ يفهم احتياجك.' : 'ستظهر هنا الجلسات بعد قبول الطلبات.'}
          action={
            state.role === 'person' ? (
              <Button as={Link} to="/app/lawyers">
                تصفّح المحامين
              </Button>
            ) : null
          }
        />
      )}
    </div>
  )
}
