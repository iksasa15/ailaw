import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCamera } from '../hooks/useCamera'
import { useHands } from '../hooks/useHands'
import { useSharedMic } from '../hooks/useSharedMic'
import { useSttSocket } from '../hooks/useSttSocket'
import { useBrowserStt } from '../hooks/useBrowserStt'
import { useArsl } from '../hooks/useArsl'
import { useFingerPhrases } from '../hooks/useFingerPhrases'
import { useTts } from '../hooks/useTts'
import { useAmbient } from '../hooks/useAmbient'
import { useObstacleProximity } from '../hooks/useObstacleProximity'
import { useSettings } from '../app/SettingsContext'
import { checkHealth } from '../services/api'
import { HandLandmarkCanvas, PermissionGate, VideoFeed } from '../components/camera/Camera'
import {
  AlertToast,
  CaptionBubble,
  HandGuide,
  RoleBadge,
  SignBadge,
  TrackingBadge,
} from '../components/overlay/Overlay'
import { ROLE_LABELS } from '../hooks/useFingerPhrases'
import { BottomBar } from '../components/controls/BottomBar'

export default function Home() {
  const { settings, update } = useSettings()
  const [backendWhisper, setBackendWhisper] = useState(false)
  const [pulseToken, setPulseToken] = useState(0)
  const [badgePulse, setBadgePulse] = useState(false)
  const [rolePulse, setRolePulse] = useState(false)
  const lastSpokenRef = useRef('')
  const lastRoleSpokenRef = useRef('')

  useEffect(() => {
    let cancelled = false
    checkHealth()
      .then((h) => {
        if (!cancelled) setBackendWhisper(Boolean(h.whisper))
      })
      .catch(() => {
        if (!cancelled) setBackendWhisper(false)
      })
    return () => {
      cancelled = true
    }
  }, [settings.apiBase])

  const needMic = settings.receiveEnabled || settings.safetyEnabled
  const mic = useSharedMic({ enabled: needMic })

  // أمان بدون إرسال → كاميرا خلفية؛ مع الإرسال تبقى الأمامية
  // ثبّت الاتجاه حتى لا يعيد تشغيل الكاميرا باستمرار على الجوال
  const facingMode = settings.sendEnabled ? 'user' : settings.safetyEnabled ? 'environment' : 'user'
  const camera = useCamera({ facingMode, enabled: true })
  const hands = useHands({
    videoRef: camera.videoRef,
    enabled: settings.sendEnabled && camera.status === 'ready',
    pulseToken,
  })

  const useWs = settings.receiveEnabled && backendWhisper
  const useBrowser = settings.receiveEnabled && !backendWhisper

  const sttWs = useSttSocket({
    enabled: useWs && mic.status === 'ready',
    language: settings.language,
    stream: mic.stream,
  })
  const sttBrowser = useBrowserStt({
    enabled: useBrowser,
    language: settings.language === 'ar' ? 'ar-SA' : settings.language,
  })
  const stt = useWs ? sttWs : sttBrowser

  const arsl = useArsl({
    landmarksRef: hands.landmarksRef,
    enabled: false, // demo path: numbered finger phrases (clearer for committee demo)
    threshold: settings.confidence,
    trackingQuality: hands.trackingQuality,
  })
  const finger = useFingerPhrases({
    landmarksRef: hands.landmarksRef,
    allHandsRef: hands.allHandsRef,
    enabled: settings.sendEnabled && camera.status === 'ready',
    trackingQuality: hands.trackingQuality,
  })
  const sendResult = finger.result || arsl.result
  const { speak, unlock: unlockTts } = useTts({ cooldownMs: 1600 })
  const ambient = useAmbient({
    enabled: settings.safetyEnabled && mic.status === 'ready',
    stream: mic.stream,
  })
  const obstacle = useObstacleProximity({
    videoRef: camera.videoRef,
    enabled: settings.safetyEnabled && camera.status === 'ready',
  })
  const safetyAlert = ambient.alert || obstacle.alert
  const clearSafetyAlert = () => {
    ambient.clearAlert()
    obstacle.clearAlert()
  }

  // نطق تحذير عند حاجز قريب
  const lastObstacleSpokenRef = useRef(0)
  useEffect(() => {
    if (!obstacle.alert || obstacle.alert.kind !== 'obstacle') return
    if (Date.now() - lastObstacleSpokenRef.current < 4000) return
    lastObstacleSpokenRef.current = Date.now()
    unlockTts()
    speak('احذر، حاجز قريب', { force: true })
  }, [obstacle.alert, speak, unlockTts])

  // Mobile browsers block TTS until a tap — unlock on first interaction
  useEffect(() => {
    const onFirst = () => unlockTts()
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('touchstart', onFirst, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('touchstart', onFirst)
    }
  }, [unlockTts])

  // Reset spoken memory when send turns off or hand is lost
  useEffect(() => {
    if (!settings.sendEnabled || hands.trackingQuality === 'lost') {
      lastSpokenRef.current = ''
    }
  }, [settings.sendEnabled, hands.trackingQuality])

  // تبديل الدور: 1×5ث محامي · 2×5ث شخص
  useEffect(() => {
    const change = finger.roleChanged
    if (!change?.role) return
    const announce = change.role === 'lawyer' ? 'وضع المحامي' : 'وضع الشخص'
    if (lastRoleSpokenRef.current === `${change.role}:${change.at}`) return
    lastRoleSpokenRef.current = `${change.role}:${change.at}`
    lastSpokenRef.current = ''
    unlockTts()
    speak(announce, { force: true })
    setRolePulse(true)
    const t = setTimeout(() => setRolePulse(false), 700)
    finger.clearRoleChanged?.()
    return () => clearTimeout(t)
  }, [finger.roleChanged, finger.clearRoleChanged, speak, unlockTts])

  useEffect(() => {
    const r = sendResult
    if (!settings.sendEnabled || !r?.accepted || !r.display) return
    // أثناء اكتمال تثبيت الدور لا نكرر نطق الجملة فوراً بعد إعلان الدور
    if (finger.roleHoldProgress > 0.92) return
    const key =
      r.fingers != null
        ? `${r.role || finger.role}:${r.fingers}:${r.display}`
        : r.display
    if (lastSpokenRef.current === key) return
    lastSpokenRef.current = key
    speak(r.display, { force: true })
    setPulseToken((n) => n + 1)
    setBadgePulse(true)
    const t = setTimeout(() => setBadgePulse(false), 500)
    return () => clearTimeout(t)
  }, [sendResult, speak, settings.sendEnabled, finger.role, finger.roleHoldProgress])

  const sttStatus =
    needMic && (mic.status === 'denied' || mic.status === 'error')
      ? 'error'
      : stt.status
  const sttError = mic.error || stt.error

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <PermissionGate status={camera.status} error={camera.error} onRetry={camera.start}>
        <VideoFeed videoRef={camera.videoRef} />
        <HandLandmarkCanvas canvasRef={hands.canvasRef} />
        {settings.sendEnabled && <HandGuide visible={hands.trackingQuality === 'lost'} />}
      </PermissionGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
        <div>
          <p className="text-lg font-bold text-white drop-shadow">النظارة الذكية</p>
          <p className="text-xs text-white/70">
            عدسة AR · STT: {useWs ? 'Whisper' : useBrowser ? 'المتصفح' : 'إيقاف'}
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <Link to="/guide" className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
            📖 تعليمات
          </Link>
          <Link to="/about" className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
            ℹ️ عن المشروع
          </Link>
        </div>
      </div>

      {settings.sendEnabled && <TrackingBadge quality={hands.trackingQuality} />}
      {settings.sendEnabled ? (
        <RoleBadge
          role={finger.role}
          holdProgress={finger.roleHoldProgress}
          pulse={rolePulse}
        />
      ) : null}

      <CaptionBubble text={stt.text} partial={stt.partial} />
      <SignBadge
        label={
          sendResult?.display
            ? sendResult.fingers
              ? `${ROLE_LABELS[sendResult.role || finger.role] || ''} · ${sendResult.fingers} · ${sendResult.display}`
              : sendResult.display
            : null
        }
        confidence={sendResult?.confidence}
        accepted={Boolean(sendResult?.accepted)}
        pulse={badgePulse}
        onReplay={() => {
          if (!sendResult?.display) return
          unlockTts()
          speak(sendResult.display, { force: true })
        }}
      />
      <AlertToast alert={safetyAlert} onDismiss={clearSafetyAlert} />
      {settings.safetyEnabled && obstacle.near && !safetyAlert ? (
        <div
          className={`pointer-events-none absolute inset-x-4 z-20 flex justify-center ${
            settings.sendEnabled ? 'top-[10.5rem]' : 'top-[7.25rem]'
          }`}
        >
          <div className="rounded-full bg-[#ff3b4e]/90 px-3 py-1.5 text-sm font-semibold text-white shadow-md">
            🚧 اقترب من حاجز…
          </div>
        </div>
      ) : null}

      <BottomBar
        receiveOn={settings.receiveEnabled}
        sendOn={settings.sendEnabled}
        safetyOn={settings.safetyEnabled}
        onToggleReceive={() => update({ receiveEnabled: !settings.receiveEnabled })}
        onToggleSend={() => {
          const next = !settings.sendEnabled
          if (next) unlockTts()
          update({ sendEnabled: next })
        }}
        onToggleSafety={() => update({ safetyEnabled: !settings.safetyEnabled })}
        sttStatus={sttStatus}
        sttError={sttError}
        onRetryStt={() => {
          mic.start()
          stt.start?.()
        }}
        onClear={stt.clearText}
      />
    </div>
  )
}
