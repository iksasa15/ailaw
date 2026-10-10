/** قوائم المنصة لكل دور (المواصفات §3). */
export const NAV = {
  person: [
    { to: '/app', label: 'الرئيسية', icon: 'home', end: true },
    { to: '/app/lawyers', label: 'المحامون', icon: 'users' },
    { to: '/app/sessions', label: 'جلساتي', icon: 'calendar' },
    { to: '/app/learn', label: 'مركز التعلّم', icon: 'book' },
    { to: '/app/impact', label: 'الأثر', icon: 'chart' },
    { to: '/app/lens', label: 'العدسة', icon: 'glasses' },
    { to: '/app/lab', label: 'المعمل', icon: 'flask' },
    { to: '/app/guide', label: 'التعليمات', icon: 'help' },
    { to: '/app/settings', label: 'الإعدادات', icon: 'settings' },
  ],
  lawyer: [
    { to: '/app', label: 'لوحتي', icon: 'home', end: true },
    { to: '/app/requests', label: 'طلبات الحجز', icon: 'inbox', badge: 'pending' },
    { to: '/app/sessions', label: 'جلساتي', icon: 'calendar' },
    { to: '/app/availability', label: 'أوقات التوفر', icon: 'clock' },
    { to: '/app/impact', label: 'الأثر', icon: 'chart' },
    { to: '/app/lens', label: 'العدسة', icon: 'glasses' },
    { to: '/app/guide', label: 'التعليمات', icon: 'help' },
    { to: '/app/settings', label: 'الإعدادات', icon: 'settings' },
  ],
}

const EXTRA_TITLES = [
  [/^\/app\/lawyers\/[^/]+$/, 'صفحة المحامي'],
  [/^\/app\/session\/[^/]+\/record$/, 'محضر الجلسة'],
  [/^\/app\/session\/[^/]+\/check$/, 'فحص الجهاز'],
  [/^\/app\/session\/[^/]+$/, 'غرفة الجلسة'],
  [/^\/app\/learn\/certificate\/.+$/, 'شهادة إتمام'],
  [/^\/app\/learn\/.+$/, 'درس'],
  [/^\/app\/about$/, 'عن المشروع'],
]

export function pageTitle(pathname, role) {
  for (const [re, title] of EXTRA_TITLES) if (re.test(pathname)) return title
  const items = NAV[role] || []
  const exact = items.find((i) => i.to === pathname)
  if (exact) return exact.label
  const prefix = items.filter((i) => !i.end && pathname.startsWith(i.to)).sort((a, b) => b.to.length - a.to.length)[0]
  return prefix?.label || 'المحامون العرب'
}

/** العدسة وغرفة الجلسة تملآن المساحة بلا هوامش. */
export const isFullBleed = (pathname) => pathname === '/app/lens' || /^\/app\/session\/[^/]+$/.test(pathname)
