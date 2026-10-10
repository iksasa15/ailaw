import { useMemo, useState } from 'react'
import { availableSlots } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { LawyerCard } from '../../components/platform/LawyerCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

const SPECIALTIES = ['مرور', 'تعويضات', 'أسرة', 'عمل', 'جنائي', 'عقود']

export default function LawyersDirectory() {
  const { state } = usePlatform()
  const now = useNow(60_000)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState(null)
  const [signOnly, setSignOnly] = useState(false)

  const lawyers = useMemo(() => {
    const q = query.trim()
    return state.lawyers
      .filter((l) => !q || l.name.includes(q) || l.city.includes(q))
      .filter((l) => !specialty || l.specialties.includes(specialty))
      .filter((l) => !signOnly || l.signFluent)
      .map((l) => ({
        lawyer: l,
        nextSlot: availableSlots(l, state.bookings, { from: now, days: 7, now }).find((d) => d.slots.length)?.slots[0] || null,
      }))
  }, [state.lawyers, state.bookings, query, specialty, signOnly, now])

  const chip = (active) =>
    `min-h-9 rounded-full px-4 text-sm font-bold transition ${active ? 'bg-[var(--accent)] text-white' : 'bg-white text-[var(--ink)] ring-1 ring-[var(--ring)] hover:bg-[var(--accent)]/5'}`

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <label className="relative block max-w-xl">
          <span className="sr-only">بحث</span>
          <Icon name="search" size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المحامي أو المدينة"
            className="min-h-12 w-full rounded-2xl border border-[var(--ring)] bg-white ps-12 pe-4 text-[15px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip(!specialty)} onClick={() => setSpecialty(null)}>
            الكل
          </button>
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" className={chip(specialty === s)} onClick={() => setSpecialty(specialty === s ? null : s)}>
              {s}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-[var(--ring)]" />
          <button type="button" className={chip(signOnly)} onClick={() => setSignOnly((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="hand" size={15} /> يتقن الإشارة
            </span>
          </button>
        </div>
      </div>
      {lawyers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lawyers.map(({ lawyer, nextSlot }) => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} nextSlot={nextSlot} />
          ))}
        </div>
      ) : (
        <EmptyState icon="search" title="لا نتائج" text="جرّب كلمة بحث أخرى أو أزل التصفية." />
      )}
    </div>
  )
}
