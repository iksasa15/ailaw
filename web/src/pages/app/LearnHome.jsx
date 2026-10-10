import { Link } from 'react-router-dom'
import { COURSES } from '../../platform/courses'
import { courseProgress } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { BadgesStrip } from '../../components/platform/Badges'

/** مركز التعلّم: الدورات الأربع ودروس كل دورة مع علامة الإتمام. */
export default function LearnHome() {
  const { state } = usePlatform()
  return (
    <div className="flex flex-col gap-6">
      <BadgesStrip />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COURSES.map((c) => {
          const percent = courseProgress(c, state.progress?.[c.id])
          return (
            <div key={c.id} className="flex flex-col rounded-[20px] border border-[var(--ring)] bg-white p-5 transition hover:shadow-[0_12px_28px_rgba(11,28,36,0.08)]">
              <a href={`#${c.id}`} className="block">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Icon name={c.icon} size={22} />
                </span>
                <div className="mt-3 font-black">{c.title}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{c.description}</div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--muted)]">{percent}%</span>
                </div>
              </a>
              {percent === 100 ? (
                <Link
                  to={`/app/learn/certificate/${c.id}`}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700 hover:bg-amber-100"
                >
                  <Icon name="award" size={16} /> الشهادة
                </Link>
              ) : null}
            </div>
          )
        })}
      </div>

      {COURSES.map((c) => {
        const done = state.progress?.[c.id] || {}
        return (
          <Card key={c.id} id={c.id} className="scroll-mt-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">{c.title}</h2>
              <span className="text-sm text-[var(--muted)]">
                {Object.keys(done).length}/{c.lessons.length} دروس
              </span>
            </div>
            <div className={`grid gap-3 ${c.id === 'letters' ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-10' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
              {c.lessons.map((l) => (
                <Link
                  key={l.id}
                  to={`/app/learn/${c.id}/${l.id}`}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition hover:border-[var(--accent)]/50 ${
                    done[l.id] ? 'border-[var(--accent)]/30 bg-[var(--accent)]/6' : 'border-[var(--ring)] bg-white'
                  }`}
                >
                  {done[l.id] ? (
                    <span className="absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                  {l.practice ? (
                    <span className="absolute start-1.5 top-1.5 text-[var(--accent-2)]" title="تدريب بالكاميرا">
                      <Icon name="video" size={13} />
                    </span>
                  ) : null}
                  {c.id === 'words' ? (
                    <img src={l.image} alt="" className="h-16 w-full rounded-xl object-contain" loading="lazy" />
                  ) : (
                    <span className={`font-black text-[var(--ink)] ${c.id === 'letters' ? 'text-2xl' : 'text-base'}`}>{l.symbol}</span>
                  )}
                  {c.id !== 'letters' ? <span className="text-xs font-bold text-[var(--muted)]">{l.title}</span> : null}
                </Link>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
