import { useNavigate } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'

const STEPS = [
  {
    title: 'الصلاحيات',
    body: 'يحتاج التطبيق إلى الكاميرا والمايكروفون لمحاكاة عدسة النظارة الذكية.',
  },
  {
    title: 'الاتجاهان + الأمان',
    body: 'استقبال الكلام كنص، إرسال الإشارة كصوت، وتنبيه بصري عند أصوات الخطر.',
  },
  {
    title: 'جاهز للعدسة',
    body: 'يمكنك تشغيل المسارات معاً من الشريط السفلي وضبط الخادم من الإعدادات.',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { update } = useSettings()

  function finish() {
    update({ onboarded: true })
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full flex-col justify-between bg-[#0b1220] px-5 py-8 text-white">
      <div>
        <p className="text-sm text-[#3ecf8e]">النظارة الذكية</p>
        <h1 className="mt-2 text-3xl font-bold">مرحباً بك</h1>
        <div className="mt-8 space-y-4">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl bg-white/5 p-4">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-white/75 leading-7">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={finish}
        className="min-h-12 rounded-2xl bg-[#3ecf8e] text-lg font-bold text-[#062016]"
      >
        ابدأ الآن
      </button>
    </div>
  )
}
