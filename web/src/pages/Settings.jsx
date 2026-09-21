import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, getApiBase, setApiBase } from '../services/api'
import { LAWYER_PHRASES, PERSON_PHRASES } from '../hooks/useFingerPhrases'

function PhraseEditor({ title, emoji, phrases, onChange, onReset }) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          <span aria-hidden>{emoji} </span>
          {title}
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/80"
        >
          افتراضي
        </button>
      </div>
      <p className="text-xs text-white/55">عدّل النص لكل رقم أصابع (1–10) — يُحفظ ويعمل فوراً في الإرسال.</p>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <label key={n} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-center text-sm font-bold text-[#3ecf8e]">{n}</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0b1220] px-3 text-sm text-white"
              value={phrases?.[n] ?? phrases?.[String(n)] ?? ''}
              onChange={(e) => onChange(n, e.target.value)}
              placeholder={`عبارة رقم ${n}`}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

export default function Settings() {
  const { settings, update, reset } = useSettings()
  const [api, setApi] = useState(settings.apiBase || getApiBase())
  const [health, setHealth] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function saveApi() {
    setApiBase(api)
    update({ apiBase: api.replace(/\/$/, '') })
    try {
      const h = await checkHealth()
      setHealth(h)
    } catch {
      setHealth({ status: 'error' })
    }
  }

  async function installPwa() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function patchPhrase(roleKey, n, value) {
    const current = { ...(settings[roleKey] || {}) }
    current[n] = value
    update({ [roleKey]: current })
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-5 pb-10">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">⚙️ الإعدادات</h1>
          <div className="flex gap-2">
            <Link to="/guide" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
              📖 تعليمات
            </Link>
            <Link to="/" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
              👓 العدسة
            </Link>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-white/70">عنوان Backend</span>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3"
            value={api}
            onChange={(e) => setApi(e.target.value)}
            placeholder="http://192.168.x.x:8000"
          />
          <button
            type="button"
            onClick={saveApi}
            className="min-h-11 rounded-xl bg-[#3ecf8e] px-4 font-semibold text-[#062016]"
          >
            حفظ وفحص /health
          </button>
          {health && (
            <p className="text-sm text-white/70">
              الحالة: {health.status === 'ok' ? 'متصل ✓' : 'غير متصل'}
            </p>
          )}
        </label>

        <PhraseEditor
          title="قائمة المحامي"
          emoji="⚖️"
          phrases={settings.lawyerPhrases}
          onChange={(n, value) => patchPhrase('lawyerPhrases', n, value)}
          onReset={() => update({ lawyerPhrases: { ...LAWYER_PHRASES } })}
        />

        <PhraseEditor
          title="قائمة الشخص"
          emoji="👤"
          phrases={settings.personPhrases}
          onChange={(n, value) => patchPhrase('personPhrases', n, value)}
          onReset={() => update({ personPhrases: { ...PERSON_PHRASES } })}
        />

        <label className="block space-y-2">
          <span className="text-sm text-white/70">حجم النص ({settings.fontScale.toFixed(1)})</span>
          <input
            type="range"
            min="0.8"
            max="1.6"
            step="0.1"
            value={settings.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/70">
            شفافية خلفية النص ({settings.overlayOpacity.toFixed(2)})
          </span>
          <input
            type="range"
            min="0.2"
            max="0.85"
            step="0.05"
            value={settings.overlayOpacity}
            onChange={(e) => update({ overlayOpacity: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/70">
            عتبة ثقة الإشارة ({settings.confidence.toFixed(2)}) — للديمو الحي يُفضّل 0.35–0.40
          </span>
          <input
            type="range"
            min="0.2"
            max="0.9"
            step="0.05"
            value={settings.confidence}
            onChange={(e) => update({ confidence: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-white/80">
            التعرف بالذكاء (ARSL) — تجريبي، الأصابع تبقى الأساس
          </span>
          <input
            type="checkbox"
            checked={Boolean(settings.arslEnabled)}
            onChange={(e) => update({ arslEnabled: e.target.checked })}
            className="h-5 w-5 accent-[#3ecf8e]"
          />
        </label>

        {settings.roomId ? (
          <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/55" dir="ltr">
            roomId: {settings.roomId}
          </p>
        ) : null}

        {deferredPrompt && (
          <button
            type="button"
            onClick={installPwa}
            className="min-h-11 w-full rounded-xl bg-white text-[#0b1220] font-semibold"
          >
            ثبّت التطبيق على الشاشة الرئيسية
          </button>
        )}

        <button
          type="button"
          onClick={reset}
          className="min-h-11 w-full rounded-xl border border-white/20 px-4"
        >
          إعادة تعيين الإعدادات
        </button>
      </div>
    </div>
  )
}
