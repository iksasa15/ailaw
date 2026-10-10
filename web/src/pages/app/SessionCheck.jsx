import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDate, formatTime } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { useCamera } from '../../hooks/useCamera'
import { useHands } from '../../hooks/useHands'
import { useTts } from '../../hooks/useTts'
import { HandLandmarkCanvas, PermissionGate, VideoFeed } from '../../components/camera/Camera'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

/** مستوى صوت المايك 0..1 (Web Audio)، و`heard` بعد أول صوت واضح. */
function useMicLevel() {
  const [state, setState] = useState({ status: 'requesting', level: 0, heard: false })
  useEffect(() => {
    let stream
    let ctx
    let raf = 0
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(s).connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        let last = 0
        let heard = false
        const tick = () => {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (const v of data) sum += ((v - 128) / 128) ** 2
          const level = Math.min(1, Math.sqrt(sum / data.length) * 5)
          const firstHeard = !heard && level > 0.18
          heard ||= firstHeard
          if (Math.abs(level - last) > 0.03 || firstHeard) {
            last = level
            setState({ status: 'ready', level, heard })
          }
          raf = requestAnimationFrame(tick)
        }
        setState({ status: 'ready', level: 0, heard: false })
        tick()
      })
      .catch(() => setState({ status: 'denied', level: 0, heard: false }))
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
    }
  }, [])
  return state
}

const sttSupported = () => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

function Row({ ok, fail, title, text, children }) {
  const tone = ok ? 'bg-emerald-100 text-emerald-600' : fail ? 'bg-red-100 text-red-600' : 'bg-black/5 text-[var(--muted)]'
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--bg)] p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon name={ok ? 'check' : fail ? 'x' : 'clock'} size={18} strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-black">{title}</div>
        <div className="text-sm text-[var(--muted)]">{text}</div>
        {children}
      </div>
    </div>
  )
}

/** غرفة انتظار قبل الجلسة: الكاميرا واليد، المايك، السماعة، والتعرف على الكلام. */
export default function SessionCheck() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { myBookings, lawyerById, userById, state } = usePlatform()
  const booking = myBookings.find((b) => b.id === id)
  const camera = useCamera({ facingMode: 'user', enabled: true })
  const hands = useHands({ videoRef: camera.videoRef, enabled: camera.status === 'ready' })
  const mic = useMicLevel()
  const { speak, unlock } = useTts({ cooldownMs: 0 })
  const [handSeen, setHandSeen] = useState(false)
  const [speakerOk, setSpeakerOk] = useState(false)
  const [played, setPlayed] = useState(false)
  if (!handSeen && hands.trackingQuality !== 'lost') setHandSeen(true)

  if (!booking || booking.status !== 'confirmed') {
    return (
      <EmptyState
        icon="calendar"
        title="لا يمكن دخول هذه الجلسة"
        action={
          <Button as={Link} to="/app/sessions">
            جلساتي
          </Button>
        }
      />
    )
  }
  const other = state.role === 'lawyer' ? userById(booking.personId) : lawyerById(booking.lawyerId)
  const stt = sttSupported()
  const ready = camera.status === 'ready' && handSeen && mic.heard && speakerOk && stt

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video overflow-hidden rounded-[24px] bg-black">
          <PermissionGate status={camera.status} error={camera.error} onRetry={camera.start}>
            <VideoFeed videoRef={camera.videoRef} />
            <HandLandmarkCanvas canvasRef={hands.canvasRef} />
          </PermissionGate>
          <div className="absolute start-3 top-3 z-20 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
            {handSeen ? '✓ اليد ظاهرة' : 'ارفع يدك أمام الكاميرا'}
          </div>
        </div>
        <Card className="flex items-center gap-4">
          <Avatar name={other?.name} size={48} />
          <div className="flex-1">
            <div className="text-sm text-[var(--muted)]">جلستك مع</div>
            <div className="text-lg font-black">{other?.name}</div>
            <div className="text-sm text-[var(--muted)]">
              {booking.kind === 'instant' ? 'استشارة فورية · الآن' : `${formatDate(booking.start)} · ${formatTime(booking.start)}`} · {booking.caseType}
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-black">فحص سريع قبل الجلسة</h2>
        <Row
          ok={camera.status === 'ready' && handSeen}
          fail={camera.status === 'denied' || camera.status === 'error'}
          title="الكاميرا وتتبع اليد"
          text={camera.status === 'ready' ? (handSeen ? 'الكاميرا ترى يدك.' : 'ارفع يدك حتى يظهر هيكلها.') : 'اسمح للكاميرا من المتصفح.'}
        />
        <Row ok={mic.heard} fail={mic.status === 'denied'} title="الميكروفون" text={mic.status === 'denied' ? 'اسمح للمايك من المتصفح.' : 'تكلّم قليلاً ليتحرك المؤشر.'}>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-75" style={{ width: `${Math.round(mic.level * 100)}%` }} />
          </div>
        </Row>
        <Row ok={speakerOk} title="السماعة" text="اضغط «اختبر الصوت» ثم أكّد أنك سمعته.">
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                unlock()
                speak('مرحباً، الصوت يعمل بوضوح', { force: true })
                setPlayed(true)
              }}
            >
              <Icon name="volume" size={16} /> اختبر الصوت
            </Button>
            {played && !speakerOk ? (
              <Button size="sm" onClick={() => setSpeakerOk(true)}>
                سمعته ✓
              </Button>
            ) : null}
          </div>
        </Row>
        <Row ok={stt} fail={!stt} title="التعرف على الكلام" text={stt ? 'المتصفح يدعم تحويل الكلام إلى نص.' : 'استخدم Chrome أو Edge أو Safari لتحويل الكلام إلى نص.'} />
        <Button size="lg" className="mt-2" onClick={() => navigate(`/app/session/${booking.id}`, { replace: true })}>
          <Icon name="video" size={20} /> {ready ? 'كل شيء جاهز — ادخل الجلسة' : 'ادخل الجلسة'}
        </Button>
        {!ready ? <p className="text-center text-xs text-[var(--muted)]">يمكنك الدخول الآن حتى لو لم تكتمل كل الفحوص.</p> : null}
      </Card>
    </div>
  )
}
