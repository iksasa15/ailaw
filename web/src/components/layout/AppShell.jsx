import { Outlet, useLocation } from 'react-router-dom'
import { TabBar } from './TabBar'

const HIDE_TAB = new Set(['/onboarding', '/pair'])

export function AppShell() {
  const { pathname } = useLocation()
  const showTab = !HIDE_TAB.has(pathname)
  const isLens =
    pathname === '/' || pathname.startsWith('/screen/')

  return (
    <div className="app-bg flex h-full w-full justify-center">
      <div
        className={`relative flex h-full w-full max-w-md flex-col overflow-hidden shadow-[0_0_0_1px_rgba(21,32,51,0.06)] ${
          isLens ? 'bg-black' : ''
        }`}
      >
        <div
          className={`min-h-0 flex-1 overflow-hidden ${showTab ? 'pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]' : ''}`}
        >
          <Outlet />
        </div>
        {showTab ? <TabBar /> : null}
      </div>
    </div>
  )
}
