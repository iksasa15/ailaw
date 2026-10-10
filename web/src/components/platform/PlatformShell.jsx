import { Outlet, useLocation } from 'react-router-dom'
import { MobileTabs } from './MobileTabs'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { isFullBleed } from './nav'

/** غلاف المنصة: قائمة جانبية (≥1024px)، شريط علوي، وتبويبات سفلية على الجوال. */
export function PlatformShell() {
  const { pathname } = useLocation()
  const full = isFullBleed(pathname)
  return (
    <div className="platform-bg flex h-full w-full print:block print:h-auto print:bg-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <TopBar />
        {full ? (
          <main className="relative min-h-0 flex-1 pb-16 lg:pb-0">
            <Outlet />
          </main>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 lg:px-8 lg:pb-12 print:p-0">
              <Outlet />
            </div>
          </main>
        )}
        <MobileTabs />
      </div>
    </div>
  )
}
