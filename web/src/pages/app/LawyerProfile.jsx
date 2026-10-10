import { Link, useParams } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { BookingWizard } from './BookingWizard'

export default function LawyerProfile() {
  const { id } = useParams()
  const { lawyerById } = usePlatform()
  const lawyer = lawyerById(id)
  if (!lawyer) {
    return (
      <EmptyState
        icon="users"
        title="المحامي غير موجود"
        action={
          <Button as={Link} to="/app/lawyers">
            دليل المحامين
          </Button>
        }
      />
    )
  }
  return (
    <div>
      <Link to="/app/lawyers" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">
        <Icon name="chevron" size={16} className="rotate-180" /> دليل المحامين
      </Link>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={lawyer.name} size={88} />
            <div className="flex-1">
              <h2 className="text-2xl font-black">{lawyer.name}</h2>
              <p className="text-[var(--muted)]">{lawyer.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lawyer.specialties.map((s) => (
                  <Badge key={s} tone="gray">
                    {s}
                  </Badge>
                ))}
                {lawyer.onlineNow ? (
                  <Badge tone="green">
                    <span className="size-2 rounded-full bg-emerald-500" /> متصل الآن
                  </Badge>
                ) : null}
                {lawyer.signFluent ? (
                  <Badge tone="accent">
                    <Icon name="hand" size={14} /> يتقن لغة الإشارة
                  </Badge>
                ) : (
                  <Badge tone="blue">
                    <Icon name="glasses" size={14} /> يستخدم الترجمة الفورية
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:w-64">
              {[
                [lawyer.rating, 'التقييم'],
                [lawyer.years, 'سنوات'],
                [lawyer.reviewsCount, 'مراجعة'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-[var(--bg)] py-3">
                  <div className="text-xl font-black tabular-nums">{v}</div>
                  <div className="text-xs text-[var(--muted)]">{l}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle title="نبذة" />
            <p className="leading-8 text-[var(--ink)]/85">{lawyer.bio}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
              <Icon name="pin" size={15} /> {lawyer.city}
            </div>
          </Card>
          <Card>
            <SectionTitle title="آراء الموكّلين" />
            <div className="grid gap-3 md:grid-cols-2">
              {lawyer.reviews.map((r) => (
                <div key={r.author} className="rounded-2xl bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{r.author}</span>
                    <span className="flex text-amber-500" aria-label={`${r.stars} من 5`}>
                      {Array.from({ length: r.stars }, (_, i) => (
                        <Icon key={i} name="star" size={14} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--muted)]">{r.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-0">
          <SectionTitle title="احجز جلسة" />
          <BookingWizard lawyer={lawyer} />
        </Card>
      </div>
    </div>
  )
}
