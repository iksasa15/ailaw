import { useEffect, useMemo, useState } from 'react'
import { buildSigmlForPhrase } from '../../lib/sigmlLexicon'
import { initCwasaAvatar, playSigml, stopSigml } from '../../lib/cwasa'
import { LAWYER_PHRASES } from '../../hooks/useFingerPhrases'

const POSES = {
  open: {
    right: 'M76 82 Q92 78 98 58',
    hand: { cx: 100, cy: 52 },
    fingers: 'M93 44 L97 34 M100 42 L104 32 M107 44 L113 36',
    left: 'M44 82 Q30 90 26 108',
    leftHand: { cx: 24, cy: 112 },
  },
  pointUp: {
    right: 'M76 82 Q88 60 90 38',
    hand: { cx: 90, cy: 32 },
    fingers: 'M88 22 L90 12 M84 24 L82 14 M94 24 L98 16',
    left: 'M44 82 Q32 95 28 112',
    leftHand: { cx: 26, cy: 116 },
  },
  pointSide: {
    right: 'M76 82 Q100 78 118 72',
    hand: { cx: 122, cy: 70 },
    fingers: 'M128 66 L136 62 M126 72 L136 72 M126 78 L134 82',
    left: 'M44 82 Q34 98 30 114',
    leftHand: { cx: 28, cy: 118 },
  },
  chest: {
    right: 'M76 82 Q70 78 58 74',
    hand: { cx: 54, cy: 72 },
    fingers: 'M48 66 L44 60 M52 64 L50 56 M58 64 L60 56',
    left: 'M44 82 Q50 78 58 76',
    leftHand: { cx: 62, cy: 74 },
  },
  bothUp: {
    right: 'M76 82 Q92 55 96 34',
    hand: { cx: 98, cy: 28 },
    fingers: 'M94 18 L96 10 M90 20 L88 12 M102 18 L108 12',
    left: 'M44 82 Q28 55 24 34',
    leftHand: { cx: 22, cy: 28 },
  },
  bothOut: {
    right: 'M76 82 Q102 88 116 98',
    hand: { cx: 120, cy: 102 },
    fingers: 'M126 98 L134 96 M126 104 L136 108',
    left: 'M44 82 Q18 88 6 98',
    leftHand: { cx: 2, cy: 102 },
  },
  write: {
    right: 'M76 82 Q95 90 108 100',
    hand: { cx: 112, cy: 104 },
    fingers: 'M116 98 L122 92 M118 104 L128 104',
    left: 'M44 82 Q40 92 48 102',
    leftHand: { cx: 52, cy: 106 },
  },
  protect: {
    right: 'M76 82 Q88 70 94 52',
    hand: { cx: 96, cy: 46 },
    fingers: 'M90 38 L92 30 M96 36 L100 28 M102 40 L110 36',
    left: 'M44 82 Q32 70 26 52',
    leftHand: { cx: 24, cy: 46 },
  },
}

const PHRASE_STEPS = {
  1: [
    { label: 'أنا', pose: 'chest', motion: 'bob' },
    { label: 'محاميك', pose: 'open', motion: 'sway' },
    { label: 'تفضّل', pose: 'bothOut', motion: 'fan' },
  ],
  2: [
    { label: 'اسأل', pose: 'pointUp', motion: 'tap' },
    { label: 'تفاصيل', pose: 'pointSide', motion: 'sweep' },
    { label: 'القضية', pose: 'bothUp', motion: 'bob' },
  ],
  3: [
    { label: 'متى', pose: 'pointUp', motion: 'tap' },
    { label: 'حدث', pose: 'pointSide', motion: 'sweep' },
  ],
  4: [
    { label: 'شهود', pose: 'bothUp', motion: 'fan' },
    { label: 'معك؟', pose: 'pointSide', motion: 'tap' },
  ],
  5: [
    { label: 'أين', pose: 'pointUp', motion: 'tap' },
    { label: 'الدليل', pose: 'bothOut', motion: 'sweep' },
  ],
  6: [
    { label: 'أوراقك', pose: 'write', motion: 'scratch' },
    { label: 'أراجع', pose: 'open', motion: 'sway' },
  ],
  7: [
    { label: 'لا تخف', pose: 'protect', motion: 'fan' },
    { label: 'أدافع', pose: 'chest', motion: 'bob' },
  ],
  8: [
    { label: 'مستندات', pose: 'write', motion: 'scratch' },
    { label: 'إضافية', pose: 'bothOut', motion: 'fan' },
  ],
  9: [
    { label: 'وقّع', pose: 'write', motion: 'scratch' },
    { label: 'من فضلك', pose: 'bothOut', motion: 'fan' },
  ],
  10: [
    { label: 'متابعة', pose: 'pointSide', motion: 'sweep' },
    { label: 'القضية', pose: 'chest', motion: 'bob' },
  ],
}

