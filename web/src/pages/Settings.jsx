import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, getApiBase, setApiBase } from '../services/api'
import { LAWYER_PHRASES, PERSON_PHRASES } from '../hooks/useFingerPhrases'
import { PageHeader } from '../components/layout/PageHeader'

function PhraseEditor({ title, phrases, onChange, onReset }) {
  return (
    <section className="app-surface space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-white/80 px-2.5 py-1 text-xs text-[var(--muted)] ring-1 ring-[var(--ring)]"
        >
          افتراضي
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">عدّل النص لكل رقم أصابع (1–10).</p>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <label key={n} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-center text-sm font-bold text-[var(--accent)]">{n}</span>
            <input
              className="min-h-11 w-full rounded-xl border border-[var(--ring)] bg-white px-3 text-sm text-[var(--ink)]"
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
    <div className="h-full overflow-y-auto px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-5">
        <PageHeader title="الإعدادات" subtitle="الخادم والعبارات والعرض" backTo="/more" />

        <label className="app-surface block space-y-2 rounded-2xl p-4">
          <span className="text-sm text-[var(--muted)]">عنوان Backend</span>
          <input
            className="w-full rounded-xl border border-[var(--ring)] bg-white px-3 py-3 text-[var(--ink)]"
            value={api}
            onChange={(e) => setApi(e.target.value)}
            placeholder="http://192.168.x.x:8000"
          />
          <button type="button" onClick={saveApi} className="btn-primary min-h-11 rounded-xl px-4">
            حفظ وفحص /health
          </button>
          {health && (
            <p className="text-sm text-[var(--muted)]">
              الحالة: {health.status === 'ok' ? 'متصل' : 'غير متصل'}
            </p>
          )}
        </label>

        <PhraseEditor
          title="قائمة المحامي"
          phrases={settings.lawyerPhrases}
          onChange={(n, value) => patchPhrase('lawyerPhrases', n, value)}
          onReset={() => update({ lawyerPhrases: { ...LAWYER_PHRASES } })}
        />

        <PhraseEditor
          title="قائمة الشخص"
          phrases={settings.personPhrases}
          onChange={(n, value) => patchPhrase('personPhrases', n, value)}
          onReset={() => update({ personPhrases: { ...PERSON_PHRASES } })}
        />

        <label className="app-surface block space-y-2 rounded-2xl p-4">
          <span className="text-sm text-[var(--muted)]">حجم النص ({settings.fontScale.toFixed(1)})</span>
          <input
            type="range"
            min="0.8"
            max="1.6"
            step="0.1"
            value={settings.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <label className="app-surface block space-y-2 rounded-2xl p-4">
          <span className="text-sm text-[var(--muted)]">
            شفافية خلفية النص ({settings.overlayOpacity.toFixed(2)})
          </span>
          <input
            type="range"
            min="0.2"
            max="0.85"
            step="0.05"
            value={settings.overlayOpacity}
            onChange={(e) => update({ overlayOpacity: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <label className="app-surface block space-y-2 rounded-2xl p-4">
          <span className="text-sm text-[var(--muted)]">
            عتبة ثقة الإشارة ({settings.confidence.toFixed(2)})
          </span>
          <input
            type="range"
            min="0.2"
            max="0.9"
            step="0.05"
            value={settings.confidence}
            onChange={(e) => update({ confidence: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <label className="app-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <span className="text-sm text-[var(--ink)]">التعرف بالذكاء (ARSL) — تجريبي</span>
          <input
            type="checkbox"
            checked={Boolean(settings.arslEnabled)}
            onChange={(e) => update({ arslEnabled: e.target.checked })}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>

        {settings.roomId ? (
          <p className="rounded-xl bg-white/60 px-3 py-2 text-xs text-[var(--muted)]" dir="ltr">
            roomId: {settings.roomId}
          </p>
        ) : null}

        {deferredPrompt && (
          <button
            type="button"
            onClick={installPwa}
            className="min-h-11 w-full rounded-xl bg-[var(--ink)] font-semibold text-white"
          >
            ثبّت التطبيق على الشاشة الرئيسية
          </button>
        )}

        <button
          type="button"
          onClick={reset}
          className="min-h-11 w-full rounded-xl border border-[var(--ring)] bg-white/70 px-4 text-[var(--ink)]"
        >
          إعادة تعيين الإعدادات
        </button>
      </div>
    </div>
  )
}
