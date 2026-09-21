import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useSceneSocket } from '../hooks/useSceneSocket'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, makeLocalRoomId, publishScenePhrase } from '../services/api'
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
  const [cameraFacing, setCameraFacing] = useState(() =>
    dedicated || settings.sendEnabled ? 'user' : settings.safetyEnabled ? 'environment' : 'user',
  )
  const [localLawyerPhrase, setLocalLawyerPhrase] = useState(null)
  const lastSpokenRef = useRef('')
  const lastRoleSpokenRef = useRef('')
  const lastRemoteSpokenRef = useRef('')
  const sceneMarkRef = useRef(null)

  // Ensure a room id exists for dedicated screens
  useEffect(() => {
    if (!dedicated) return
    if (settings.roomId) return
    update({ roomId: makeLocalRoomId() })
  }, [dedicated, settings.roomId, update])

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

  const sendOn = dedicated ? true : settings.sendEnabled
  const camera = useCamera({ facingMode: cameraFacing, enabled: true })
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
    chunkMs: 1200,
    stream: mic.stream,
  })
  const sttBrowser = useBrowserStt({
    enabled: useBrowser,
    language: settings.language === 'ar' ? 'ar-SA' : settings.language,
  })
  const stt = useWs ? sttWs : sttBrowser

  const arsl = useArsl({
    landmarksRef: hands.landmarksRef,
    enabled: Boolean(settings.arslEnabled) && sendOn && camera.status === 'ready',
    threshold: Math.max(0.45, settings.confidence),
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
    stableNeed: 10,
  })
  // Finger phrases win; ARSL only as high-confidence supplement when no finger accept
  const sendResult =
    finger.result?.accepted
      ? finger.result
      : settings.arslEnabled && arsl.result?.accepted && (arsl.result.confidence || 0) >= 0.45
        ? arsl.result
        : finger.result || (settings.arslEnabled ? arsl.result : null)

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

  const onRemotePhrase = useCallback(
    (phrase) => {
      if (!phrase?.text || !phrase?.role) return
      // Remote person → lawyer speaks; remote lawyer → person sees coach (no TTS on person)
      if (lockedRole === 'lawyer' && phrase.role === 'person') {
        const key = `${phrase.at || ''}:${phrase.text}`
        if (lastRemoteSpokenRef.current === key) return
        lastRemoteSpokenRef.current = key
        unlockTts()
        speak(phrase.text, { force: true })
      }
    },
    [lockedRole, speak, unlockTts],
  )

  const scene = useSceneSocket({
    enabled: Boolean(settings.roomId) && (dedicated || settings.receiveEnabled),
    room: settings.roomId || '',
    role: lockedRole || null,
    onRemotePhrase,
  })
  sceneMarkRef.current = scene.markLocalPublish

  const lastLawyerPhrase = scene.lawyerPhrase || localLawyerPhrase
  const remotePersonPhrase = scene.personPhrase
  const syncState = scene.syncState

  const lastObstacleSpokenRef = useRef(0)
  useEffect(() => {
    if (!obstacle.alert || obstacle.alert.kind !== 'obstacle') return
    if (Date.now() - lastObstacleSpokenRef.current < 4000) return
    lastObstacleSpokenRef.current = Date.now()
    unlockTts()
    speak('احذر، حاجز قريب', { force: true })
  }, [obstacle.alert, speak, unlockTts])

  useEffect(() => {
    const onFirst = () => unlockTts()
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('touchstart', onFirst, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('touchstart', onFirst)
    }
  }, [unlockTts])

  useEffect(() => {
    if (!sendOn || hands.trackingQuality === 'lost') {
      lastSpokenRef.current = ''
    }
  }, [sendOn, hands.trackingQuality])

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
    if (!dedicated && finger.roleHoldProgress > 0.15 && (r.fingers === 1 || r.fingers === 2)) {
      return
    }
    const key =
      r.fingers != null
        ? `${r.role || finger.role}:${r.fingers}:${r.display}`
        : r.display
    if (lastSpokenRef.current === key) return
    lastSpokenRef.current = key
    const spokenRole = r.role || finger.role
    const room = settings.roomId || undefined
    if (spokenRole === 'lawyer' || spokenRole === 'person') {
      if (spokenRole === 'lawyer') {
        setLocalLawyerPhrase({
          fingers: r.fingers ?? null,
          text: r.display,
          at: Date.now(),
        })
      }
      publishScenePhrase({
        role: spokenRole,
        text: r.display,
        fingers: r.fingers ?? null,
        room,
      })
        .then(() => sceneMarkRef.current?.())
        .catch(() => {})
    }
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
    settings.roomId,
  ])

  // بث كلام المحامي (STT) لغرفة الجلسة → أفتار الإشارة عند الشخص
  const lastPublishedSttRef = useRef('')
  useEffect(() => {
    const isLawyerTalking =
      lockedRole === 'lawyer' || (!dedicated && finger.role === 'lawyer' && settings.receiveEnabled)
    if (!isLawyerTalking) return undefined
    const raw = (stt.text || '').trim()
    if (!raw || raw.length < 2) return undefined
    // Take the latest sentence/chunk (caption accumulates)
    const parts = raw.split(/\s+/).filter(Boolean)
    const snippet = parts.slice(-12).join(' ')
    if (!snippet || snippet === lastPublishedSttRef.current) return undefined

    const t = window.setTimeout(() => {
      if (snippet === lastPublishedSttRef.current) return
      lastPublishedSttRef.current = snippet
      setLocalLawyerPhrase({
        fingers: null,
        text: snippet,
        at: Date.now(),
      })
      publishScenePhrase({
        role: 'lawyer',
        text: snippet,
        fingers: null,
        room: settings.roomId || undefined,
      })
        .then(() => sceneMarkRef.current?.())
        .catch(() => {})
    }, 800)
    return () => window.clearTimeout(t)
  }, [
    stt.text,
    lockedRole,
    dedicated,
    finger.role,
    settings.receiveEnabled,
    settings.roomId,
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
        <VideoFeed videoRef={camera.videoRef} mirrored={cameraFacing === 'user'} />
        <HandLandmarkCanvas canvasRef={hands.canvasRef} />
        {sendOn && <HandGuide visible={hands.trackingQuality === 'lost'} />}
      </PermissionGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="font-brand text-sm font-semibold text-white/90 drop-shadow">{title}</p>
        <p className="text-xs text-white/65">
          {dedicated
            ? `${ROLE_LABELS[lockedRole]}${settings.roomId ? ` · ${settings.roomId}` : ''}`
            : `STT: ${useWs ? 'Whisper' : useBrowser ? 'المتصفح' : 'إيقاف'}`}
        </p>
        {dedicated ? (
          <div className="mt-2">
            <SyncBadge state={syncState} />
          </div>
        ) : null}
      </div>

      {sendOn && <TrackingBadge quality={hands.trackingQuality} />}
      {sendOn && !dedicated ? (
        <RoleBadge
          role={finger.role}
          holdProgress={finger.roleHoldProgress}
          pulse={rolePulse}
          onToggle={() => {
            unlockTts()
            finger.toggleRole()
          }}
        />
      ) : null}
      {sendOn && dedicated ? (
        <RoleBadge role={lockedRole} holdProgress={0} pulse={false} onToggle={undefined} />
      ) : null}

      <CaptionBubble text={stt.text} partial={stt.partial} raised={sendOn} />
      {lockedRole === 'lawyer' && remotePersonPhrase?.text ? (
        <div
          className={`pointer-events-none absolute inset-x-4 z-30 flex justify-center ${
            sendOn ? 'bottom-56' : 'bottom-40'
          }`}
        >
          <div className="mx-auto max-w-xl rounded-2xl border border-[#C45C26]/45 bg-[rgba(21,32,51,0.9)] px-4 py-3 text-center shadow-lg">
            <p className="mb-1 text-xs font-semibold text-[#E8A078]">الشخص بالإشارة</p>
            <p className="text-lg font-bold text-white">
              {remotePersonPhrase.fingers
                ? `${remotePersonPhrase.fingers} أصابع · ${remotePersonPhrase.text}`
                : remotePersonPhrase.text}
            </p>
          </div>
        </div>
      ) : null}
      <SignCoachAvatar
        visible={
          lockedRole === 'person' ||
          (!dedicated && (finger.role === 'person' || Boolean(lastLawyerPhrase?.text)))
        }
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
          <div className="rounded-full bg-[var(--danger)] px-3 py-1.5 text-sm font-semibold text-white shadow-md">
            اقترب من حاجز…
          </div>
        </div>
      ) : null}

      <BottomBar
        dedicated={dedicated}
        receiveOn={settings.receiveEnabled}
        sendOn={sendOn}
        safetyOn={settings.safetyEnabled}
        onToggleReceive={() => update({ receiveEnabled: !settings.receiveEnabled })}
        onToggleSend={() => {
          if (dedicated) return
          const next = !settings.sendEnabled
          if (next) unlockTts()
          update({ sendEnabled: next })
          setCameraFacing(next ? 'user' : settings.safetyEnabled ? 'environment' : 'user')
        }}
        onToggleSafety={() => {
          const next = !settings.safetyEnabled
          update({ safetyEnabled: next })
        }}
        cameraFacing={cameraFacing}
        onFlipCamera={() =>
          setCameraFacing((f) => (f === 'user' ? 'environment' : 'user'))
        }
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
