import { useState } from 'react'
import { impactStats } from '../../platform/features'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { Card } from '../../components/ui/Card'
import { Stat } from '../../components/ui/Stat'

// ألوان مُتحقَّق منها (validate_palette: كل الفحوص ناجحة على الخلفية الفاتحة).
const SIGN = '#0d9488' // الشخص: إشارة ← صوت (وأيضاً لون السلسلة الواحدة)
const VOICE = '#1e5bb8' // المحامي: صوت ← إشارة
const GRID = '#e3eaee'
const LOCALE = 'ar-SA-u-nu-latn-ca-gregory'
const shortDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })

function TableView({ head, rows }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-bold text-[var(--muted)]">عرض البيانات كجدول</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-[var(--muted)]">
            {head.map((h) => (
              <th key={h} className="py-1 text-start font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-[var(--ring)]">
              {r.map((c, i) => (
                <td key={i} className="py-1 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/** أعمدة الجلسات الأسبوعية: سلسلة واحدة، أطراف دائرية 4px، شبكة رفيعة، تلميح عند المرور. */
function WeeklyColumns({ weeks }) {
  const [hover, setHover] = useState(null)
  const W = 640
  const H = 220
  const pad = { top: 18, bottom: 28, side: 34 }
  const max = Math.max(4, ...weeks.map((w) => w.count))
  const top = Math.ceil(max / 2) * 2
  const ticks = [0, top / 2, top]
  const band = (W - pad.side * 2) / weeks.length
  const barW = Math.min(24, band * 0.5)
  const y = (v) => H - pad.bottom - (v / top) * (H - pad.top - pad.bottom)
  const peak = weeks.reduce((m, w, i) => (w.count > weeks[m].count ? i : m), 0)
  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="الجلسات المكتملة أسبوعياً">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.side} x2={W - pad.side} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={pad.side - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const cx = pad.side + band * i + band / 2
          return (
            <g key={w.start} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - band / 2} y={pad.top} width={band} height={H - pad.top - pad.bottom} fill="transparent" />
              {w.count > 0 ? (
                <path
                  d={`M${cx - barW / 2},${H - pad.bottom} V${y(w.count) + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${H - pad.bottom} Z`}
                  fill={SIGN}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              ) : null}
              {i === peak && w.count > 0 ? (
                <text x={cx} y={y(w.count) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
                  {w.count}
                </text>
              ) : null}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {shortDate(w.start)}
              </text>
              <title>{`${shortDate(w.start)}: ${w.count}`}</title>
            </g>
          )
        })}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-[var(--ink)] px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${((pad.side + band * hover + band / 2) / W) * 100}%` }}
          dir="rtl"
        >
          <div className="font-bold">أسبوع {shortDate(weeks[hover].start)}</div>
          <div className="tabular-nums">{weeks[hover].count} جلسات مكتملة</div>
        </div>
      ) : null}
    </div>
  )
}

/** أشرطة أفقية لأنواع القضايا: سلسلة واحدة، القيمة عند الطرف. */
function CaseBars({ types }) {
  const max = Math.max(1, ...types.map((t) => t.count))
  return (
    <ul className="flex flex-col gap-3">
      {types.map((t) => (
        <li key={t.type} className="grid grid-cols-[72px_1fr] items-center gap-3" title={`${t.type}: ${t.count}`}>
          <span className="text-sm font-bold text-[var(--ink)]">{t.type}</span>
          <span className="flex items-center gap-2">
            <span className="h-5 rounded-e-[4px]" style={{ width: `${(t.count / max) * 85}%`, background: SIGN, minWidth: 6 }} />
            <span className="text-sm font-bold tabular-nums text-[var(--ink)]">{t.count}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** شريط واحد 100% لاتجاه العبارات (فئتان + مفتاح ثابت + فجوة 2px). */
function DirectionBar({ sign, voice }) {
  const total = Math.max(1, sign + voice)
  const parts = [
    { label: 'إشارة ← صوت (الشخص)', value: sign, color: SIGN },
    { label: 'صوت ← إشارة (المحامي)', value: voice, color: VOICE },
  ]
  return (
    <div>
      <div className="flex h-10 gap-[2px] overflow-hidden rounded-[6px]" role="img" aria-label="اتجاه العبارات المترجمة">
        {parts.map((p) => (
          <div
            key={p.label}
            className="flex items-center justify-center text-sm font-black text-white"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            title={`${p.label}: ${p.value}`}
          >
            {p.value / total > 0.15 ? `${Math.round((p.value / total) * 100)}%` : ''}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-[var(--ink)]">
            <span className="size-3 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
            {p.label} · <b className="tabular-nums">{p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** لوحة الأثر: ما حققته المنصة من الجلسات المكتملة. */
export default function Impact() {
  const { state } = usePlatform()
  const now = useNow(60_000)
  const s = impactStats(state.bookings, now, 8)
  const signLawyers = state.lawyers.filter((l) => l.signFluent).length
  return (
    <div className="flex flex-col gap-5">
      <div className="hero-bg flex flex-col gap-2 rounded-[24px] p-6 text-white md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-bold text-[#5eead4]">أثر المنصة</div>
          <div className="mt-1 text-6xl font-black tabular-nums">{s.phrases.toLocaleString('en-US')}</div>
          <div className="text-white/80">عبارة تُرجمت بين لغة الإشارة والكلام في جلسات حقيقية</div>
        </div>
        <p className="max-w-sm text-sm leading-7 text-white/70">كل عبارة هنا كانت حاجزاً بين شخص أصم وحقه القانوني — وأصبحت مفهومة في الاتجاهين.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="جلسات مكتملة بمحضر" value={s.completed} icon="file" />
        <Stat label="دقيقة ترجمة فورية" value={s.minutes} icon="clock" tone="var(--accent-2)" />
        <Stat label="متوسط مدة الجلسة (دقيقة)" value={s.completed ? Math.round(s.minutes / s.completed) : 0} icon="video" tone="#7c3aed" />
        <Stat label="محامون يتقنون الإشارة" value={`${signLawyers}/${state.lawyers.length}`} icon="hand" tone="#c2410c" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-lg font-black">الجلسات المكتملة أسبوعياً</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">آخر 8 أسابيع</p>
          <WeeklyColumns weeks={s.perWeek} />
          <TableView head={['الأسبوع', 'الجلسات']} rows={s.perWeek.map((w) => [shortDate(w.start), w.count])} />
        </Card>
        <Card>
          <h2 className="text-lg font-black">أنواع القضايا</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">عدد الجلسات المكتملة لكل نوع</p>
          <CaseBars types={s.caseTypes} />
          <TableView head={['النوع', 'الجلسات']} rows={s.caseTypes.map((t) => [t.type, t.count])} />
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-black">اتجاه الترجمة</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">العبارات المسجّلة في المحاضر حسب الاتجاه</p>
        <DirectionBar sign={s.signToVoice} voice={s.voiceToSign} />
      </Card>
    </div>
  )
}
