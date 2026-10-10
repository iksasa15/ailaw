import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { publishScenePhrase } from '../../services/api'
import { useSettings } from '../../app/SettingsContext'
import { LinkDeviceDialog } from '../../components/platform/LinkDeviceDialog'
import { appendEntry, CHANNEL_LABELS, removeEcho } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useNow } from '../../platform/useNow'
import { LAWYER_PHRASES } from '../../hooks/useFingerPhrases'
import Home from '../Home'
import { useTts } from '../../hooks/useTts'
import { FOCUS_CLASS, FullscreenButton, useFocusMode } from '../../components/platform/FullscreenButton'
import { SignTranslator } from '../../components/platform/SignTranslator'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

const ROLE_NAMES = { person: 'الشخص', lawyer: 'المحامي' }
const QUICK_REPLIES = ['نعم', 'لا', 'لم أفهم، أعد من فضلك', 'انتظر لحظة', 'أحتاج مساعدة', 'شكراً']
const LAWYER_REPLIES = Object.values(LAWYER_PHRASES)

/** أضيق من نقطة lg في Tailwind (64rem): المترجم بطاقة مضغوطة فوق الكاميرا */
const NARROW_QUERY = '(max-width: 63.99rem)'
const subscribeNarrow = (notify) => {
  const mq = window.matchMedia(NARROW_QUERY)
  mq.addEventListener('change', notify)
  return () => mq.removeEventListener('change', notify)
}
const isNarrow = () => window.matchMedia(NARROW_QUERY).matches
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
  // جوال مرتبط عبر QR: { room, hostRole } — العدسة هنا تصبح شاشة دور هذا الحاسب في غرفة الخادم.
  const [link, setLink] = useState(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const { update: updateSettings } = useSettings()
  const now = useNow(1000)
  const listRef = useRef(null)
  const [focused, toggleFocus] = useFocusMode()
  const [draft, setDraft] = useState('')
  const { speak, unlock } = useTts({ cooldownMs: 0 })
  // بلا جوال: من يكتب هنا؟ الشخص (يُنطق) أو المحامي (يراه الشخص بالإشارة ولا يُنطق)
  const [speaker, setSpeaker] = useState('person')
  const [speech, setSpeech] = useState(null)
  const [translatorOpen, setTranslatorOpen] = useState(true)
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false)

  // ما تنطقه العدسة ويلتقطه المايك على نفس الجهاز لا يُسجَّل ككلام المحامي؛ وكلام المحامي
  // الذي جاء بعد الصدى مباشرة يُحفظ بدونه.
  const onConversation = useCallback((entry) => {
    setEntries((list) => {
      const clean = removeEcho(list, entry)
      return clean ? appendEntry(list, clean) : list
    })
  }, [])

  // المترجم على هذه الشاشة حين يكون الأصم أمامها: بلا جوال، أو الحاسب دور الشخص
  const showTranslator = !link || link.hostRole === 'person'
  const sentences = useMemo(
    () => entries.filter((e) => e.role === 'lawyer').map((e) => ({ id: `${e.at}:${e.text}`, text: e.text })),
    [entries],
  )

  // اكتب وانطق: يُسجَّل في المحضر. بدون جوال مرتبط يكتب الشخص فيُنطق للمحامي؛
  // مع جوال مرتبط يكتب دور هذا الحاسب ويصل للجوال (الشخص يراه بالإشارة).
  const say = useCallback(
    (text) => {
      const message = String(text || '').trim()
      if (!message) return
      const role = link ? link.hostRole : speaker
      if (role === 'person') {
        unlock()
        speak(message, { force: true })
      }
      if (link) publishScenePhrase({ role, text: message, fingers: null, room: link.room }).catch(() => {})
      setEntries((list) => appendEntry(list, { role, text: message, at: Date.now() }))
    },
    [speak, unlock, link, speaker],
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
  const writerRole = link ? link.hostRole : speaker
  const quickReplies = writerRole === 'lawyer' ? LAWYER_REPLIES : QUICK_REPLIES

  const end = () => {
    if (!window.confirm('إنهاء الجلسة وإنشاء المحضر؟')) return
    const result = complete(booking.id, entries, startedAt, Date.now())
    if (result.ok) navigate(`/app/session/${booking.id}/record`, { replace: true })
  }

  const startLinked = (room, hostRole) => {
    updateSettings({ roomId: room, receiveEnabled: true })
    setLink({ room, hostRole })
    setLinkOpen(false)
  }

  const panel = (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-[#0b1630] p-5 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-[#f9bd29]">جلسة مباشرة · {booking.caseType}</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{clock(now.getTime() - startedAt)}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">
            <span className="size-2 animate-pulse rounded-full bg-red-400" /> مباشر
          </span>
          <FullscreenButton focused={focused} onToggle={toggleFocus} />
        </div>
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
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#f9bd29]">
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
                      e.role === 'lawyer' ? 'bg-[#a22897] text-white' : 'bg-[#136fb0] text-white'
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

      <form
        className="flex flex-col gap-2 rounded-2xl bg-white/6 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          say(draft)
          setDraft('')
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#f9bd29]">
            <Icon name="volume" size={16} /> {writerRole === 'lawyer' ? 'اكتب للشخص (يراه بالإشارة)' : 'اكتب وانطق'}
          </div>
          {!link ? (
            <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-white/70" role="group" aria-label="من يكتب">
              <span>أنا:</span>
              <span className="flex rounded-full bg-white/10 p-0.5">
                {Object.entries(ROLE_NAMES).map(([role, name]) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={speaker === role}
                    onClick={() => setSpeaker(role)}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      speaker === role ? 'bg-[#136fb0] text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => say(r)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10 hover:bg-[#136fb0]"
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder="اكتب ما تريد قوله…"
            aria-label="اكتب ما تريد قوله"
            className="min-h-10 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#f9bd29]/50"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="انطق"
            className="flex size-10 items-center justify-center rounded-xl bg-[#136fb0] text-white disabled:opacity-40"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>

      {link ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" /> مرتبط بجوال · هذا الحاسب: {link.hostRole === 'lawyer' ? 'المحامي' : 'الشخص'}
          </span>
          <button type="button" onClick={() => setLink(null)} className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/10">
            فصل
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button variant="dark" onClick={() => setLinkOpen(true)}>
          <Icon name="link" size={18} /> ربط جهاز ثانٍ (QR)
        </Button>
        <Button variant="danger" size="lg" onClick={end}>
          <Icon name="x" size={20} /> إنهاء الجلسة
        </Button>
      </div>
    </div>
  )

  return (
    <div className={`${focused ? FOCUS_CLASS : 'relative h-full'} bg-black lg:grid lg:grid-cols-[1fr_380px]`}>
      <div className={`flex h-full min-h-0 flex-col ${showTranslator ? 'lg:grid lg:grid-cols-2' : ''}`}>
        {showTranslator ? (
          <div className="flex max-h-[45%] min-h-0 shrink-0 flex-col bg-[#0b1630] lg:max-h-none lg:border-l lg:border-white/10">
            {/* تحت lg: شريط يطوي المترجم؛ المترجم نفسه يُرسم مرة واحدة فلا يُعاد تركيبه */}
            <button
              type="button"
              onClick={() => setTranslatorOpen((o) => !o)}
              aria-expanded={translatorOpen}
              className="flex min-h-11 shrink-0 items-center justify-between px-4 text-sm font-black text-[#f9bd29] lg:hidden"
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="hand" size={16} /> مترجم الإشارة
              </span>
              <span aria-hidden="true">{translatorOpen ? '▴' : '▾'}</span>
            </button>
            <div className={`min-h-0 flex-1 flex-col ${translatorOpen ? 'flex' : 'hidden lg:flex'}`}>
              <SignTranslator sentences={sentences} status={link ? undefined : speech} compact={narrow} />
            </div>
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 lg:h-full">
          {link ? (
            <Home key={link.room} lockedRole={link.hostRole} hideSignCoach onConversation={onConversation} preferBrowserStt />
          ) : (
            <Home
              key="solo"
              serverless
              hideSignCoach
              onConversation={onConversation}
              onSpeechState={setSpeech}
              preferBrowserStt
            />
          )}
        </div>
      </div>
      <aside className="hidden h-full min-h-0 border-r border-white/10 lg:block">{panel}</aside>

      {/* الجوال: شريط سفلي يفتح اللوحة */}
      <div className="absolute inset-x-3 bottom-3 z-40 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex min-h-12 flex-1 items-center justify-between rounded-2xl bg-[#0b1630]/90 px-4 font-bold text-white ring-1 ring-white/10 backdrop-blur"
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="message" size={18} /> المحادثة ({entries.length})
          </span>
          <span className="tabular-nums">{clock(now.getTime() - startedAt)}</span>
        </button>
        <FullscreenButton focused={focused} onToggle={toggleFocus} className="size-12 rounded-2xl" />
        <Button variant="danger" onClick={end} aria-label="إنهاء الجلسة">
          <Icon name="x" size={20} />
        </Button>
      </div>
      {linkOpen ? (
        <LinkDeviceDialog
          booking={booking}
          lawyer={lawyer}
          person={person}
          onServer={(base) => updateSettings({ apiBase: base })}
          onLinked={startLinked}
          onClose={() => setLinkOpen(false)}
        />
      ) : null}
      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="لوحة الجلسة">
          <button type="button" className="h-24 shrink-0 bg-black/50" aria-label="إغلاق" onClick={() => setPanelOpen(false)} />
          <div className="min-h-0 flex-1 overflow-hidden rounded-t-3xl">{panel}</div>
        </div>
      ) : null}
    </div>
  )
}
