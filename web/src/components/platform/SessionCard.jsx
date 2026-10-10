import { Link } from 'react-router-dom'
import { CHANNEL_LABELS, formatDate, formatTime } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { relativeStart } from '../../platform/useNow'
import { Avatar } from '../ui/Avatar'
import { StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** بطاقة حجز من منظور الحساب الحالي، مع إجراءاتها. */
export function SessionCard({ booking, now, upcoming }) {
  const { state, lawyerById, userById, cancel } = usePlatform()
  const other = state.role === 'lawyer' ? userById(booking.personId) : lawyerById(booking.lawyerId)
  const live = booking.status === 'confirmed' && upcoming
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-[var(--ring)] bg-white p-5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={other?.name} size={48} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-[var(--ink)]">{other?.name}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={15} /> {formatDate(booking.start)} · {formatTime(booking.start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="briefcase" size={15} /> {booking.caseType}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name={booking.channel === 'sign' ? 'hand' : 'message'} size={15} /> {CHANNEL_LABELS[booking.channel]}
            </span>
          </div>
          {upcoming && booking.status !== 'pending' ? (
            <div className="mt-1 text-sm font-bold text-[var(--accent)]">{relativeStart(booking.start, now)}</div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {live ? (
          <Button as={Link} to={`/app/session/${booking.id}/check`}>
            <Icon name="video" size={18} /> ادخل الجلسة
          </Button>
        ) : null}
        {booking.status === 'pending' && state.role === 'lawyer' ? (
          <Button as={Link} to="/app/requests" variant="secondary">
            مراجعة الطلب
          </Button>
        ) : null}
        {booking.status === 'completed' ? (
          <Button as={Link} to={`/app/session/${booking.id}/record`} variant="secondary">
            <Icon name="file" size={18} /> المحضر
          </Button>
        ) : null}
        {upcoming && (booking.status === 'pending' || booking.status === 'confirmed') ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm('إلغاء هذه الجلسة؟')) cancel(booking.id)
            }}
          >
            إلغاء
          </Button>
        ) : null}
      </div>
    </div>
  )
}
