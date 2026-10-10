import { Icon } from './Icon'

export function EmptyState({ icon = 'info', title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-[var(--ring)] bg-white/60 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-lg font-black text-[var(--ink)]">{title}</h3>
      {text ? <p className="max-w-md text-[15px] text-[var(--muted)]">{text}</p> : null}
      {action}
    </div>
  )
}