const CYCLE = ['open', 'pointUp', 'chest', 'pointSide', 'bothOut', 'bothUp', 'write', 'protect']
const MOTIONS = ['bob', 'sway', 'tap', 'sweep', 'fan', 'scratch']

function normalize(text) {
  return String(text || '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stepsFromPhrase(lawyerPhrase) {
  if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null
  const fingers = Number(lawyerPhrase.fingers)
  if (fingers >= 1 && fingers <= 10 && PHRASE_STEPS[fingers]) return PHRASE_STEPS[fingers]

  const raw = normalize(lawyerPhrase?.text)
  for (let i = 1; i <= 10; i += 1) {
    if (normalize(LAWYER_PHRASES[i]) === raw && PHRASE_STEPS[i]) return PHRASE_STEPS[i]
  }
  const words = raw.split(' ').filter(Boolean).slice(0, 6)
  if (!words.length) return null
  const base = words.length >= 3 ? words : [...words, ...words, ...words].slice(0, 3)
  return base.map((label, i) => ({
    label,
    pose: CYCLE[i % CYCLE.length],
    motion: MOTIONS[i % MOTIONS.length],
  }))
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod|Android/i.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua))
}

function SignerFigure({ pose = 'open', motion = 'bob', active = false, stepKey = 0 }) {
  const shape = POSES[pose] || POSES.open
  const motionClass = active ? `signer-motion-${motion}` : 'signer-motion-idle'

  return (
    <div
      className={`relative flex h-[8rem] w-[6.75rem] shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-[#152033] ring-2 ${
        active ? 'ring-[#3ecf8e]/70' : 'ring-white/15'
      }`}
      aria-hidden
    >
      <svg
        key={`${stepKey}-${pose}`}
        viewBox="0 0 130 150"
        className={`h-full w-full ${motionClass}`}
      >
        <ellipse cx="60" cy="122" rx="30" ry="20" fill="#1e3a5f" />
        <rect x="40" y="74" width="40" height="50" rx="16" fill="#244a73" />
        <circle cx="60" cy="42" r="22" fill="#f0c9a0" />
        <circle cx="52" cy="40" r="2.2" fill="#2a1a10" />
        <circle cx="68" cy="40" r="2.2" fill="#2a1a10" />
        <path d="M52 50 Q60 56 68 50" stroke="#2a1a10" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d={shape.left} stroke="#f0c9a0" strokeWidth="9" fill="none" strokeLinecap="round" />
        <circle cx={shape.leftHand.cx} cy={shape.leftHand.cy} r="8" fill="#f0c9a0" />
        <path d={shape.right} stroke="#f0c9a0" strokeWidth="9" fill="none" strokeLinecap="round" />
        <circle cx={shape.hand.cx} cy={shape.hand.cy} r="9" fill="#f0c9a0" />
        <path d={shape.fingers} stroke="#f0c9a0" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </svg>
      {active ? (
        <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/55 px-1 text-center text-[10px] font-bold text-[#3ecf8e]">
          يوقّع…
        </span>
      ) : null}
    </div>
  )
}

/**
 * أفتار ترجمة المحامي:
 * - على الجوال: أفتار خفيف متعدد الأوضاع (آمن لـ Safari)
 * - على الكمبيوتر: يمكن تفعيل CWASA ثلاثي الأبعاد يدوياً
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [want3d, setWant3d] = useState(false)
  const [cwasaStatus, setCwasaStatus] = useState('idle')
  const mobile = useMemo(() => isMobileDevice(), [])

  const steps = useMemo(() => stepsFromPhrase(lawyerPhrase), [lawyerPhrase])
  const hasLawyer = Boolean(steps?.length)
  const current = hasLawyer ? steps[stepIdx] || steps[0] : null

  useEffect(() => {
    if (!visible || !steps?.length) return undefined
    setStepIdx(0)
    const id = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [visible, steps, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  // CWASA فقط بطلب صريح وعلى غير الجوال — تجنّب انهيار Safari
  useEffect(() => {
    if (!visible || !want3d || mobile) return undefined
    let cancelled = false
    const host = document.getElementById('cwasa-host')
    if (!host) return undefined
    host.innerHTML = `
      <div class="CWASAAvatar av0" style="width:100%;height:100%"></div>
      <div class="SToCA" style="display:none"></div>
    `
    setCwasaStatus('loading')
    initCwasaAvatar()
      .then(() => {
        if (cancelled) return
        setCwasaStatus('ready')
        const sigml = buildSigmlForPhrase({
          text: lawyerPhrase?.text,
          fingers: lawyerPhrase?.fingers,
        })
        if (sigml) playSigml(sigml)
      })
      .catch(() => {
        if (!cancelled) {
          setCwasaStatus('error')
          setWant3d(false)
        }
      })
    return () => {
      cancelled = true
      stopSigml()
    }
  }, [visible, want3d, mobile, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[7.5rem] z-[25] flex justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1220]/94 px-3 py-3 ring-1 ring-[#3ecf8e]/35 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[#3ecf8e]">أفتار الإشارة · ترجمة المحامي</p>
          {hasLawyer ? (
            <p className="text-[11px] text-white/55">
              خطوة {stepIdx + 1}/{steps.length}
            </p>
          ) : (
            <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
          )}
        </div>

        {want3d && !mobile ? (
          <div
            id="cwasa-host"
            className="mb-2 h-[240px] w-full overflow-hidden rounded-xl bg-[#152033]"
          />
        ) : null}

        <div className="flex items-center gap-3">
          {!(want3d && cwasaStatus === 'ready') ? (
            <SignerFigure
              pose={current?.pose || 'open'}
              motion={current?.motion || 'bob'}
              active={hasLawyer}
              stepKey={stepIdx}
            />
          ) : null}
          <div className="min-w-0 flex-1 text-right">
            {hasLawyer ? (
              <>
                <p className="text-base font-bold leading-6 text-white">{lawyerPhrase.text}</p>
                {current ? (
                  <p className="mt-1.5 text-sm font-semibold text-[#3ecf8e]">
                    إشارة: {current.label}
                  </p>
                ) : null}
                {steps.length > 1 ? (
                  <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                    {steps.map((s, i) => (
                      <span
                        key={`${s.label}-${i}`}
                        className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          i === stepIdx
                            ? 'bg-[#3ecf8e]/25 text-white ring-1 ring-[#3ecf8e]'
                            : 'bg-white/5 text-white/50'
                        }`}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm leading-6 text-white/75">
                عندما يتكلم <strong className="text-white">المحامي</strong> يترجم الأفتار كلامه
                بإشارات متتابعة.
              </p>
            )}
          </div>
        </div>

        {!mobile ? (
          <div className="pointer-events-auto mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/80"
              onClick={() => setWant3d((v) => !v)}
            >
              {want3d ? 'إغلاق الأفتار 3D' : 'تجربة أفتار 3D (كمبيوتر)'}
            </button>
          </div>
        ) : null}
        {cwasaStatus === 'error' ? (
          <p className="mt-1 text-[11px] text-amber-200/80">تعذر تحميل الأفتار ثلاثي الأبعاد.</p>
        ) : null}
      </div>
    </div>
  )
}
