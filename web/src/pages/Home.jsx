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
import { checkHealth, fetchLawyerScene, publishScenePhrase } from '../services/api'
import { HandLandmarkCanvas, PermissionGate, VideoFeed } from '../components/camera/Camera'
import {
  AlertToast,
  CaptionBubble,
  HandGuide,
  RoleBadge,
  SignBadge,
  TrackingBadge,
} from '../components/overlay/Overlay'
import { SyncBadge } from '../components/overlay/SyncBadge'
import { SignCoachAvatar } from '../components/overlay/SignCoachAvatar'
import { ROLE_LABELS } from '../hooks/useFingerPhrases'
import { BottomBar } from '../components/controls/BottomBar'

export default function Home({ lockedRole = null }) {
  const dedicated = lockedRole === 'lawyer' || lockedRole === 'person'
  const { settings, update } = useSettings()
  const [backendWhisper, setBackendWhisper] = useState(false)
  const [pulseToken, setPulseToken] = useState(0)
  const [badgePulse, setBadgePulse] = useState(false)
  const [rolePulse, setRolePulse] = useState(false)
  const [lastLawyerPhrase, setLastLawyerPhrase] = useState(null)
  const lastSpokenRef = useRef('')
  const lastRoleSpokenRef = useRef('')

  // شاشة مستقلة: تفعيل الإرسال تلقائياً
  useEffect(() => {
    if (dedicated && !settings.sendEnabled) {
      update({ sendEnabled: true })
    }
  }, [dedicated, settings.sendEnabled, update])

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

  // شاشات مستقلة دائماً كاميرا أمامية للإشارات
  const facingMode = dedicated
    ? 'user'
    : settings.sendEnabled
      ? 'user'
      : settings.safetyEnabled
        ? 'environment'
        : 'user'
  const sendOn = dedicated ? true : settings.sendEnabled
  const camera = useCamera({ facingMode, enabled: true })
  const hands = useHands({
    videoRef: camera.videoRef,
    enabled: sendOn && camera.status === 'ready',
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
    enabled: false,
    threshold: settings.confidence,
    trackingQuality: hands.trackingQuality,
  })
  const finger = useFingerPhrases({
    landmarksRef: hands.landmarksRef,
    allHandsRef: hands.allHandsRef,
    enabled: sendOn && camera.status === 'ready',
    trackingQuality: hands.trackingQuality,
    lawyerPhrases: settings.lawyerPhrases,
    personPhrases: settings.personPhrases,
    lockedRole: dedicated ? lockedRole : null,
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

  // شاشة الشخص: استقبل كلام المحامي من السيرفر للأفتار
  useEffect(() => {
    if (lockedRole !== 'person') return undefined
    let cancelled = false
    const tick = async () => {
      try {
        const data = await fetchLawyerScene()
        if (cancelled || !data?.text) return
        setLastLawyerPhrase((prev) => {
          if (prev?.at === data.at && prev?.text === data.text) return prev
          return {
            fingers: data.fingers ?? null,
            text: data.text,
            at: data.at || Date.now(),
          }
        })
      } catch {
        /* backend offline — الشاشة تبقى تعمل محلياً */
      }
    }
    tick()
    const id = window.setInterval(tick, 1200)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [lockedRole, settings.apiBase])

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
    if (!sendOn || hands.trackingQuality === 'lost') {
      lastSpokenRef.current = ''
    }
  }, [sendOn, hands.trackingQuality])

  // تبديل الدور: معطّل على الشاشات المستقلة
  useEffect(() => {
    if (dedicated) return undefined
    const change = finger.roleChanged
    if (!change?.role) return undefined
    const announce = change.role === 'lawyer' ? 'وضع المحامي' : 'وضع الشخص'
    if (lastRoleSpokenRef.current === `${change.role}:${change.at}`) return undefined
    lastRoleSpokenRef.current = `${change.role}:${change.at}`
    lastSpokenRef.current = ''
    unlockTts()
    speak(announce, { force: true })
    setRolePulse(true)
    const t = setTimeout(() => setRolePulse(false), 700)
    finger.clearRoleChanged?.()
    return () => clearTimeout(t)
  }, [dedicated, finger.roleChanged, finger.clearRoleChanged, speak, unlockTts])

  useEffect(() => {
    const r = sendResult
    if (!sendOn || !r?.accepted || !r.display) return
    if (!dedicated && finger.roleHoldProgress > 0.92) return
    const key =
      r.fingers != null
        ? `${r.role || finger.role}:${r.fingers}:${r.display}`
        : r.display
    if (lastSpokenRef.current === key) return
    lastSpokenRef.current = key
    const spokenRole = r.role || finger.role
    if (spokenRole === 'lawyer') {
      const payload = {
        fingers: r.fingers ?? null,
        text: r.display,
        at: Date.now(),
      }
      setLastLawyerPhrase(payload)
      publishScenePhrase({
        role: 'lawyer',
        text: r.display,
        fingers: r.fingers ?? null,
      }).catch(() => {})
    } else if (spokenRole === 'person') {
      publishScenePhrase({
        role: 'person',
        text: r.display,
        fingers: r.fingers ?? null,
      }).catch(() => {})
    }
    // على شاشة الشخص: لا ننطق صوت المحامي هنا؛ الأفتار يعرض الإشارة
    // على شاشة المحامي أو المشتركة: ننطق العبارة
    if (lockedRole !== 'person') {
      speak(r.display, { force: true })
    }
    setPulseToken((n) => n + 1)
    setBadgePulse(true)
    const t = setTimeout(() => setBadgePulse(false), 500)
    return () => clearTimeout(t)
  }, [
    sendResult,
    speak,
    sendOn,
    finger.role,
    finger.roleHoldProgress,
    dedicated,
    lockedRole,
  ])

  const sttStatus =
    needMic && (mic.status === 'denied' || mic.status === 'error')
      ? 'error'
      : stt.status
  const sttError = mic.error || stt.error

  const title =
    lockedRole === 'lawyer'
      ? 'شاشة المحامي'
      : lockedRole === 'person'
        ? 'شاشة الشخص'
        : 'النظارة الذكية'

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <PermissionGate status={camera.status} error={camera.error} onRetry={camera.start}>
        <VideoFeed videoRef={camera.videoRef} />
        <HandLandmarkCanvas canvasRef={hands.canvasRef} />
        {sendOn && <HandGuide visible={hands.trackingQuality === 'lost'} />}
      </PermissionGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
        <div>
          <p className="text-lg font-bold text-white drop-shadow">{title}</p>
          <p className="text-xs text-white/70">
            {dedicated
              ? `كاميرا هذا الجهاز · ${ROLE_LABELS[lockedRole]}`
              : `عدسة AR · STT: ${useWs ? 'Whisper' : useBrowser ? 'المتصفح' : 'إيقاف'}`}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
          <Link to="/screens" className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
            📱 شاشتين
          </Link>
          <Link to="/guide" className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
            📖 تعليمات
          </Link>
          <Link to="/about" className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
            ℹ️ عن المشروع
          </Link>
        </div>
      </div>

      {sendOn && <TrackingBadge quality={hands.trackingQuality} />}
      {sendOn ? (
        <RoleBadge
          role={finger.role}
          holdProgress={dedicated ? 0 : finger.roleHoldProgress}
          pulse={rolePulse}
          onToggle={
            dedicated
              ? undefined
              : () => {
                  unlockTts()
                  finger.toggleRole()
                }
          }
        />
      ) : null}

      <CaptionBubble text={stt.text} partial={stt.partial} raised={sendOn} />
      <SignCoachAvatar
        visible={sendOn && (lockedRole === 'person' || !dedicated)}
        lawyerPhrase={lastLawyerPhrase}
      />
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
            sendOn ? 'top-[10.5rem]' : 'top-[7.25rem]'
          }`}
        >
          <div className="rounded-full bg-[#ff3b4e]/90 px-3 py-1.5 text-sm font-semibold text-white shadow-md">
            🚧 اقترب من حاجز…
          </div>
        </div>
      ) : null}

      <BottomBar
        receiveOn={settings.receiveEnabled}
        sendOn={sendOn}
        safetyOn={settings.safetyEnabled}
        onToggleReceive={() => update({ receiveEnabled: !settings.receiveEnabled })}
        onToggleSend={() => {
          if (dedicated) return
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
