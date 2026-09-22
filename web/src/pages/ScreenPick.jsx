import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, createSceneRoom, getApiBase, makeLocalRoomId, setApiBase } from '../services/api'
import {
  applyPairInvite,
  makeAilawPairURL,
  makeWebPairURL,
  parsePairInvite,
  qrImageURL,
} from '../services/pairInvite'

export default function ScreenPick() {
  const { settings, update } = useSettings()
  const navigate = useNavigate()
  const [apiDraft, setApiDraft] = useState(settings.apiBase || getApiBase())
  const [healthOK, setHealthOK] = useState(null)
  const [healthDetail, setHealthDetail] = useState('لم يُفحص بعد')
  const [checking, setChecking] = useState(false)
  const [hostRole, setHostRole] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanTimerRef = useRef(0)
  const fileInputRef = useRef(null)

  const guestRole = hostRole === 'lawyer' ? 'person' : hostRole === 'person' ? 'lawyer' : null
  const roomId = settings.roomId || ''
  const webInvite = guestRole
    ? makeWebPairURL(settings.apiBase || getApiBase(), guestRole, roomId)
    : ''
  const ailawInvite = guestRole
    ? makeAilawPairURL(settings.apiBase || getApiBase(), guestRole, roomId)
    : ''

  const runHealth = useCallback(async () => {
    setChecking(true)
    try {
      const h = await checkHealth()
      const ok = h.status === 'ok' || h.whisper != null
      setHealthOK(ok)
      setHealthDetail(ok ? 'متصل بالخادم ✓' : 'استجابة غير متوقعة')
    } catch (e) {
      setHealthOK(false)
      setHealthDetail(`غير متصل — ${e.message || 'فشل الاتصال'}`)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    runHealth()
  }, [runHealth, settings.apiBase])

  useEffect(() => () => stopScan(), [])

  async function saveAndCheck() {
    const cleaned = apiDraft.trim().replace(/\/$/, '')
    setApiBase(cleaned)
    update({ apiBase: cleaned })
    await runHealth()
  }

  async function startSession(role = 'lawyer') {
    setJoinError(null)
    stopScan()
    const cleaned = apiDraft.trim().replace(/\/$/, '')
    if (cleaned) {
      setApiBase(cleaned)
      update({ apiBase: cleaned })
    }
    let room = settings.roomId
    try {
      const created = await createSceneRoom()
      if (created?.room) room = created.room
    } catch {
      room = makeLocalRoomId()
    }
    update({ roomId: room })
    setHostRole(role)
    await runHealth()
  }

  function endSession() {
    setHostRole(null)
  }

  function enterMyScreen() {
    if (!hostRole) return
    navigate(hostRole === 'lawyer' ? '/screen/lawyer' : '/screen/person')
  }

  function copyInvite() {
    const text = webInvite || ailawInvite
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function applyJoin(raw) {
    const invite = parsePairInvite(raw)
    if (!invite) {
      setJoinError('رابط غير صالح. الصق دعوة /pair أو ailaw:// أو عنوان http://IP:8000')
      return
    }
    setJoinError(null)
    const path = applyPairInvite(invite, update)
    setApiDraft(invite.api)
    stopScan()
    navigate(path)
  }

  function stopScan() {
    setScanning(false)
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current)
      scanTimerRef.current = 0
    }
    streamRef.current?.getTracks?.().forEach((t) => t.stop())
    streamRef.current = null
  }

  function decodeWithJsQR(video) {
    const canvas = canvasRef.current
    if (!canvas || !video || video.readyState < 2) return null
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)
    const image = ctx.getImageData(0, 0, w, h)
    const code = jsQR(image.data, image.width, image.height, {
      inversionAttempts: 'attemptBoth',
    })
    return code?.data || null
  }

  async function startScan() {
    setJoinError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setJoinError('افتح الموقع عبر HTTPS ثم اسمح بالكاميرا، أو الصق الرابط / ارفع صورة QR.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setScanning(true)
      await new Promise((r) => setTimeout(r, 80))
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play()
      }

      const useNative = typeof window.BarcodeDetector === 'function'
      let detector = null
      if (useNative) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        } catch {
          detector = null
        }
      }

      scanTimerRef.current = window.setInterval(async () => {
        try {
          const v = videoRef.current
          if (!v) return
          let raw = null
          if (detector) {
            try {
              const codes = await detector.detect(v)
              raw = codes?.[0]?.rawValue || null
            } catch {
              raw = null
            }
          }
          if (!raw) raw = decodeWithJsQR(v)
          if (raw) applyJoin(raw)
        } catch {
          /* keep scanning */
        }
      }, 350)
    } catch {
      setJoinError('تعذر فتح الكاميرا للمسح — جرّب رفع صورة QR أو لصق الرابط.')
      stopScan()
    }
  }

  function onPickQrFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setJoinError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = canvasRef.current || document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: 'attemptBoth',
        })
        URL.revokeObjectURL(url)
        if (code?.data) applyJoin(code.data)
        else setJoinError('لم يُعثر على رمز QR في الصورة')
      } catch {
        URL.revokeObjectURL(url)
        setJoinError('تعذر قراءة صورة QR')
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setJoinError('تعذر تحميل الصورة')
    }
    img.src = url
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-[var(--ink)]">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div>
          <p className="font-brand text-[0.8rem] font-bold tracking-wide text-[var(--accent)]">
            النظارة الذكية
          </p>
          <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight">جلسة جوالين</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            جوال للمحامي وجوال للشخص — نفس الواي فاي ونفس الخادم.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl app-surface p-4">
          <h2 className="text-base font-bold">ثلاث خطوات</h2>
          <Step n={1} text="شغّل الـ Backend والجوالان على نفس الواي فاي." />
          <Step n={2} text="اضغط «ابدأ الجلسة» — يظهر QR. أرِه لجوال الشخص." />
          <Step n={3} text="بعد ما ينضم الطرف الآخر، اضغط «ادخل شاشتي» وابدأ." />
        </section>

        <section className="space-y-3 rounded-2xl app-surface p-4">
          <label className="block space-y-2">
            <span className="text-sm text-[var(--ink)]/70">عنوان الخادم (API)</span>
            <input
              className="w-full rounded-xl border border-[var(--ring)] bg-white px-3 py-3 text-sm"
              value={apiDraft}
              onChange={(e) => setApiDraft(e.target.value)}
              placeholder="http://192.168.x.x:8000"
              dir="ltr"
            />
          </label>
          <button
            type="button"
            disabled={checking}
            onClick={saveAndCheck}
            className="min-h-11 w-full rounded-xl bg-white/80 font-semibold text-[var(--ink)] disabled:opacity-60"
          >
            {checking ? 'جاري الفحص…' : 'حفظ وفحص الاتصال'}
          </button>
          <p className="flex items-center gap-2 text-sm text-[var(--ink)]/70">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                healthOK === true ? 'bg-[var(--accent)]' : healthOK === false ? 'bg-[var(--danger)]' : 'bg-white/30'
              }`}
            />
            {healthDetail}
          </p>
          {(apiDraft.includes('localhost') || apiDraft.includes('127.0.0.1')) && (
            <p className="text-xs font-medium text-amber-700">
              تنبيه: على الجوال استخدم IP الماك (مثل 192.168.x.x) وليس localhost.
            </p>
          )}
          {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
            <p className="text-xs text-[var(--ink)]/55">
              على HTTPS يمكنك وضع:{' '}
              <span dir="ltr">{`${window.location.origin}/api`}</span>
            </p>
          )}
        </section>

        {!hostRole ? (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => startSession('lawyer')}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-[var(--accent-2)] p-6 text-white shadow-lg"
            >
              <span className="text-4xl" aria-hidden>
                ⚖️
              </span>
              <span className="text-xl font-bold">ابدأ الجلسة</span>
              <span className="text-sm opacity-80">يظهر رمز QR لدعوة جوال الشخص</span>
            </button>
            <button
              type="button"
              onClick={() => startSession('person')}
              className="w-full rounded-xl bg-[var(--accent)]/20 py-3 text-sm font-semibold text-[var(--accent)]"
            >
              ابدأ كشخص (دعوة المحامي بـ QR)
            </button>
          </section>
        ) : (
          <section className="flex flex-col items-center gap-4 rounded-2xl app-surface p-5 ring-1 ring-[rgba(15,118,110,0.28)]">
            <div className="w-full text-center">
              <p className="text-sm text-[var(--accent)]">الجلسة نشطة</p>
              <h2 className="mt-1 text-xl font-bold">
                أنت: {hostRole === 'lawyer' ? '⚖️ المحامي' : '👤 الشخص'}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink)]/65">
                أرِ هذا الرمز لجوال {guestRole === 'person' ? 'الشخص' : 'المحامي'}
              </p>
              {roomId ? (
                <p className="mt-1 text-xs text-[var(--ink)]/45" dir="ltr">
                  غرفة الجلسة: {roomId}
                </p>
              ) : null}
            </div>
            <img
              src={qrImageURL(webInvite, 240)}
              alt="رمز دعوة الجلسة"
              className="rounded-2xl bg-white p-3"
              width={240}
              height={240}
            />
            <p className="break-all text-center text-[11px] text-[var(--ink)]/50" dir="ltr">
              {webInvite}
            </p>
            <button
              type="button"
              onClick={copyInvite}
              className="min-h-11 w-full rounded-xl bg-white/80 text-sm font-bold"
            >
              {copied ? 'تم النسخ ✓' : 'نسخ رابط الدعوة'}
            </button>
            <button
              type="button"
              onClick={enterMyScreen}
              className="min-h-12 w-full rounded-xl bg-[var(--accent)] text-base font-bold text-white"
            >
              ادخل شاشتي الآن
            </button>
            <button
              type="button"
              onClick={endSession}
              className="text-sm text-[var(--ink)]/50 underline"
            >
              إنهاء الجلسة / إخفاء QR
            </button>
          </section>
        )}

        <section className="space-y-3 rounded-2xl app-surface p-4">
          <h2 className="text-base font-bold">أو انضم لجلسة جاهزة</h2>
          {!scanning ? (
            <button
              type="button"
              onClick={startScan}
              className="min-h-11 w-full rounded-xl bg-[var(--accent)] font-bold text-white"
            >
              مسح رمز الدعوة QR
            </button>
          ) : (
            <div className="space-y-2">
              <video
                ref={videoRef}
                className="aspect-square w-full rounded-xl bg-black object-cover"
                muted
                playsInline
              />
              <p className="text-center text-xs text-[var(--ink)]/60">وجّه الكاميرا نحو رمز QR…</p>
              <button type="button" onClick={stopScan} className="min-h-10 w-full rounded-xl bg-white/80 text-sm">
                إيقاف المسح
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 w-full rounded-xl bg-white/80 text-sm font-semibold"
          >
            رفع صورة QR من المعرض
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickQrFile}
          />
          <input
            className="w-full rounded-xl border border-[var(--ring)] bg-white px-3 py-3 text-sm"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="الصق رابط الدعوة أو عنوان API"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => applyJoin(pasteText)}
            className="min-h-11 w-full rounded-xl bg-white/80 text-sm font-semibold"
          >
            تطبيق والانضمام
          </button>
          {joinError && <p className="text-sm text-[var(--danger)]">{joinError}</p>}
        </section>

        <Link to="/lab" className="rounded-xl bg-[var(--accent)]/20 px-4 py-3 text-center text-sm font-bold text-[var(--accent)]">
          تجربة محامي + أفتار (جهاز واحد)
        </Link>
        <Link to="/" className="rounded-xl bg-white/80 px-4 py-3 text-center text-sm text-[var(--ink)]">
          العدسة المشتركة (تبديل الأدوار على جهاز واحد)
        </Link>
        <Link to="/guide" className="text-center text-sm text-[var(--muted)]">
          التعليمات
        </Link>
      </div>
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
        {n}
      </span>
      <p className="text-sm leading-6 text-[var(--ink)]/70">{text}</p>
    </div>
  )
}
