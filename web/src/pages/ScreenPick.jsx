import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, getApiBase, setApiBase } from '../services/api'
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
  const streamRef = useRef(null)
  const scanTimerRef = useRef(0)

  const guestRole = hostRole === 'lawyer' ? 'person' : hostRole === 'person' ? 'lawyer' : null
  const webInvite = guestRole ? makeWebPairURL(settings.apiBase || getApiBase(), guestRole) : ''
  const ailawInvite = guestRole ? makeAilawPairURL(settings.apiBase || getApiBase(), guestRole) : ''

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

  function showInviteFor(role) {
    setHostRole(role)
  }

  function openAs(role) {
    setHostRole(role)
    navigate(role === 'lawyer' ? '/screen/lawyer' : '/screen/person')
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

  async function startScan() {
    setJoinError(null)
    if (!('BarcodeDetector' in window)) {
      setJoinError('المتصفح لا يدعم مسح QR — الصق الرابط يدوياً أو افتحه من كاميرا الجوال.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setScanning(true)
      await new Promise((r) => setTimeout(r, 50))
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      scanTimerRef.current = window.setInterval(async () => {
        try {
          if (!videoRef.current) return
          const codes = await detector.detect(videoRef.current)
          const raw = codes?.[0]?.rawValue
          if (raw) applyJoin(raw)
        } catch {
          /* keep scanning */
        }
      }, 500)
    } catch {
      setJoinError('تعذر فتح الكاميرا للمسح')
      stopScan()
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-8 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-5 pb-10">
        <div>
          <p className="text-sm text-[#3ecf8e]">النظارة الذكية · قضية</p>
          <h1 className="mt-1 text-2xl font-bold">ربط جوالين</h1>
          <p className="mt-2 text-sm leading-7 text-white/70">
            جوال للمحامي وجوال للشخص — نفس الواي فاي ونفس الخادم.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl bg-white/5 p-4">
          <h2 className="text-base font-bold">ثلاث خطوات</h2>
          <Step n={1} text="شغّل الـ Backend على الماك والجوالان على نفس الواي فاي." />
          <Step n={2} text="على جوال المحامي: افحص الاتصال ثم «عرض دعوة QR» وأرِ الرمز للطرف الآخر." />
          <Step n={3} text="على جوال الشخص: امسح الدعوة أو الصق الرابط — تُفتح شاشته تلقائياً." />
        </section>

        <section className="space-y-3 rounded-2xl bg-white/5 p-4">
          <label className="block space-y-2">
            <span className="text-sm text-white/70">عنوان الخادم (API)</span>
            <input
              className="w-full rounded-xl border border-white/15 bg-[#0b1220] px-3 py-3 text-sm"
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
            className="min-h-11 w-full rounded-xl bg-[#3ecf8e] font-bold text-[#062016] disabled:opacity-60"
          >
            {checking ? 'جاري الفحص…' : 'حفظ وفحص الاتصال'}
          </button>
          <p className="flex items-center gap-2 text-sm text-white/70">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                healthOK === true ? 'bg-[#3ecf8e]' : healthOK === false ? 'bg-[#ff3b4e]' : 'bg-white/30'
              }`}
            />
            {healthDetail}
          </p>
          {(apiDraft.includes('localhost') || apiDraft.includes('127.0.0.1')) && (
            <p className="text-xs font-medium text-amber-300">
              تنبيه: على الجوال استخدم IP الماك (مثل 192.168.x.x) وليس localhost.
            </p>
          )}
        </section>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => openAs('lawyer')}
            className="flex flex-col gap-2 rounded-2xl bg-[#5eb8ff]/15 p-5 text-right ring-1 ring-[#5eb8ff]/40"
          >
            <span className="text-3xl" aria-hidden>
              ⚖️
            </span>
            <span className="text-xl font-bold">أنا المحامي</span>
            <span className="text-sm text-white/70">يفتح شاشة المحامي</span>
          </button>
          <button
            type="button"
            onClick={() => showInviteFor('lawyer')}
            className="rounded-xl bg-[#5eb8ff]/20 py-2.5 text-sm font-semibold text-[#5eb8ff]"
          >
            عرض دعوة QR للشخص
          </button>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => openAs('person')}
            className="flex flex-col gap-2 rounded-2xl bg-[#3ecf8e]/15 p-5 text-right ring-1 ring-[#3ecf8e]/40"
          >
            <span className="text-3xl" aria-hidden>
              👤
            </span>
            <span className="text-xl font-bold">أنا الشخص</span>
            <span className="text-sm text-white/70">يفتح شاشة الشخص</span>
          </button>
          <button
            type="button"
            onClick={() => showInviteFor('person')}
            className="rounded-xl bg-[#3ecf8e]/20 py-2.5 text-sm font-semibold text-[#3ecf8e]"
          >
            عرض دعوة QR للمحامي
          </button>
        </div>

        {guestRole && (
          <section className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-4">
            <h2 className="w-full text-base font-bold">
              دعوة الطرف الآخر ({guestRole === 'person' ? 'شخص' : 'محامي'})
            </h2>
            <img
              src={qrImageURL(webInvite, 220)}
              alt="رمز دعوة QR"
              className="rounded-2xl bg-white p-3"
              width={220}
              height={220}
            />
            <p className="break-all text-center text-[11px] text-white/55" dir="ltr">
              {webInvite}
            </p>
            <p className="break-all text-center text-[11px] text-white/40" dir="ltr">
              تطبيق iOS: {ailawInvite}
            </p>
            <button
              type="button"
              onClick={copyInvite}
              className="min-h-11 w-full rounded-xl bg-white/10 text-sm font-bold"
            >
              {copied ? 'تم النسخ ✓' : 'نسخ رابط الدعوة'}
            </button>
          </section>
        )}

        <section className="space-y-3 rounded-2xl bg-white/5 p-4">
          <h2 className="text-base font-bold">الانضمام من جهاز آخر</h2>
          {!scanning ? (
            <button
              type="button"
              onClick={startScan}
              className="min-h-11 w-full rounded-xl bg-[#3ecf8e] font-bold text-[#062016]"
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
              <button type="button" onClick={stopScan} className="min-h-10 w-full rounded-xl bg-white/10 text-sm">
                إيقاف المسح
              </button>
            </div>
          )}
          <input
            className="w-full rounded-xl border border-white/15 bg-[#0b1220] px-3 py-3 text-sm"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="الصق رابط الدعوة أو عنوان API"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => applyJoin(pasteText)}
            className="min-h-11 w-full rounded-xl bg-white/10 text-sm font-semibold"
          >
            تطبيق والانضمام
          </button>
          {joinError && <p className="text-sm text-[#ff3b4e]">{joinError}</p>}
        </section>

        <Link to="/" className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-white">
          العدسة المشتركة (تبديل الأدوار على جهاز واحد)
        </Link>
        <Link to="/guide" className="text-center text-sm text-white/50">
          📖 تعليمات
        </Link>
      </div>
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3ecf8e] text-xs font-bold text-[#062016]">
        {n}
      </span>
      <p className="text-sm leading-6 text-white/70">{text}</p>
    </div>
  )
}
