import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { Icon } from '../ui/Icon'
import { NAV } from './nav'
import { NavItems } from './Sidebar'

/** الجوال: أهم أربعة عناصر + «المزيد». */
export function MobileTabs() {
  const { state, logout } = usePlatform()
  const [open, setOpen] = useState(false)
  const items = (NAV[state.role] || []).slice(0, 4)
  return (
    <>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--ring)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`
            }
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--muted)]"
        >
          <Icon name="menu" size={22} />
          المزيد
        </button>
      </nav>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="إغلاق" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80%] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15" />
            <NavItems onNavigate={() => setOpen(false)} />
            <div className="mt-3 flex flex-col gap-1 border-t border-[var(--ring)] pt-3">
              <NavLink to="/app/about" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 font-bold text-[var(--muted)]">
                <Icon name="info" size={18} /> عن المشروع
              </NavLink>
              <button type="button" onClick={logout} className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 font-bold text-[var(--muted)]">
                <Icon name="logout" size={18} /> تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
