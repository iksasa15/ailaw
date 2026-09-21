import { Link } from 'react-router-dom'

export function PageHeader({ title, subtitle, backTo = null, backLabel = 'رجوع' }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0 text-right">
        <p className="font-brand text-sm font-semibold text-[var(--accent)]">النظارة الذكية</p>
        <h1 className="mt-0.5 truncate text-2xl font-bold text-[var(--ink)]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {backTo ? (
        <Link
          to={backTo}
          className="shrink-0 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)]"
        >
          {backLabel}
        </Link>
      ) : null}
    </header>
  )
}
