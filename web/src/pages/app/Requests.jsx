import { CHANNEL_LABELS, formatDate, formatTime } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

/** طلبات الحجز المعلّقة للمحامي: قبول أو اعتذار. */
export default function Requests() {
  const { myBookings, userById, accept, decline } = usePlatform()
  const now = useNow()
  const pending = myBookings
    .filter((b) => b.status === 'pending' && new Date(b.start) > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  if (!pending.length) {
    return <EmptyState icon="inbox" title="لا طلبات معلّقة" text="ستظهر هنا طلبات الحجز الجديدة من الموكّلين." />
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {pending.map((b) => {
        const person = userById(b.personId)
        return (
          <div key={b.id} className="flex flex-col gap-4 rounded-[24px] border border-[var(--ring)] bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar name={person?.name} size={50} />
              <div className="flex-1">
                <div className="text-lg font-black">{person?.name}</div>
                <div className="text-sm text-[var(--muted)]">{person?.city}</div>
              </div>
              <Badge tone={b.channel === 'sign' ? 'accent' : 'blue'}>
                <Icon name={b.channel === 'sign' ? 'hand' : 'message'} size={14} /> {CHANNEL_LABELS[b.channel]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--bg)] p-4 text-sm">
              <div>
                <div className="text-[var(--muted)]">الموعد</div>
                <div className="font-bold">
                  {formatDate(b.start)}
                  <br />
                  {formatTime(b.start)}
                </div>
              </div>
              <div>
                <div className="text-[var(--muted)]">نوع القضية</div>
                <div className="font-bold">{b.caseType}</div>
              </div>
              {b.description ? (
                <div className="col-span-2">
                  <div className="text-[var(--muted)]">الوصف</div>
                  <div className="leading-7">{b.description}</div>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => accept(b.id)}>
                <Icon name="check" size={18} /> قبول
              </Button>
              <Button variant="ghost" className="ring-1 ring-[var(--ring)]" onClick={() => decline(b.id)}>
                اعتذار
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
