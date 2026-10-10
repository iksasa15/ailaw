import { Link } from 'react-router-dom'
import { dateKey, formatTime, splitSessions } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { relativeStart, useNow } from '../../platform/useNow'
import { Avatar } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Stat } from '../../components/ui/Stat'

export default function LawyerDashboard() {
  const { me, myBookings, userById } = usePlatform()
  const now = useNow()
  const { upcoming } = splitSessions(myBookings, now)
  const today = dateKey(now)
  const todays = upcoming.filter((b) => b.status === 'confirmed' && dateKey(new Date(b.start)) === today)
  const pending = myBookings.filter((b) => b.status === 'pending' && new Date(b.start) > now)
  const weekEnd = now.getTime() + 7 * 86_400_000
  const thisWeek = myBookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.start).getTime() <= weekEnd && new Date(b.start).getTime() >= now.getTime() - 3_600_000,
  )
  const clients = new Set(myBookings.map((b) => b.personId)).size
  const completed = myBookings.filter((b) => b.status === 'completed').length
  const nextConfirmed = upcoming.find((b) => b.status === 'confirmed')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-black text-[var(--ink)]">صباح الخير، {me.name}</h2>
        <p className="mt-1 text-[var(--muted)]">لديك {todays.length} جلسة اليوم و{pending.length} طلب بانتظار ردك.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="جلسات اليوم" value={todays.length} icon="calendar" />
        <Stat label="طلبات معلّقة" value={pending.length} icon="inbox" tone="#d97706" />
        <Stat label="جلسات هذا الأسبوع" value={thisWeek.length} icon="clock" tone="var(--accent-2)" />
        <Stat label={`موكّلون · ${completed} جلسة مكتملة`} value={clients} icon="users" tone="#7c3aed" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionTitle
            title="جلسات اليوم"
            action={
              <Link to="/app/sessions" className="text-sm font-bold text-[var(--accent)]">
                كل الجلسات ←
              </Link>
            }
          />
          {todays.length ? (
            <div className="flex flex-col gap-3">
              {todays.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-4">
                  <Avatar name={userById(b.personId)?.name} size={44} />
                  <div className="flex-1">
                    <div className="font-black">{userById(b.personId)?.name}</div>
                    <div className="text-sm text-[var(--muted)]">
                      {formatTime(b.start)} · {b.caseType} · <span className="font-bold text-[var(--accent)]">{relativeStart(b.start, now)}</span>
                    </div>
                  </div>
                  <Button as={Link} to={`/app/session/${b.id}`} size="sm">
                    <Icon name="video" size={16} /> ادخل
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[var(--bg)] px-4 py-6 text-center text-[var(--muted)]">
              لا جلسات مؤكدة اليوم.
              {nextConfirmed ? ` أقرب جلسة: ${relativeStart(nextConfirmed.start, now)}.` : ''}
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle
            title="طلبات جديدة"
            action={
              <Link to="/app/requests" className="text-sm font-bold text-[var(--accent)]">
                مراجعة ←
              </Link>
            }
          />
          {pending.length ? (
            <div className="flex flex-col gap-3">
              {pending.slice(0, 3).map((b) => (
                <Link key={b.id} to="/app/requests" className="flex items-center gap-3 rounded-2xl border border-[var(--ring)] p-3 hover:bg-[var(--bg)]">
                  <Avatar name={userById(b.personId)?.name} size={38} />
                  <div className="flex-1">
                    <div className="font-bold">{userById(b.personId)?.name}</div>
                    <div className="text-xs text-[var(--muted)]">{b.caseType}</div>
                  </div>
                  <StatusBadge status="pending" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon="inbox" title="لا طلبات جديدة" />
          )}
        </Card>
      </div>
    </div>
  )
}
