import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'
import { useSharedMic } from '../hooks/useSharedMic'
import { useSttSocket } from '../hooks/useSttSocket'
import { useBrowserStt } from '../hooks/useBrowserStt'
import { useTts } from '../hooks/useTts'
import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'
import { SignCoachAvatar } from '../components/overlay/SignCoachAvatar'
import { checkHealth } from '../services/api'

/**
 * صفحة تجربة على جهاز واحد:
 * محامي (مايك / نص / عبارات جاهزة) → أفتار لغة إشارة.
 */
export default function Lab() {
  const { settings } = useSettings()
  const [draft, setDraft] = useState('')
  const [lawyerPhrase, setLawyerPhrase] = useState(null)
  const [listening, setListening] = useState(false)
  const [backendWhisper, setBackendWhisper] = useState(false)
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
    (text, { speakIt = true } = {}) => {
      const cleaned = String(text || '').trim()
      if (!cleaned) return
      unlock()
      setLawyerPhrase({
        text: cleaned,
        fingers: null,
        at: Date.now(),
      })
      setDraft(cleaned)
      if (speakIt) speak(cleaned, { force: true })
    },
    [speak, unlock],
  )

  // بث آخر كلام من المايك للأفتار
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

  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] text-white">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5 pb-10">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#3ecf8e]">تجربة على جهاز واحد</p>
            <h1 className="mt-1 text-2xl font-bold">محامي + أفتار الإشارة</h1>
            <p className="mt-2 text-sm leading-6 text-white/65">
              تكلّم أو اختر عبارة — الأفتار يعرض <strong className="text-white">إشارات مرئية</strong> حقيقية
              (صور إشارة) وليس أرقام أصابع.
            </p>
          </div>
          <Link
            to="/"
            className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          >
            العدسة
          </Link>
        </header>

        <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">المحامي</h2>
            <span className="text-xs text-white/50">الاستقبال: {sttLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                unlock()
                setListening((v) => !v)
              }}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                listening
                  ? 'bg-[#ff3b4e] text-white'
                  : 'bg-[#3ecf8e] text-[#062016]'
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
                setDraft('')
              }}
              className="min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold"
            >
              مسح
            </button>
          </div>

          {(stt.text || stt.partial) && listening ? (
            <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-sm text-white/80">
              {stt.text || <span className="opacity-70">{stt.partial}</span>}
            </p>
          ) : null}

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-white/70">أو اكتب عبارة المحامي</span>
            <textarea
              className="min-h-[5rem] w-full rounded-xl border border-white/15 bg-[#0b1220] px-3 py-3 text-sm text-white"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثال: أنا محاميك، تفضّل"
            />
          </label>
          <button
            type="button"
            onClick={() => pushPhrase(draft)}
            className="mt-2 min-h-11 w-full rounded-xl bg-[#5eb8ff] font-bold text-[#041018]"
          >
            أرسل للأفتار
          </button>

          <p className="mt-4 text-xs font-semibold text-white/55">عبارات جاهزة</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(LAWYER_PHRASES).map(([n, text]) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setLawyerPhrase({ text, fingers: Number(n), at: Date.now() })
                  setDraft(text)
                  unlock()
                  speak(text, { force: true })
                }}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90"
              >
                {n}. {text}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 p-3 ring-1 ring-[#3ecf8e]/25">
          <h2 className="mb-2 px-1 text-base font-bold">الأفتار · لغة إشارة مرئية</h2>
          <SignCoachAvatar visible lawyerPhrase={lawyerPhrase} mode="panel" />
        </section>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/screens" className="rounded-xl bg-white/10 px-4 py-2.5 font-semibold">
            شاشتين (جلسة حقيقية)
          </Link>
          <Link to="/guide" className="rounded-xl bg-white/10 px-4 py-2.5 font-semibold">
            تعليمات
          </Link>
        </div>
      </div>
    </div>
  )
}
