import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  {
    to: '/',
    end: true,
    label: 'عدسة',
    match: (path) => path === '/' || path.startsWith('/screen/'),
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="8" cy="12" r="3.2" />
        <circle cx="16" cy="12" r="3.2" />
        <path d="M11 12h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/screens',
    label: 'جلسة',
    match: (path) => path === '/screens',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="8" height="14" rx="1.5" />
        <rect x="13" y="5" width="8" height="14" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/lab',
    label: 'معمل',
    match: (path) => path === '/lab',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M9 3h6M10 3v6l-4.5 8A2.5 2.5 0 0 0 8 21h8a2.5 2.5 0 0 0 2.5-4L14 9V3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/more',
    label: 'المزيد',
    match: (path) =>
      path === '/more' || path === '/guide' || path === '/settings' || path === '/about',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

export function TabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 border-t border-[var(--ring)] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="التنقل الرئيسي"
    >
      <div className="mx-auto grid h-[var(--tabbar-h)] max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
