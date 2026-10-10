import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CHANNEL_LABELS, availableSlots, formatDate, formatTime } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'

const LOCALE = 'ar-SA-u-nu-latn-ca-gregory'
const MAX_DESC = 300
const STEPS = ['الموعد', 'القضية', 'التأكيد']

/** الحجز بثلاث خطوات (المواصفات §4.4). */
export function BookingWizard({ lawyer }) {
  const { state, book } = usePlatform()
  const now = useNow(60_000)
  const days = useMemo(() => availableSlots(lawyer, state.bookings, { from: now, days: 7, now }), [lawyer, state.bookings, now])
  const [step, setStep] = useState(0)
  const [date, setDate] = useState(() => days.find((d) => d.slots.length)?.date || null)
  const [slot, setSlot] = useState(null)
  const [caseType, setCaseType] = useState(lawyer.specialties[0])
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('sign')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState(null)

  const day = days.find((d) => d.date === date)
  const slotStillFree = slot && day?.slots.includes(slot)

  const confirm = () => {
    if (busy) return
    setBusy(true)
    const result = book({ lawyerId: lawyer.id, start: slot, caseType, description, channel })
    setBusy(false)
    if (result.ok) {
      setDoneId(result.id)
    } else {
      setError(result.error)
      setSlot(null)
      setStep(0)
    }
  }

  if (doneId) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" size={32} strokeWidth={3} />
        </span>
        <h3 className="text-xl font-black">تم إرسال طلب الحجز</h3>
        <p className="text-[var(--muted)]">
          {formatDate(slot)} · {formatTime(slot)}
          <br />
          بانتظار تأكيد {lawyer.name}.
        </p>
        <Button as={Link} to="/app/sessions" className="mt-2">
          عرض جلساتي
        </Button>
      </div>
    )
  }

  const chip = (active, disabled) =>
    `rounded-2xl border px-3 py-2 text-center transition ${
      disabled
        ? 'cursor-not-allowed border-dashed border-[var(--ring)] text-[var(--muted)]/60'
        : active
          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : 'border-[var(--ring)] bg-white hover:border-[var(--accent)]/50'
    }`

  return (
    <div>
      <ol className="mb-5 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                i <= step ? 'bg-[var(--accent)] text-white' : 'bg-black/5 text-[var(--muted)]'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm font-bold ${i === step ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{label}</span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-[var(--ring)]" /> : null}
          </li>
        ))}
      </ol>

      {error ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      {step === 0 ? (
        <div>
          <div className="mb-2 text-sm font-bold text-[var(--muted)]">اختر اليوم</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((d) => {
              const disabled = !d.slots.length
              const label = new Date(`${d.date}T12:00:00`)
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setDate(d.date)
                    setSlot(null)
                  }}
                  className={chip(d.date === date, disabled)}
                  title={disabled ? 'لا مواعيد' : undefined}
                >
                  <div className="text-xs">{label.toLocaleDateString(LOCALE, { weekday: 'short' })}</div>
                  <div className="text-lg font-black tabular-nums">{label.getDate()}</div>
                  {disabled ? <div className="text-[10px]">لا مواعيد</div> : null}
                </button>
              )
            })}
          </div>
          <div className="mb-2 mt-5 text-sm font-bold text-[var(--muted)]">الأوقات المتاحة</div>
          {day?.slots.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {day.slots.map((s) => (
                <button key={s} type="button" onClick={() => setSlot(s)} className={`${chip(s === slot, false)} min-h-11 font-bold tabular-nums`}>
                  {formatTime(s)}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-black/[0.03] px-4 py-3 text-sm text-[var(--muted)]">لا توجد مواعيد متاحة خلال الأيام السبعة القادمة.</p>
          )}
          <Button className="mt-5 w-full" disabled={!slotStillFree} onClick={() => { setError(''); setStep(1) }}>
            التالي
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--muted)]">نوع القضية</span>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-[var(--ring)] bg-white px-4 text-[15px]"
            >
              {[...lawyer.specialties, 'أخرى'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-sm font-bold text-[var(--muted)]">
              <span>وصف مختصر (اختياري)</span>
              <span className="tabular-nums">{description.length}/{MAX_DESC}</span>
            </span>
            <textarea
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="مثال: تعرضت لحادث وشركة التأمين رفضت التعويض."
              className="w-full rounded-2xl border border-[var(--ring)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold text-[var(--muted)]">طريقة التواصل المفضلة</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['sign', 'hand', 'لغة الإشارة'],
                ['text', 'message', 'الكتابة'],
              ].map(([value, icon, label]) => (
                <button key={value} type="button" onClick={() => setChannel(value)} className={`${chip(channel === value, false)} flex min-h-12 items-center justify-center gap-2 font-bold`}>
                  <Icon name={icon} size={18} /> {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              رجوع
            </Button>
            <Button className="flex-1" onClick={() => setStep(2)}>
              التالي
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <dl className="divide-y divide-[var(--ring)] rounded-2xl bg-[var(--bg)] px-4">
            {[
              ['المحامي', lawyer.name],
              ['الموعد', slot ? `${formatDate(slot)} · ${formatTime(slot)}` : '—'],
              ['المدة', '30 دقيقة'],
              ['نوع القضية', caseType],
              ['طريقة التواصل', CHANNEL_LABELS[channel]],
              ['الوصف', description.trim() || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3 text-[15px]">
                <dt className="text-[var(--muted)]">{k}</dt>
                <dd className="text-left font-bold text-[var(--ink)]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              رجوع
            </Button>
            <Button className="flex-1" size="lg" disabled={busy} onClick={confirm}>
              <Icon name="check" size={20} /> تأكيد الحجز
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
