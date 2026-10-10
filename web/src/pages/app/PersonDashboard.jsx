import { Link } from 'react-router-dom'
import { formatDate, formatTime, splitSessions } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { relativeStart, useNow } from '../../platform/useNow'
import { Avatar } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'

const SHORTCUTS = [
  { to: '/app/lawyers', icon: 'calendar', title: 'احجز جلسة', text: 'محامون يفهمون احتياجك' },
  { to: '/app/learn', icon: 'book', title: 'تعلّم الإشارة', text: 'دروس مع تدريب بالكاميرا' },
  { to: '/app/lens', icon: 'glasses', title: 'العدسة', text: 'ترجمة فورية في أي مكان' },
  { to: '/app/lab', icon: 'flask', title: 'المعمل', text: 'جرّب سيناريو قضية كاملة' },
]

export default function PersonDashboard({ learning }) {
  const { me, myBookings, lawyerById } = usePlatform()
  const now = useNow()
  const { upcoming, past } = splitSessions(myBookings, now)
  const next = upcoming[0]
  const lastRecord = past.find((b) => b.status === 'completed')
  const nextLawyer = next && lawyerById(next.lawyerId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-black text-[var(--ink)]">أهلاً {me.name.split(' ')[0]} 👋</h2>
        <p className="mt-1 text-[var(--muted)]">هذه لوحتك: جلساتك القادمة، وتقدّمك في تعلّم الإشارة.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {next ? (
          <div className="hero-bg relative overflow-hidden rounded-[24px] p-6 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#5eead4]">جلستك القادمة</span>
              <StatusBadge status={next.status} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar name={nextLawyer?.name} size={60} />
              <div>
                <div className="text-2xl font-black">{nextLawyer?.name}</div>
                <div className="text-white/75">{next.caseType}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-white/85">
              <span className="inline-flex items-center gap-2">
                <Icon name="calendar" size={18} /> {formatDate(next.start)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Icon name="clock" size={18} /> {formatTime(next.start)}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {next.status === 'confirmed' ? (
                <Link
                  to={`/app/session/${next.id}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#5eead4] px-6 font-black text-[#0b1c24] hover:bg-[#7ff0dd]"
                >
                  <Icon name="video" size={20} /> ادخل الجلسة
                </Link>
              ) : (
                <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">بانتظار تأكيد المحامي</span>
              )}
              <span className="text-lg font-black text-[#5eead4]">{relativeStart(next.start, now)}</span>
            </div>
          </div>
        ) : (
          <Card className="flex flex-col items-start justify-center gap-3">
            <h3 className="text-xl font-black">لا جلسات قادمة</h3>
            <p className="text-[var(--muted)]">احجز جلستك الأولى مع محامٍ يتقن لغة الإشارة.</p>
            <Button as={Link} to="/app/lawyers">
              تصفّح المحامين
            </Button>
          </Card>
        )}

        <Card>
          <SectionTitle
            title="تقدّمك في التعلّم"
            action={
              <Link to="/app/learn" className="text-sm font-bold text-[var(--accent)]">
                مركز التعلّم ←
              </Link>
            }
          />
          <div className="flex flex-col gap-4">
            {(learning || []).map((c) => (
              <div key={c.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-bold">{c.title}</span>
                  <span className="tabular-nums text-[var(--muted)]">{c.percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            ))}
            {!learning?.length ? <p className="text-sm text-[var(--muted)]">ابدأ أول درس من مركز التعلّم.</p> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="group rounded-[20px] border border-[var(--ring)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(11,28,36,0.08)]">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Icon name={s.icon} size={22} />
            </span>
            <div className="mt-3 font-black">{s.title}</div>
            <div className="text-sm text-[var(--muted)]">{s.text}</div>
          </Link>
        ))}
      </div>

      {lastRecord ? (
        <Card className="flex flex-col gap-4 md:flex-row md:items-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-2)]/10 text-[var(--accent-2)]">
            <Icon name="file" size={24} />
          </span>
          <div className="flex-1">
            <div className="font-black">آخر محضر: {lastRecord.caseType}</div>
            <div className="text-sm text-[var(--muted)]">
              {lawyerById(lastRecord.lawyerId)?.name} · {formatDate(lastRecord.start)}
            </div>
          </div>
          <Button as={Link} to={`/app/session/${lastRecord.id}/record`} variant="secondary">
            عرض المحضر
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
