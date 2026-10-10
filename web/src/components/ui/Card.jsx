/** بطاقة بيضاء بحواف 20px وظل خفيف. */
export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      {...props}
      className={`rounded-[20px] border border-[var(--ring)] bg-white p-5 shadow-[0_8px_28px_rgba(11,28,36,0.06)] ${className}`}
    >
      {children}
    </Tag>
  )
}

/** عنوان قسم داخل صفحة. */
export function SectionTitle({ title, action, className = '' }) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-lg font-black text-[var(--ink)]">{title}</h2>
      {action}
    </div>
  )
}
