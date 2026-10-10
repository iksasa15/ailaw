import { usePlatform } from '../../platform/PlatformContext'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16]
const hourLabel = (h) => `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'ص' : 'م'}`

/** شبكة التوفر الأسبوعية؛ أوقات الحجز في صفحة المحامي تُحسب منها مباشرة. */
export default function Availability() {
  const { lawyerById, toggleAvailability } = usePlatform()
  const lawyer = lawyerById('l1')
  const total = DAYS.reduce((n, _, d) => n + (lawyer.availability?.[d]?.length || 0), 0)
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[var(--muted)]">
        اضغط على الساعة لتفعيلها أو إيقافها. الموكّلون يرون فقط الأوقات المفعّلة غير المحجوزة. ({total} ساعة أسبوعياً)
      </p>
      <Card className="overflow-x-auto p-4">
        <table className="w-full min-w-[640px] border-separate border-spacing-2 text-center">
          <thead>
            <tr>
              <th className="w-24" />
              {DAYS.map((d) => (
                <th key={d} className="text-sm font-black text-[var(--ink)]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <th className="text-sm font-bold tabular-nums text-[var(--muted)]">{hourLabel(h)}</th>
                {DAYS.map((d, weekday) => {
                  const on = lawyer.availability?.[weekday]?.includes(h)
                  return (
                    <td key={d}>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${d} ${hourLabel(h)}`}
                        onClick={() => toggleAvailability(weekday, h)}
                        className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition ${
                          on ? 'bg-[var(--accent)] text-white hover:bg-[#0f5f97]' : 'bg-black/[0.04] text-[var(--muted)] hover:bg-black/[0.08]'
                        }`}
                      >
                        {on ? <Icon name="check" size={18} strokeWidth={3} /> : 'مغلق'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
