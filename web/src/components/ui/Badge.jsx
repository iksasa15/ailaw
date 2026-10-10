const TONES = {
  accent: 'bg-[var(--accent)]/10 text-[var(--accent)]',
  blue: 'bg-[var(--accent-2)]/10 text-[var(--accent-2)]',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-700',
}

export function Badge({ tone = 'accent', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

const STATUS = {
  pending: ['بانتظار التأكيد', 'amber'],
  confirmed: ['مؤكدة', 'green'],
  completed: ['مكتملة', 'blue'],
  cancelled: ['ملغاة', 'gray'],
  declined: ['مرفوضة', 'red'],
}

export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] || ['—', 'gray']
  return <Badge tone={tone}>{label}</Badge>
}
