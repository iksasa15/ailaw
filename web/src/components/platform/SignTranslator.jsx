import { useEffect, useReducer, useRef, useState } from 'react'
import { advance, currentStep, enqueue, initialQueue, pending, replay, skipToLatest } from '../../platform/signQueue'
import { STEP_MS } from '../../platform/signTranslate'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** الطابور + عدّاد يُزاد عند «إعادة» حتى تعيد الخطوة الأولى نفسها عرضها */
const initialState = { queue: initialQueue, replays: 0 }

function reducer(state, action) {
  switch (action.type) {
    case 'enqueue': {
      const queue = enqueue(state.queue, action.sentence)
      return queue === state.queue ? state : { ...state, queue }
    }
    case 'advance': {
      const queue = advance(state.queue)
      return queue === state.queue ? state : { ...state, queue }
    }
    case 'skip':
      return { ...state, queue: skipToLatest(state.queue) }
    case 'replay':
      return { queue: replay(state.queue), replays: state.replays + 1 }
    default:
      return state
  }
}

/** سطر حالة الاستماع على هذا الجهاز */
function StatusLine({ status, compact }) {
  const { state, partial, error, retry } = status
  const text =
    state === 'listening'
      ? 'يستمع للمحامي'
      : state === 'off'
        ? 'الاستماع متوقف'
        : state === 'error'
          ? error || 'تعذّر الوصول للمايك'
          : 'هذا المتصفح لا يدعم الاستماع — استعمل Chrome أو Safari، أو اكتب بوضع المحامي'
  const showRetry = (state === 'off' || state === 'error') && typeof retry === 'function'
  const listening = state === 'listening'
  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-xl bg-white/6 px-3 ${compact ? 'min-h-9 py-1.5 text-xs' : 'min-h-11 py-2 text-sm'}`}
      role="status"
    >
      <span
        className={`size-2.5 shrink-0 rounded-full ${listening ? 'animate-pulse bg-emerald-400' : state === 'unsupported' ? 'bg-white/30' : 'bg-red-400'}`}
        aria-hidden="true"
      />
      <span className={`shrink-0 font-bold ${listening ? 'text-emerald-300' : 'text-white/80'} ${listening ? '' : 'min-w-0 flex-1'}`}>
        {text}
      </span>
      {listening ? (
        <span className="min-w-0 flex-1 truncate text-white/60" dir="auto">
          {partial}
        </span>
      ) : null}
      {showRetry ? (
        <button
          type="button"
          onClick={retry}
          className="shrink-0 rounded-lg bg-[#136fb0] px-3 py-1 text-xs font-bold text-white hover:bg-[#0f5f97]"
        >
          تشغيل
        </button>
      ) : null}
    </div>
  )
}

/** المسرح: فيديو الإشارة، أو صورة الحرف على أبيض، أو بطاقة الكلمة */
function Stage({ sign, stepKey, failed, compact, onEnded, onFailed }) {
  if (!sign) return null
  if (sign.kind === 'video' && !failed) {
    return (
      <video
        key={stepKey}
        src={sign.src}
        autoPlay
        muted
        playsInline
        onEnded={onEnded}
        onError={onFailed}
        aria-label={sign.label}
        className="h-full w-full object-contain"
      />
    )
  }
  if (sign.kind === 'letter') {
    return <img key={stepKey} src={sign.src} alt={sign.label} className="h-full w-full object-contain p-2" draggable="false" />
  }
  // بطاقة مكتوبة: كلمة بلا إشارة، أو فيديو لم يُحمَّل
  return (
    <div
      key={stepKey}
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#136fb0] to-[#0b3f6b] px-4 text-center"
    >
      <span className={`font-black leading-tight text-white break-words ${compact ? 'text-4xl' : 'text-6xl'}`}>{sign.label}</span>
    </div>
  )
}

/**
 * مترجم الإشارة: يعرض جمل المحامي بالترتيب خطوةً خطوة (فيديو / تهجئة / بطاقة مكتوبة)
 * والجملة تحتها بالكلمة الحالية مميّزة. كل جملة تُترجم مرة واحدة ولا تقطع الحالية.
 */
export function SignTranslator({ sentences = [], status = null, compact = false }) {
  const [{ queue, replays }, dispatch] = useReducer(reducer, initialState)
  const [failedKey, setFailedKey] = useState('')
  const endedRef = useRef(null)
  const seenRef = useRef(null)
  const activeWordRef = useRef(null)

  // كل جملة جديدة (بمعرّفها) تدخل الطابور مرة واحدة؛ ما كان موجوداً عند التركيب لا يُعاد عرضه
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(sentences.map((s) => s.id))
      return
    }
    for (const sentence of sentences) {
      if (seenRef.current.has(sentence.id)) continue
      seenRef.current.add(sentence.id)
      dispatch({ type: 'enqueue', sentence })
    }
  }, [sentences])

  const { current, step, done } = queue
  const view = currentStep(queue) // كائن جديد كل مرة: لا يدخل في اعتماديات المؤقت
  const sign = view?.sign ?? null
  const kind = sign?.kind ?? null
  const stepCount = view?.item.steps.length ?? 0
  const isLast = step === stepCount - 1
  const stepKey = `${current}:${step}:${replays}`
  const failed = kind === 'video' && failedKey === stepKey

  // مؤقت الخطوة: حرف وبطاقة بمدة ثابتة، والفيديو حتى انتهائه أو سقفه؛ آخر خطوة تزيد فاصل الجمل
  useEffect(() => {
    if (current === -1 || done || !kind) return undefined
    const tail = isLast ? STEP_MS.gap : 0
    let timer = null
    const later = (fn, ms) => {
      timer = setTimeout(fn, ms)
    }
    const next = () => dispatch({ type: 'advance' })
    if (kind === 'letter') {
      later(next, STEP_MS.letter + tail)
    } else if (kind === 'word' || failed) {
      later(next, STEP_MS.word + tail)
    } else {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        later(next, tail)
      }
      endedRef.current = finish
      later(finish, STEP_MS.videoMax)
    }
    return () => {
      clearTimeout(timer)
      endedRef.current = null
    }
  }, [current, step, done, replays, kind, isLast, failed])

  // الكلمة الحالية تبقى ظاهرة إن طالت الجملة
  useEffect(() => {
    activeWordRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [current, step, replays])

  const waiting = pending(queue)
  const tokens = view?.item.tokens ?? []
  const activeFrom = !done && sign && sign.token != null ? sign.token : -1
  const activeTo = activeFrom === -1 ? -1 : activeFrom + Math.max(1, sign.span) - 1

  const isCard = kind === 'word' || failed
  const replayButton = (
    <Button variant="dark" size={compact ? 'sm' : 'md'} onClick={() => dispatch({ type: 'replay' })}>
      <Icon name="play" size={compact ? 14 : 16} /> إعادة
    </Button>
  )
  const latestButton =
    waiting > 0 ? (
      <Button size={compact ? 'sm' : 'md'} className={compact ? '' : 'flex-1'} onClick={() => dispatch({ type: 'skip' })}>
        الأحدث
        <span className="rounded-full bg-[#f9bd29] px-2 py-0.5 text-xs font-black text-[#0b1630] tabular-nums">+{waiting} بانتظار</span>
        <Icon name="chevron" size={compact ? 14 : 16} />
      </Button>
    ) : null
  const progress = view ? (
    <div
      className={`flex items-center gap-1 ${compact ? 'min-w-10 flex-1' : 'shrink-0'}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={stepCount}
      aria-valuenow={done ? stepCount : step + 1}
      aria-label="تقدّم الجملة"
    >
      {view.item.steps.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
            done || i < step ? 'bg-[#f9bd29]' : i === step ? 'bg-white' : 'bg-white/20'
          }`}
        />
      ))}
    </div>
  ) : null

  return (
    <section
      aria-label="مترجم الإشارة"
      className={`flex h-full min-h-0 flex-col bg-[#0b1630] text-white ${compact ? 'gap-2 overflow-y-auto p-2.5' : 'gap-3 p-5'}`}
    >
      <h2
        className={
          compact ? 'sr-only' : 'inline-flex shrink-0 items-center gap-2 text-base font-black text-[#f9bd29]'
        }
      >
        {compact ? null : <Icon name="hand" size={20} />} مترجم الإشارة
      </h2>

      {status ? <StatusLine status={status} compact={compact} /> : null}

      <div
        className={`relative min-h-0 overflow-hidden ring-1 ring-white/10 ${
          compact ? 'min-h-[6.5rem] flex-[1_1_8rem] rounded-2xl' : 'flex-[1_1_12rem] rounded-3xl'
        } ${sign?.kind === 'letter' ? 'bg-white' : 'bg-[#101b33]'}`}
      >
        {sign ? (
          <Stage
            sign={sign}
            stepKey={stepKey}
            failed={failed}
            compact={compact}
            onEnded={() => endedRef.current?.()}
            onFailed={() => setFailedKey(stepKey)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
            <span className={`flex items-center justify-center rounded-full bg-white/8 text-[#f9bd29] ${compact ? 'size-12' : 'size-20'}`}>
              <Icon name="hand" size={compact ? 24 : 40} />
            </span>
            <p className={`font-bold ${compact ? 'text-sm' : 'text-xl'}`}>سيظهر هنا كلام المحامي بالإشارة</p>
          </div>
        )}
        {/* مضغوط: اسم الإشارة فوق أسفل المسرح ليبقى للمسرح أكبر ارتفاع */}
        {compact && sign && !isCard ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-1 pt-6 text-center text-lg font-black text-[#f9bd29]">
            {sign.label}
          </div>
        ) : null}
      </div>

      {sign ? (
        <>
          {compact ? null : (
            <div className="min-h-9 shrink-0 truncate text-center text-3xl font-black text-[#f9bd29]">{sign.label}</div>
          )}

          <div
            className={`shrink-0 overflow-y-auto rounded-2xl bg-white/6 text-center font-bold ${
              compact
                ? 'max-h-[5.5rem] min-h-11 px-3 py-1 text-base leading-8'
                : 'max-h-[30%] min-h-16 px-5 py-3 text-3xl leading-[1.9]'
            }`}
            aria-label="الجملة"
          >
            {tokens.map((word, i) => {
              const active = i >= activeFrom && i <= activeTo
              return (
                <span key={i}>
                  {i ? ' ' : ''}
                  <span
                    ref={active && i === activeFrom ? activeWordRef : null}
                    className={`rounded-lg px-1.5 py-0.5 transition-colors duration-200 ${active ? 'bg-[#f9bd29] text-[#0b1630]' : ''}`}
                  >
                    {word}
                  </span>
                </span>
              )
            })}
          </div>

          {compact ? (
            <div className="flex shrink-0 items-center gap-2">
              {replayButton}
              {progress}
              {latestButton}
            </div>
          ) : (
            <>
              {progress}
              <div className="flex shrink-0 items-center gap-2">
                {replayButton}
                {latestButton}
              </div>
            </>
          )}
        </>
      ) : null}
    </section>
  )
}
