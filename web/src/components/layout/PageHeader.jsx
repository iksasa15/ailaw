import { Link } from 'react-router-dom'

export function PageHeader({ title, subtitle, backTo = null, backLabel = 'رجوع' }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0 text-right">
        <p className="font-brand text-[0.8rem] font-bold tracking-wide text-[var(--accent)]">
          النظارة الذكية
        </p>
        <h1 className="mt-1 truncate text-[1.65rem] font-extrabold leading-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {backTo ? (
        <Link
          to={backTo}
          className="shrink-0 rounded-xl bg-white/85 px-3.5 py-2.5 text-sm font-bold text-[var(--ink)] shadow-sm ring-1 ring-[var(--ring)] transition active:scale-[0.98]"
        >
          {backLabel}
        </Link>
      ) : null}
    </header>
  )
}
