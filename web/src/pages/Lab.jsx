import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'
import { useSharedMic } from '../hooks/useSharedMic'
import { useSttSocket } from '../hooks/useSttSocket'
import { useBrowserStt } from '../hooks/useBrowserStt'
import { useTts } from '../hooks/useTts'
import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'
import { SignCoachAvatar } from '../components/overlay/SignCoachAvatar'
import { PageHeader } from '../components/layout/PageHeader'
import { checkHealth } from '../services/api'
import {
  CASE_SCENARIO,
  SCENARIO_SUBTITLE,
  SCENARIO_TITLE,
} from '../data/caseScenario'

export default function Lab() {
  const { settings } = useSettings()
  const [draft, setDraft] = useState('')
  const [lawyerPhrase, setLawyerPhrase] = useState(null)
  const [personLine, setPersonLine] = useState(null)
  const [listening, setListening] = useState(false)
  const [backendWhisper, setBackendWhisper] = useState(false)
  const [stepIdx, setStepIdx] = useState(-1)
  const [autoPlay, setAutoPlay] = useState(false)
  const lastSentRef = useRef('')
  const { speak, unlock } = useTts({ cooldownMs: 1200 })

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

  const mic = useSharedMic({ enabled: listening })
  const useWs = listening && backendWhisper
  const useBrowser = listening && !backendWhisper

  const sttWs = useSttSocket({
    enabled: useWs && mic.status === 'ready',
    language: settings.language || 'ar',
    chunkMs: 1200,
    stream: mic.stream,
  })
  const sttBrowser = useBrowserStt({
    enabled: useBrowser,
    language: 'ar-SA',
  })
  const stt = useWs ? sttWs : sttBrowser

  const pushPhrase = useCallback(
    (text, { speakIt = true, fingers = null } = {}) => {
      const cleaned = String(text || '').trim()
      if (!cleaned) return
      unlock()
      setLawyerPhrase({
        text: cleaned,
        fingers,
        at: Date.now(),
      })
      setDraft(cleaned)
      if (speakIt) speak(cleaned, { force: true })
    },
    [speak, unlock],
  )

  const playStep = useCallback(
    (idx) => {
      const step = CASE_SCENARIO[idx]
      if (!step) return
      setStepIdx(idx)
      unlock()
      if (step.role === 'lawyer') {
        setPersonLine(null)
        setLawyerPhrase({
          text: step.text,
          fingers: step.fingers,
          at: Date.now(),
        })
        setDraft(step.text)
        speak(step.text, { force: true })
      } else {
        setLawyerPhrase(null)
        setPersonLine(step)
        speak(step.text, { force: true })
      }
    },
    [speak, unlock],
  )

  const nextStep = useCallback(() => {
    const next = stepIdx < 0 ? 0 : stepIdx + 1
    if (next >= CASE_SCENARIO.length) {
      setAutoPlay(false)
      return
    }
    playStep(next)
  }, [stepIdx, playStep])

  const resetScenario = useCallback(() => {
    setAutoPlay(false)
    setStepIdx(-1)
    setLawyerPhrase(null)
    setPersonLine(null)
    setDraft('')
  }, [])

  useEffect(() => {
    if (!autoPlay || stepIdx < 0) return undefined
    if (stepIdx >= CASE_SCENARIO.length - 1) {
      setAutoPlay(false)
      return undefined
    }
    const delay = CASE_SCENARIO[stepIdx]?.role === 'lawyer' ? 4200 : 3200
    const t = window.setTimeout(() => {
      playStep(stepIdx + 1)
    }, delay)
    return () => window.clearTimeout(t)
  }, [autoPlay, stepIdx, playStep])

  useEffect(() => {
    if (!listening) return
    const raw = (stt.text || '').trim()
    if (!raw || raw.length < 2) return
    const parts = raw.split(/\s+/).filter(Boolean)
    const snippet = parts.slice(-12).join(' ')
    if (!snippet || snippet === lastSentRef.current) return
    const t = window.setTimeout(() => {
      if (snippet === lastSentRef.current) return
      lastSentRef.current = snippet
      pushPhrase(snippet, { speakIt: false })
    }, 600)
    return () => window.clearTimeout(t)
  }, [stt.text, listening, pushPhrase])

  const sttLabel =
    mic.status === 'denied'
      ? 'المايك مرفوض'
      : stt.status === 'listening'
        ? 'يستمع…'
        : stt.status === 'connecting'
          ? 'يتصل…'
          : stt.status === 'error'
            ? stt.error || 'خطأ'
            : listening
              ? 'جاهز'
              : 'متوقف'

  const current = stepIdx >= 0 ? CASE_SCENARIO[stepIdx] : null
  const progress = stepIdx < 0 ? 0 : Math.round(((stepIdx + 1) / CASE_SCENARIO.length) * 100)

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4">
        <PageHeader title="المعمل" subtitle="سيناريو قضية واقعي + مترجم إشارة" />

        <section className="app-surface rounded-2xl p-4 ring-1 ring-[rgba(196,92,38,0.28)]">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">{SCENARIO_TITLE}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{SCENARIO_SUBTITLE}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">
              {stepIdx < 0 ? `0/${CASE_SCENARIO.length}` : `${stepIdx + 1}/${CASE_SCENARIO.length}`}
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ink)]/10">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                unlock()
                if (stepIdx < 0) {
                  playStep(0)
                  setAutoPlay(true)
                } else {
                  setAutoPlay((v) => !v)
                }
              }}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                autoPlay ? 'bg-[var(--danger)] text-white' : 'btn-primary'
              }`}
            >
              {autoPlay ? 'إيقاف تلقائي' : stepIdx < 0 ? 'تشغيل السيناريو' : 'متابعة تلقائية'}
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={stepIdx >= CASE_SCENARIO.length - 1}
              className="min-h-11 rounded-xl bg-white px-4 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)] disabled:opacity-40"
            >
              الخطوة التالية
            </button>
            <button
              type="button"
              onClick={resetScenario}
              className="min-h-11 rounded-xl bg-white/80 px-4 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)]"
            >
              إعادة
            </button>
          </div>

          {current ? (
            <div
              className={`mt-4 rounded-xl px-3 py-3 ${
                current.role === 'lawyer'
                  ? 'bg-[rgba(196,92,38,0.12)] ring-1 ring-[rgba(196,92,38,0.35)]'
                  : 'bg-[rgba(36,74,115,0.12)] ring-1 ring-[rgba(36,74,115,0.3)]'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[var(--ink)]">
                  {current.role === 'lawyer' ? 'المحامي' : 'الشخص'}
                  <span className="mr-2 font-semibold text-[var(--muted)]">
                    · {current.fingers} أصابع
                  </span>
                </p>
              </div>
              <p className="text-lg font-bold leading-7 text-[var(--ink)]">{current.text}</p>
              {current.role === 'person' ? (
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  ارفع {current.fingers} أصابع — يُنطق للمحامي.
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  يظهر للموكّل كمترجم إشارة أدناه.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              اضغط «تشغيل السيناريو» لمشاهدة جلسة حادث مروري كاملة.
            </p>
          )}

          <ol className="mt-4 max-h-40 space-y-1.5 overflow-y-auto text-right">
            {CASE_SCENARIO.map((step, i) => {
              const active = i === stepIdx
              const done = i < stepIdx
              return (
                <li key={`${step.role}-${step.fingers}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoPlay(false)
                      playStep(i)
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-right text-xs transition ${
                      active
                        ? 'bg-[var(--accent)] text-white'
                        : done
                          ? 'bg-[var(--ink)]/5 text-[var(--ink)]'
                          : 'text-[var(--muted)] hover:bg-[var(--ink)]/5'
                    }`}
                  >
                    <span className="mt-0.5 w-12 shrink-0 font-bold">
                      {step.role === 'lawyer' ? 'محامي' : 'شخص'}
                    </span>
                    <span className="flex-1 leading-5">{step.text}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        {personLine ? (
          <section className="rounded-2xl bg-[#152033] px-4 py-4 text-center text-white shadow-lg">
            <p className="text-xs font-semibold text-[#E8A078]">الشخص بالإشارة → صوت للمحامي</p>
            <p className="mt-1 text-xl font-bold">
              {personLine.fingers} أصابع · {personLine.text}
            </p>
          </section>
        ) : null}

        <section className="app-surface rounded-2xl p-3 ring-1 ring-[rgba(196,92,38,0.25)]">
          <h2 className="mb-2 px-1 text-base font-bold text-[var(--ink)]">مترجم الإشارة (للموكّل)</h2>
          <SignCoachAvatar visible lawyerPhrase={lawyerPhrase} mode="panel" />
        </section>

        <section className="app-surface rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--ink)]">اختبار يدوي للمحامي</h2>
            <span className="text-xs text-[var(--muted)]">الاستقبال: {sttLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                unlock()
                setListening((v) => !v)
              }}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                listening ? 'bg-[var(--danger)] text-white' : 'btn-primary'
              }`}
            >
              {listening ? 'إيقاف المايك' : 'تفعيل المايك'}
            </button>
            <button
              type="button"
              onClick={() => {
                stt.clearText?.()
                lastSentRef.current = ''
                setLawyerPhrase(null)
                setPersonLine(null)
                setDraft('')
              }}
              className="min-h-11 rounded-xl bg-white/80 px-4 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)]"
            >
              مسح
            </button>
          </div>

          {(stt.text || stt.partial) && listening ? (
            <p className="mt-3 rounded-xl bg-[var(--ink)]/5 px-3 py-2 text-sm text-[var(--ink)]">
              {stt.text || <span className="opacity-70">{stt.partial}</span>}
            </p>
          ) : null}

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-[var(--muted)]">أو اكتب عبارة المحامي</span>
            <textarea
              className="min-h-[5rem] w-full rounded-xl border border-[var(--ring)] bg-white px-3 py-3 text-sm text-[var(--ink)]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثال: السلام عليكم، أنا محاميك"
            />
          </label>
          <button
            type="button"
            onClick={() => pushPhrase(draft)}
            className="btn-secondary mt-2 min-h-11 w-full rounded-xl"
          >
            أرسل للمترجم
          </button>

          <p className="mt-4 text-xs font-semibold text-[var(--muted)]">عبارات جاهزة</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(LAWYER_PHRASES).map(([n, text]) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPersonLine(null)
                  setLawyerPhrase({ text, fingers: Number(n), at: Date.now() })
                  setDraft(text)
                  unlock()
                  speak(text, { force: true })
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)]"
              >
                {n}. {text}
              </button>
            ))}
          </div>
        </section>

        <Link
          to="/screens"
          className="rounded-xl bg-white/80 px-4 py-2.5 text-center text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--ring)]"
        >
          جلسة بجهازين (محامي ↔ شخص)
        </Link>
      </div>
    </div>
  )
}
