import { useEffect, useMemo, useState } from 'react'
import { LAWYER_PHRASES } from '../../hooks/useFingerPhrases'

/** أوضاع يد مختلفة بصرياً لكل خطوة إشارة */
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
  think: {
    right: 'M76 82 Q85 55 78 36',
    hand: { cx: 76, cy: 30 },
    fingers: 'M72 22 L70 14 M78 20 L80 12',
    left: 'M44 82 Q36 95 30 112',
    leftHand: { cx: 28, cy: 116 },
  },
  greet: {
    right: 'M76 82 Q95 50 105 28',
    hand: { cx: 108, cy: 24 },
    fingers: 'M104 14 L106 6 M100 16 L98 8 M112 16 L118 10',
    left: 'M44 82 Q32 92 28 110',
    leftHand: { cx: 26, cy: 114 },
  },
}

const WORD_SIGNS = {
  أنا: { label: 'أنا', pose: 'chest', motion: 'bob' },
  محامي: { label: 'محامي', pose: 'think', motion: 'sway' },
  محاميك: { label: 'محاميك', pose: 'think', motion: 'sway' },
  تفضل: { label: 'تفضّل', pose: 'bothOut', motion: 'fan' },
  تفضّل: { label: 'تفضّل', pose: 'bothOut', motion: 'fan' },
  اسأل: { label: 'اسأل', pose: 'pointUp', motion: 'tap' },
  ما: { label: 'ما؟', pose: 'open', motion: 'bob' },
  تفاصيل: { label: 'تفاصيل', pose: 'pointSide', motion: 'sweep' },
  قضية: { label: 'قضية', pose: 'chest', motion: 'bob' },
  القضية: { label: 'قضية', pose: 'chest', motion: 'bob' },
  متى: { label: 'متى', pose: 'pointUp', motion: 'tap' },
  حدث: { label: 'حدث', pose: 'pointSide', motion: 'sweep' },
  ذلك: { label: 'ذلك', pose: 'pointSide', motion: 'tap' },
  هل: { label: 'هل', pose: 'open', motion: 'bob' },
  لديك: { label: 'لديك', pose: 'bothOut', motion: 'fan' },
  شهود: { label: 'شهود', pose: 'bothUp', motion: 'fan' },
  أين: { label: 'أين', pose: 'pointUp', motion: 'tap' },
  الدليل: { label: 'دليل', pose: 'bothOut', motion: 'sweep' },
  دليل: { label: 'دليل', pose: 'bothOut', motion: 'sweep' },
  سأراجع: { label: 'أراجع', pose: 'think', motion: 'sway' },
  أوراقك: { label: 'أوراق', pose: 'write', motion: 'scratch' },
  أوراق: { label: 'أوراق', pose: 'write', motion: 'scratch' },
  مستندات: { label: 'مستندات', pose: 'write', motion: 'scratch' },
  لا: { label: 'لا', pose: 'pointSide', motion: 'sweep' },
  تخف: { label: 'لا تخف', pose: 'protect', motion: 'fan' },
  سأدافع: { label: 'أدافع', pose: 'protect', motion: 'bob' },
  عنك: { label: 'عنك', pose: 'chest', motion: 'bob' },
  نحتاج: { label: 'نحتاج', pose: 'bothOut', motion: 'fan' },
  إضافية: { label: 'إضافية', pose: 'open', motion: 'bob' },
  وقع: { label: 'وقّع', pose: 'write', motion: 'scratch' },
  وقّع: { label: 'وقّع', pose: 'write', motion: 'scratch' },
  التوكيل: { label: 'توكيل', pose: 'write', motion: 'scratch' },
  فضلك: { label: 'من فضلك', pose: 'bothOut', motion: 'fan' },
  تحت: { label: 'تحت', pose: 'pointSide', motion: 'tap' },
  المتابعة: { label: 'متابعة', pose: 'pointSide', motion: 'sweep' },
  متابعة: { label: 'متابعة', pose: 'pointSide', motion: 'sweep' },
  مرحبا: { label: 'مرحبا', pose: 'greet', motion: 'fan' },
  مرحباً: { label: 'مرحبا', pose: 'greet', motion: 'fan' },
  السلام: { label: 'سلام', pose: 'greet', motion: 'fan' },
  عليكم: { label: 'عليكم', pose: 'bothOut', motion: 'fan' },
  شكرا: { label: 'شكراً', pose: 'chest', motion: 'bob' },
  شكراً: { label: 'شكراً', pose: 'chest', motion: 'bob' },
  مساعدة: { label: 'مساعدة', pose: 'protect', motion: 'fan' },
  ساعدني: { label: 'ساعدني', pose: 'protect', motion: 'bob' },
  نعم: { label: 'نعم', pose: 'pointUp', motion: 'tap' },
  أهلا: { label: 'أهلاً', pose: 'greet', motion: 'fan' },
  أهلاً: { label: 'أهلاً', pose: 'greet', motion: 'fan' },
}

