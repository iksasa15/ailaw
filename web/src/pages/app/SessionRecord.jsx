import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CHANNEL_LABELS, formatDate, formatTime, recordToText } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandMark } from '../../components/brand/BrandMark'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { RatingCard } from '../../components/platform/RatingCard'
import { SignPlayer } from '../../components/platform/SignPlayer'

const ROLE_NAMES = { person: 'الشخص', lawyer: 'المحامي' }

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** محضر الجلسة: الأطراف، الملخص، السجل الكامل؛ طباعة A4 وتنزيل نصّاً. */
export default function SessionRecord() {
  const { id } = useParams()
  const { state, myBookings, lawyerById, userById } = usePlatform()
  const booking = myBookings.find((b) => b.id === id)
  const [watching, setWatching] = useState(false)
  if (!booking?.record) {
    return (
      <EmptyState
        icon="file"
        title="لا يوجد محضر لهذه الجلسة"
        text="المحضر يُنشأ عند إنهاء الجلسة."
        action={
          <Button as={Link} to="/app/sessions">
            جلساتي
          </Button>
        }
      />
    )
  }
  const lawyer = lawyerById(booking.lawyerId)
  const person = userById(booking.personId)
  const r = booking.record
  const facts = r.summary.facts
  const notes = r.summary.lawyerNotes

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/sessions" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">
          <Icon name="chevron" size={16} className="rotate-180" /> جلساتي
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!notes.length} onClick={() => setWatching(true)}>
            <Icon name="hand" size={18} /> شاهد التوجيهات بالإشارة
          </Button>
          <Button variant="secondary" onClick={() => download(`محضر-${booking.id}.txt`, recordToText({ booking, lawyer, person }))}>
            <Icon name="download" size={18} /> تنزيل نصّاً
          </Button>
          <Button onClick={() => window.print()}>
            <Icon name="print" size={18} /> طباعة / PDF
          </Button>
        </div>
      </div>

      {state.role === 'person' ? (
        <div className="mb-4">
          <RatingCard booking={booking} lawyerName={lawyer?.name} />
        </div>
      ) : null}

      <Card className="print-sheet p-8">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--ring)] pb-5">
          <div>
            <div className="text-sm font-bold text-[var(--accent)]">النظارة الذكية · منصة الصم والعدالة</div>
            <h2 className="mt-1 text-3xl font-black">محضر جلسة</h2>
            <div className="mt-1 text-sm text-[var(--muted)]">رقم الحجز: {booking.id}</div>
          </div>
          <BrandMark height={40} />
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[var(--ring)] py-5 md:grid-cols-3">
          {[
            ['المحامي', lawyer?.name],
            ['الموكّل', person?.name],
            ['نوع القضية', booking.caseType],
            ['التاريخ', formatDate(booking.start)],
            ['الوقت', formatTime(booking.start)],
            ['المدة', `${Math.max(1, Math.round(r.durationSec / 60))} دقيقة`],
            ['طريقة التواصل', CHANNEL_LABELS[booking.channel]],
            ['عدد العبارات', r.entries.length],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-[var(--muted)]">{k}</dt>
              <dd className="font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        {booking.description ? (
          <section className="border-b border-[var(--ring)] py-5">
            <h3 className="mb-2 font-black">وصف القضية عند الحجز</h3>
            <p className="leading-7 text-[var(--ink)]/85">{booking.description}</p>
          </section>
        ) : null}

        <section className="grid gap-6 border-b border-[var(--ring)] py-5 md:grid-cols-2">
          {[
            ['الوقائع (من الموكّل)', facts, 'var(--accent)'],
            ['أسئلة المحامي وتوجيهاته', notes, 'var(--accent-2)'],
          ].map(([title, items, color]) => (
            <div key={title}>
              <h3 className="mb-3 font-black" style={{ color }}>
                {title}
              </h3>
              {items.length ? (
                <ol className="flex flex-col gap-2">
                  {items.map((t, i) => (
                    <li key={t} className="flex gap-2 leading-7">
                      <span className="font-black tabular-nums" style={{ color }}>
                        {i + 1}.
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[var(--muted)]">لم تُسجَّل عبارات.</p>
              )}
            </div>
          ))}
        </section>

        <section className="pt-5">
          <h3 className="mb-3 font-black">السجل الكامل</h3>
          {r.entries.length ? (
            <table className="w-full text-[15px]">
              <tbody>
                {r.entries.map((e, i) => (
                  <tr key={`${e.at}-${i}`} className="border-b border-[var(--ring)] last:border-0">
                    <td className="w-20 py-2 align-top text-sm tabular-nums text-[var(--muted)]">{formatTime(e.at)}</td>
                    <td className="w-20 py-2 align-top text-sm font-bold" style={{ color: e.role === 'lawyer' ? 'var(--accent-2)' : 'var(--accent)' }}>
                      {ROLE_NAMES[e.role]}
                    </td>
                    <td className="py-2 leading-7">{e.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[var(--muted)]">لم تُسجَّل عبارات في هذه الجلسة.</p>
          )}
        </section>

        <footer className="mt-8 flex justify-between border-t border-[var(--ring)] pt-4 text-xs text-[var(--muted)]">
          <span>أُنشئ تلقائياً من محادثة الجلسة — النظارة الذكية</span>
          <span>{formatDate(r.endedAt)}</span>
        </footer>
      </Card>
      {watching ? <SignPlayer title="توجيهات المحامي بلغة الإشارة" phrases={notes} onClose={() => setWatching(false)} /> : null}
    </div>
  )
}
