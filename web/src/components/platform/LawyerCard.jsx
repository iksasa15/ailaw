import { Link } from 'react-router-dom'
import { formatTime } from '../../platform/logic'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const LOCALE = 'ar-SA-u-nu-latn-ca-gregory'

/** بطاقة محامٍ في الدليل. `nextSlot` ISO أو null. */
export function LawyerCard({ lawyer, nextSlot }) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--ring)] bg-white p-5 transition hover:shadow-[0_12px_32px_rgba(11,28,36,0.08)]">
      <div className="flex items-start gap-3">
        <Avatar name={lawyer.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black text-[var(--ink)]">{lawyer.name}</div>
          <div className="text-sm text-[var(--muted)]">{lawyer.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} /> {lawyer.city}
            </span>
            <span>{lawyer.years} سنوات خبرة</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-600">
          <Icon name="star" size={14} /> {lawyer.rating}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {lawyer.specialties.map((s) => (
          <Badge key={s} tone="gray">
            {s}
          </Badge>
        ))}
        {lawyer.signFluent ? (
          <Badge tone="accent">
            <Icon name="hand" size={14} /> يتقن الإشارة
          </Badge>
        ) : (
          <Badge tone="blue">
            <Icon name="glasses" size={14} /> عبر الترجمة الفورية
          </Badge>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--ring)] pt-4">
        <div className="text-sm">
          <div className="text-[var(--muted)]">أقرب موعد</div>
          <div className="font-bold text-[var(--ink)]">
            {nextSlot
              ? `${new Date(nextSlot).toLocaleDateString(LOCALE, { weekday: 'long' })} ${formatTime(nextSlot)}`
              : 'لا مواعيد هذا الأسبوع'}
          </div>
        </div>
        <Button as={Link} to={`/app/lawyers/${lawyer.id}`}>
          الملف والحجز
        </Button>
      </div>
    </div>
  )
}
