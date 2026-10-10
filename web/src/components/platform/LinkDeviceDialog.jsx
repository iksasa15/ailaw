import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { checkHealth, createSceneRoom, getApiBase, getWsBase, makeLocalRoomId, setApiBase } from '../../services/api'
import { inviteApiBase, isLocalOrigin, makeJoinUrl, serverCandidates } from '../../platform/linkSession'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const ROLE_NAMES = { lawyer: 'المحامي', person: 'الشخص الأصم' }

/**
 * ربط جوال بالجلسة: يتحقق من الخادم، ينشئ غرفة، ويعرض رمز QR لرابط «/join».
 * يرى الحاسب «الجوال متصل» عبر رسائل presence من الخادم.
 */
/** أول خادم يستجيب من العناوين المحتملة؛ يُحفظ ليستعمله باقي الجلسة. */
async function findServer() {
  for (const base of serverCandidates(getApiBase(), window.location)) {
    try {
      await checkHealth(base)
      setApiBase(base)
      return base
    } catch {
      /* التالي */
    }
  }
  throw new Error('no-server')
}

export function LinkDeviceDialog({ booking, lawyer, person, onLinked, onClose, onServer }) {
  const [status, setStatus] = useState('checking') // checking | offline | ready
  const [room, setRoom] = useState('')
  const [hostRole, setHostRole] = useState('lawyer')
  const [siteOrigin, setSiteOrigin] = useState(() => window.location.origin)
  const [qr, setQr] = useState('')
  const [peers, setPeers] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState(false)
  const guestRole = hostRole === 'lawyer' ? 'person' : 'lawyer'

  useEffect(() => {
    let cancelled = false
    findServer()
      .then(async (base) => {
        onServer?.(base)
        let id
        try {
          id = (await createSceneRoom())?.room
        } catch {
          /* الخادم يقبل أي معرّف صالح */
        }
        if (!cancelled) {
          setRoom(id || makeLocalRoomId())
          setStatus('ready')
        }
      })
      .catch(() => !cancelled && setStatus('offline'))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const joinUrl = useMemo(
    () =>
      room
        ? makeJoinUrl({
            siteOrigin,
            api: inviteApiBase(getApiBase(), siteOrigin),
            room,
            role: guestRole,
            booking: { id: booking.id, lawyerName: lawyer?.name, personName: person?.name, caseType: booking.caseType },
          })
        : '',
    [room, siteOrigin, guestRole, booking, lawyer, person],
  )

  useEffect(() => {
    if (!joinUrl) return
    QRCode.toDataURL(joinUrl, { margin: 1, width: 260, color: { dark: '#0b1c24', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [joinUrl])

  // كم جهازاً في الغرفة (الحاسب + الجوال).
  useEffect(() => {
    if (!room) return undefined
    let ws
    try {
      ws = new WebSocket(`${getWsBase()}/ws/scene?room=${encodeURIComponent(room)}&role=${hostRole}`)
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'presence') setPeers(msg.count)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* لا اتصال مباشر — يبقى الرمز صالحاً */
    }
    return () => ws?.close()
  }, [room, hostRole])

  const phoneJoined = peers >= 2

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="ربط جوال بالجلسة">
      <button type="button" className="absolute inset-0 bg-[#0b1c24]/70 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-full w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white text-[var(--ink)] shadow-2xl">
        <div className="hero-bg flex items-center justify-between px-6 py-5 text-white">
          <div>
            <div className="text-lg font-black">ربط جوال بالجلسة</div>
            <div className="text-sm text-white/75">امسح الرمز بكاميرا الجوال — بدون تطبيق</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="إغلاق">
            <Icon name="x" size={20} />
          </button>
        </div>

        {status === 'checking' ? (
          <div className="flex flex-col items-center gap-3 p-10 text-[var(--muted)]">
            <span className="size-10 animate-spin rounded-full border-4 border-[var(--accent)]/20 border-t-[var(--accent)]" />
            نتحقق من الخادم…
          </div>
        ) : null}

        {status === 'offline' ? (
          <div className="flex flex-col gap-4 p-6">
            <div className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">ربط الجوال يحتاج تشغيل الخادم على هذا الحاسب.</div>
            <ol className="flex flex-col gap-3 text-[15px] leading-7">
              <li>
                <b>1.</b> شغّل الخادم:
                <code className="mt-1 block rounded-xl bg-[var(--bg)] px-3 py-2 text-left text-xs" dir="ltr">
                  cd backend && PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
                </code>
              </li>
              <li>
                <b>2.</b> شغّل المنصة على الشبكة وافتحها من عنوان <b>Network</b> (مثل https://192.168.x.x:5173):
                <code className="mt-1 block rounded-xl bg-[var(--bg)] px-3 py-2 text-left text-xs" dir="ltr">
                  cd web && npm run dev
                </code>
              </li>
              <li>
                <b>3.</b> الحاسب والجوال على نفس شبكة الواي فاي.
              </li>
            </ol>
            <Button onClick={() => { setStatus('checking'); setAttempt((n) => n + 1) }}>
              <Icon name="switch" size={18} /> إعادة المحاولة
            </Button>
          </div>
        ) : null}

        {status === 'ready' ? (
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-3xl border-4 border-[var(--accent)]/15 bg-white p-2">
                {qr ? <img src={qr} alt="رمز QR للانضمام" className="size-56" /> : <div className="size-56" />}
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ${phoneJoined ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 text-[var(--muted)]'}`}>
                <span className={`size-2.5 rounded-full ${phoneJoined ? 'bg-emerald-500' : 'animate-pulse bg-amber-400'}`} />
                {phoneJoined ? 'الجوال متصل ✓' : 'بانتظار مسح الرمز…'}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 text-sm font-bold text-[var(--muted)]">هذا الحاسب هو</div>
                <div className="grid grid-cols-2 gap-2">
                  {['lawyer', 'person'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setHostRole(r)}
                      className={`min-h-11 rounded-2xl border font-bold ${hostRole === r ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--ring)]'}`}
                    >
                      {ROLE_NAMES[r]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  الجوال يدخل كـ<b className="text-[var(--ink)]">{ROLE_NAMES[guestRole]}</b>
                  {guestRole === 'person' ? ': يشير بيده فتُنطق عباراته هنا، ويرى كلامك بالإشارة.' : ': يتكلم فيظهر كلامه هنا نصاً وإشارة.'}
                </p>
              </div>
              {isLocalOrigin(siteOrigin) ? (
                <label className="block rounded-2xl bg-amber-50 p-3 text-sm">
                  <span className="font-bold text-amber-800">الجوال لا يصل إلى localhost — اكتب عنوان المنصة على الشبكة:</span>
                  <input
                    dir="ltr"
                    value={siteOrigin}
                    onChange={(e) => setSiteOrigin(e.target.value.trim())}
                    placeholder="https://192.168.1.20:5173"
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-left"
                  />
                </label>
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigator.clipboard?.writeText(joinUrl).then(() => setCopied(true))}
                >
                  <Icon name="link" size={16} /> {copied ? 'نُسخ ✓' : 'نسخ الرابط'}
                </Button>
                <a href={joinUrl} target="_blank" rel="noreferrer" className="self-center text-sm font-bold text-[var(--accent)] underline-offset-2 hover:underline">
                  فتح الرابط في نافذة
                </a>
                <span className="self-center text-xs text-[var(--muted)] tabular-nums" dir="ltr">
                  room: {room}
                </span>
              </div>
              <Button size="lg" onClick={() => onLinked(room, hostRole)}>
                <Icon name="check" size={20} /> {phoneJoined ? 'ابدأ الجلسة المرتبطة' : 'ابدأ — والجوال ينضم متى مسح الرمز'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
