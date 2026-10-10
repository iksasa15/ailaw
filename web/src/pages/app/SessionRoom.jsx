import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { checkHealth } from '../../services/api'
import { appendEntry, CHANNEL_LABELS, isEcho } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import Home from '../Home'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

const ROLE_NAMES = { person: 'الشخص', lawyer: 'المحامي' }
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const timeOf = (at) => new Date(at).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })

/** غرفة الجلسة: العدسة كما هي + لوحة المشاركين والمؤقت والمحادثة و«إنهاء الجلسة». */
export default function SessionRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { myBookings, lawyerById, userById, complete } = usePlatform()
  const booking = myBookings.find((b) => b.id === id)
  const [startedAt] = useState(() => Date.now())
  const [entries, setEntries] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [linkError, setLinkError] = useState('')
  const now = useNow(1000)
  const listRef = useRef(null)

  // ما تنطقه العدسة ويلتقطه المايك على نفس الجهاز لا يُسجَّل ككلام المحامي.
  const onConversation = useCallback(
    (entry) => setEntries((list) => (isEcho(list, entry) ? list : appendEntry(list, entry))),
    [],
  )

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries])

  if (!booking || booking.status !== 'confirmed') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon="calendar"
          title="لا يمكن دخول هذه الجلسة"
          text={booking ? 'الجلسة غير مؤكدة بعد أو انتهت.' : 'الجلسة غير موجودة.'}
          action={
            <Button as={Link} to="/app/sessions">
              جلساتي
            </Button>
          }
        />
      </div>
    )
  }

  const lawyer = lawyerById(booking.lawyerId)
  const person = userById(booking.personId)

  const end = () => {
    if (!window.confirm('إنهاء الجلسة وإنشاء المحضر؟')) return
    const result = complete(booking.id, entries, startedAt, Date.now())
    if (result.ok) navigate(`/app/session/${booking.id}/record`, { replace: true })
  }

  const linkDevice = async () => {
    setLinkError('')
    try {
      await checkHealth()
      navigate('/screens')
    } catch {
      setLinkError('ربط جهاز ثانٍ يتطلب تشغيل الخادم. الجلسة تعمل على هذا الجهاز بدونه.')
    }
  }

  const panel = (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-[#061217] p-5 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-[#5eead4]">جلسة مباشرة · {booking.caseType}</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{clock(now.getTime() - startedAt)}</div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">
          <span className="size-2 animate-pulse rounded-full bg-red-400" /> مباشر
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          [lawyer?.name, 'المحامي'],
          [person?.name, `الموكّل · ${CHANNEL_LABELS[booking.channel]}`],
        ].map(([name, label]) => (
          <div key={label} className="flex items-center gap-2 rounded-2xl bg-white/6 p-3">
            <Avatar name={name} size={36} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold">{name}</div>
              <div className="truncate text-[11px] text-white/60">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white/6 p-3">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#5eead4]">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="message" size={16} /> المحادثة
          </span>
          <span className="text-white/50 tabular-nums">{entries.length}</span>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {entries.length ? (
            <ul className="flex flex-col gap-2.5">
              {entries.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      e.role === 'lawyer' ? 'bg-[#1e5bb8] text-white' : 'bg-[#0f766e] text-white'
                    }`}
                  >
                    {ROLE_NAMES[e.role]}
                  </span>
                  <span className="flex-1 text-[15px] font-medium leading-6">{e.text}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-white/40">{timeOf(e.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-white/55">
              ما يقوله المحامي (المايك) وما يشير به الشخص (الكاميرا) يظهر هنا ويُحفظ في المحضر.
            </p>
          )}
        </div>
      </div>

      {linkError ? <div className="rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">{linkError}</div> : null}
      <div className="flex flex-col gap-2">
        <Button variant="dark" onClick={linkDevice}>
          <Icon name="link" size={18} /> ربط جهاز ثانٍ (QR)
        </Button>
        <Button variant="danger" size="lg" onClick={end}>
          <Icon name="x" size={20} /> إنهاء الجلسة
        </Button>
      </div>
    </div>
  )

  return (
    <div className="relative h-full lg:grid lg:grid-cols-[1fr_380px]">
      <div className="relative h-full min-h-0">
        <Home serverless onConversation={onConversation} />
      </div>
      <aside className="hidden h-full min-h-0 border-r border-white/10 lg:block">{panel}</aside>

      {/* الجوال: شريط سفلي يفتح اللوحة */}
      <div className="absolute inset-x-3 bottom-3 z-40 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex min-h-12 flex-1 items-center justify-between rounded-2xl bg-[#061217]/90 px-4 font-bold text-white ring-1 ring-white/10 backdrop-blur"
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="message" size={18} /> المحادثة ({entries.length})
          </span>
          <span className="tabular-nums">{clock(now.getTime() - startedAt)}</span>
        </button>
        <Button variant="danger" onClick={end} aria-label="إنهاء الجلسة">
          <Icon name="x" size={20} />
        </Button>
      </div>
      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="لوحة الجلسة">
          <button type="button" className="h-24 shrink-0 bg-black/50" aria-label="إغلاق" onClick={() => setPanelOpen(false)} />
          <div className="min-h-0 flex-1 overflow-hidden rounded-t-3xl">{panel}</div>
        </div>
      ) : null}
    </div>
  )
}
