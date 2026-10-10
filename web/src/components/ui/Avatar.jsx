const COLORS = ['#0f766e', '#1e5bb8', '#7c3aed', '#c2410c', '#0e7490', '#be185d']

/** دائرة بالحرفين الأولين من الاسم (بدون «أ.»). */
export function Avatar({ name = '', size = 44, className = '' }) {
  const words = name.replace(/^أ\.\s*/, '').trim().split(/\s+/).filter(Boolean)
  const initials = words.slice(0, 2).map((w) => w[0]).join(' ')
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34, background: COLORS[hash % COLORS.length] }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
