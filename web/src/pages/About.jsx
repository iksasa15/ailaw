import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchVocab } from '../services/api'

export default function About() {
  const [vocab, setVocab] = useState(null)

  useEffect(() => {
    fetchVocab()
      .then(setVocab)
      .catch(() => setVocab(null))
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">ℹ️ عن المشروع</h1>
          <div className="flex gap-2">
            <Link to="/guide" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
              📖 تعليمات
            </Link>
            <Link to="/" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
              👓 العدسة
            </Link>
          </div>
        </div>
        <p className="leading-7 text-white/85">
          موقع ويب / PWA يحاكي نظارة ذكية للصم والبكم: كاميرا ومايك الجوال كعدسة AR،
          تحويل الكلام إلى نص (Whisper)، ولغة الإشارة العربية إلى صوت (ArSL + TTS)،
          مع تنبيهات بصرية لأصوات الخطر (YAMNet).
        </p>
        <h2 className="text-lg font-semibold">الاتجاهات</h2>
        <ul className="list-disc space-y-2 pr-5 text-white/80">
          <li>استقبال: كلام → نص على العدسة</li>
          <li>إرسال: إشارة ArSL → نطق مسموع</li>
          <li>أمان: صفارة/إنذار → وميض + اهتزاز</li>
        </ul>
        <h2 className="text-lg font-semibold">مفردات الديمو (10 كلمات)</h2>
        {vocab ? (
          <ul className="grid grid-cols-2 gap-2">
            {vocab.words.map((w) => (
              <li key={w.index} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                {w.display}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">شغّل الـ Backend لعرض المفردات.</p>
        )}
        <h2 className="text-lg font-semibold">سيناريو فيديو الديمو</h2>
        <ol className="list-decimal space-y-2 pr-5 text-sm text-white/80">
          <li>افتح التطبيق المثبت / المتصفح واسمح بالكاميرا والمايك.</li>
          <li>شخص يتحدث → يظهر النص على الـ Overlay.</li>
          <li>فعّل الإرسال وأدِّ إشارة (مثل شكرا / السلام عليكم) → يُنطق الصوت.</li>
          <li>شغّل صفارة تجريبية → وميض أحمر واهتزاز.</li>
        </ol>
      </div>
    </div>
  )
}
