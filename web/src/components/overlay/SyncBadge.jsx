/** شارة مزامنة لجهازين (محامي / شخص) */
export function SyncBadge({ state = 'waiting' }) {
  const map = {
    synced: { text: 'متزامن', cls: 'bg-[#3ecf8e] text-[#062016]' },
    waiting: { text: 'بانتظار الطرف الآخر', cls: 'bg-amber-400/90 text-[#1a1200]' },
    offline: { text: 'غير متصل بالخادم', cls: 'bg-[#ff3b4e]/90 text-white' },
  }
  const item = map[state] || map.waiting
  return (
    <div
      className={`pointer-events-none rounded-full px-3 py-1.5 text-xs font-semibold shadow-md ${item.cls}`}
    >
      {item.text}
    </div>
  )
}
