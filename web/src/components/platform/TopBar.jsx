import { Link, useLocation } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandIcon } from '../brand/BrandMark'
import { Icon } from '../ui/Icon'
import { InstantConsultButton } from './InstantConsult'
import { RoleSwitch } from './RoleSwitch'
import { pageTitle } from './nav'

export function TopBar() {
  const { pathname } = useLocation()
  const { state } = usePlatform()
  return (
    <header className="no-print flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--ring)] bg-white/70 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/app" className="lg:hidden" aria-label="الرئيسية">
          <BrandIcon size={34} />
        </Link>
        <h1 className="truncate text-xl font-black text-[var(--ink)]">{pageTitle(pathname, state.role)}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <RoleSwitch />
        </div>
        <div className="md:hidden">
          <RoleSwitch compact />
        </div>
        {state.role === 'person' ? (
          <div className="hidden sm:block">
            <InstantConsultButton />
          </div>
        ) : null}
        <Link
          to="/app/lens"
          className="hidden min-h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 text-sm font-bold text-white sm:inline-flex"
        >
          <Icon name="glasses" size={16} /> العدسة
        </Link>
      </div>
    </header>
  )
}
