import { Link, NavLink } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandIcon } from '../brand/BrandMark'
import { Icon } from '../ui/Icon'
import { NAV } from './nav'

export function NavItems({ onNavigate }) {
  const { state, myBookings } = usePlatform()
  const pending = myBookings.filter((b) => b.status === 'pending').length
  return (
    <nav className="flex flex-col gap-1">
      {(NAV[state.role] || []).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-bold transition-colors ${
              isActive
                ? 'bg-[var(--accent)] text-white shadow-[0_6px_16px_rgba(19,111,176,0.25)]'
                : 'text-[var(--ink)]/80 hover:bg-[var(--accent)]/8'
            }`
          }
        >
          <Icon name={item.icon} size={20} />
          <span className="flex-1">{item.label}</span>
          {item.badge === 'pending' && pending > 0 ? (
            <span className="min-w-6 rounded-full bg-amber-400 px-1.5 text-center text-xs font-black text-amber-950">{pending}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const { logout } = usePlatform()
  return (
    <aside className="no-print hidden w-[272px] shrink-0 flex-col border-l border-[var(--ring)] bg-white/80 px-4 py-5 backdrop-blur lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 px-2">
        <BrandIcon size={42} />
        <div className="leading-tight">
          <div className="text-lg font-black text-[var(--ink)]">المحامون العرب</div>
          <div className="text-xs font-bold text-[var(--accent)]">منصة الصم والعدالة</div>
        </div>
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavItems />
      </div>
      <div className="mt-4 flex flex-col gap-1 border-t border-[var(--ring)] pt-4">
        <NavLink to="/app/about" className="flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-[var(--muted)] hover:bg-black/5">
          <Icon name="info" size={18} /> عن المشروع
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-[var(--muted)] hover:bg-black/5"
        >
          <Icon name="logout" size={18} /> تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
