import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'

const LINKS = [
  {
    to: '/guide',
    title: 'التعليمات',
    body: 'كيف تستخدم العدسة والإشارات والأمان',
  },
  {
    to: '/settings',
    title: 'الإعدادات',
    body: 'الخادم، العبارات، وحجم النص',
  },
  {
    to: '/about',
    title: 'عن المشروع',
    body: 'نظرة عامة ومفردات الديمو',
  },
]

export default function More() {
  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <PageHeader title="المزيد" subtitle="أدلة وإعدادات التطبيق" />
        <div className="space-y-3">
          {LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="app-surface group flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-right transition active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--ink)]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </div>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] transition group-active:scale-95"
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
