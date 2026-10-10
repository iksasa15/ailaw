import { Icon } from './Icon'

export function Stat({ label, value, icon, tone = 'var(--accent)' }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-[var(--ring)] bg-white p-4">
      <span className="flex size-11 items-center justify-center rounded-2xl" style={{ background: `color-mix(in srgb, ${tone} 12%, white)`, color: tone }}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="text-2xl font-black tabular-nums text-[var(--ink)]">{value}</div>
        <div className="text-sm text-[var(--muted)]">{label}</div>
      </div>
    </div>
  )
}
