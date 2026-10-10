import { earnedBadges } from '../../platform/features'
import { usePlatform } from '../../platform/PlatformContext'
import { Icon } from '../ui/Icon'

/** شريط الأوسمة: الملوّن مكتسب، والرمادي لم يُكتسب بعد. */
export function BadgesStrip() {
  const { state } = usePlatform()
  const badges = earnedBadges(state)
  const count = badges.filter((b) => b.earned).length
  return (
    <div className="rounded-[24px] border border-[var(--ring)] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">أوسمتك</h2>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-600 tabular-nums">
          {count}/{badges.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {badges.map((b) => (
          <div key={b.id} className={`flex flex-col items-center gap-1.5 text-center ${b.earned ? '' : 'opacity-40 grayscale'}`} title={b.text}>
            <span
              className={`flex size-14 items-center justify-center rounded-full ${
                b.earned ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)]' : 'bg-black/5 text-[var(--muted)]'
              }`}
            >
              <Icon name={b.icon} size={24} />
            </span>
            <span className="text-xs font-black">{b.title}</span>
            <span className="text-[10px] text-[var(--muted)]">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
