import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'
import { checkHealth, getApiBase, setApiBase } from '../services/api'

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

  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
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