const PHRASE_PACKS = {
  1: [WORD_SIGNS['أنا'], WORD_SIGNS['محاميك'], WORD_SIGNS['تفضّل']],
  2: [WORD_SIGNS['اسأل'], WORD_SIGNS['تفاصيل'], WORD_SIGNS['قضية']],
  3: [WORD_SIGNS['متى'], WORD_SIGNS['حدث']],
  4: [WORD_SIGNS['هل'], WORD_SIGNS['شهود'], WORD_SIGNS['لديك']],
  5: [WORD_SIGNS['أين'], WORD_SIGNS['دليل']],
  6: [WORD_SIGNS['سأراجع'], WORD_SIGNS['أوراقك']],
  7: [WORD_SIGNS['تخف'], WORD_SIGNS['سأدافع'], WORD_SIGNS['عنك']],
  8: [WORD_SIGNS['نحتاج'], WORD_SIGNS['مستندات'], WORD_SIGNS['إضافية']],
  9: [WORD_SIGNS['وقّع'], WORD_SIGNS['التوكيل'], WORD_SIGNS['فضلك']],
  10: [WORD_SIGNS['قضية'], WORD_SIGNS['متابعة']],
}

const FALLBACK_POSES = ['open', 'pointUp', 'chest', 'pointSide', 'bothOut', 'bothUp', 'write', 'protect', 'greet', 'think']
const FALLBACK_MOTIONS = ['bob', 'sway', 'tap', 'sweep', 'fan', 'scratch']

function normalize(text) {
  return String(text || '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** حوّل نص الكلام إلى تسلسل إشارات */
export function speechToSignSteps(lawyerPhrase) {
  if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null

  const fingers = Number(lawyerPhrase.fingers)
  if (fingers >= 1 && fingers <= 10 && PHRASE_PACKS[fingers]) {
    return PHRASE_PACKS[fingers].filter(Boolean)
  }

  const raw = normalize(lawyerPhrase.text)
  if (!raw) return null

  for (let i = 1; i <= 10; i += 1) {
    if (normalize(LAWYER_PHRASES[i]) === raw && PHRASE_PACKS[i]) {
      return PHRASE_PACKS[i].filter(Boolean)
    }
  }

  const words = raw.split(' ').filter(Boolean).slice(0, 8)
  const steps = []
  words.forEach((w, i) => {
    if (WORD_SIGNS[w]) {
      steps.push(WORD_SIGNS[w])
    } else {
      steps.push({
        label: w,
        pose: FALLBACK_POSES[i % FALLBACK_POSES.length],
        motion: FALLBACK_MOTIONS[i % FALLBACK_MOTIONS.length],
      })
    }
  })
  return steps.length ? steps : null
}

function SignerFigure({ pose = 'open', motion = 'bob', active = false, stepKey = 0 }) {
  const shape = POSES[pose] || POSES.open
  const motionClass = active ? `signer-motion-${motion}` : 'signer-motion-idle'

  return (
    <div
      className={`relative flex h-[8.5rem] w-[7rem] shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-[#152033] ring-2 ${
        active ? 'ring-[#3ecf8e]/70' : 'ring-white/15'
      }`}
      aria-hidden
    >
      <svg key={`${stepKey}-${pose}`} viewBox="0 0 130 150" className={`h-full w-full ${motionClass}`}>
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
 * يحوّل كلام المحامي (STT أو أصابع) إلى تسلسل لغة إشارة على شاشة الشخص.
 * خفيف وآمن للجوال — بدون CWASA.
 */
export function SignCoachAvatar({ visible = false, lawyerPhrase = null }) {
  const [stepIdx, setStepIdx] = useState(0)

  const steps = useMemo(() => speechToSignSteps(lawyerPhrase), [lawyerPhrase])
  const hasLawyer = Boolean(steps?.length)
  const current = hasLawyer ? steps[stepIdx] || steps[0] : null

  useEffect(() => {
    if (!visible || !steps?.length) return undefined
    setStepIdx(0)
    const id = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length)
    }, 850)
    return () => window.clearInterval(id)
  }, [visible, steps, lawyerPhrase?.text, lawyerPhrase?.fingers, lawyerPhrase?.at])

  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[7.5rem] z-[25] flex justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1220]/95 px-3 py-3 ring-1 ring-[#3ecf8e]/40 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[#3ecf8e]">ترجمة → لغة إشارة</p>
          {hasLawyer ? (
            <p className="text-[11px] text-white/55">
              {stepIdx + 1}/{steps.length}
              {lawyerPhrase?.fingers ? ` · أصابع` : ' · من الكلام'}
            </p>
          ) : (
            <p className="text-[11px] text-white/45">بانتظار كلام المحامي</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SignerFigure
            pose={current?.pose || 'open'}
            motion={current?.motion || 'bob'}
            active={hasLawyer}
            stepKey={stepIdx}
          />
          <div className="min-w-0 flex-1 text-right">
            {hasLawyer ? (
              <>
                <p className="text-[11px] font-semibold text-white/50">المحامي قال</p>
                <p className="mt-0.5 text-base font-bold leading-6 text-white">{lawyerPhrase.text}</p>
                <p className="mt-2 text-sm font-semibold text-[#3ecf8e]">
                  إشارة الآن: {current?.label}
                </p>
                <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                  {steps.map((s, i) => (
                    <span
                      key={`${s.label}-${i}`}
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                        i === stepIdx
                          ? 'bg-[#3ecf8e]/25 text-white ring-1 ring-[#3ecf8e]'
                          : 'bg-white/5 text-white/45'
                      }`}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-white/75">
                تكلّم في جوال <strong className="text-white">المحامي</strong> — هنا يتحول كلامك
                إلى إشارات متتابعة للشخص.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
