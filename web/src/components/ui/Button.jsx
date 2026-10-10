const VARIANTS = {
  primary: 'bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(15,118,110,0.25)] hover:bg-[#0d6b64]',
  secondary: 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15',
  ghost: 'bg-transparent text-[var(--ink)] hover:bg-black/5',
  danger: 'bg-[var(--danger)] text-white hover:bg-[#c21f1f]',
  dark: 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15',
}
const SIZES = {
  sm: 'min-h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'min-h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'min-h-13 px-6 text-base rounded-2xl gap-2',
}

/** زر المنصة. `as` لرابط (`Link`) أو عنصر آخر. */
export function Button({ as: Tag = 'button', variant = 'primary', size = 'md', className = '', ...props }) {
  const typeProps = Tag === 'button' && !props.type ? { type: 'button' } : {}
  return (
    <Tag
      {...typeProps}
      {...props}
      className={`inline-flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  )
}
