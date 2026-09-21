import { useEffect, useState } from 'react'
import { fetchVocab } from '../services/api'
import { PageHeader } from '../components/layout/PageHeader'

export default function About() {
  const [vocab, setVocab] = useState(null)

  useEffect(() => {
    fetchVocab()
      .then(setVocab)
      .catch(() => setVocab(null))
  }, [])

  return (
    <div className="h-full overflow-y-auto px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-4">
        <PageHeader title="عن المشروع" subtitle="عدسة AR للصم والبكم" backTo="/more" />

        <p className="app-surface rounded-2xl p-4 leading-7 text-[var(--ink)]">
          تطبيق جوال يحاكي نظارة ذكية: كاميرا ومايك كعدسة، كلام يتحول إلى نص، وإشارات مرئية/صوت، مع
          تنبيهات بصرية لأصوات الخطر.
        </p>

        <section className="app-surface rounded-2xl p-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">الاتجاهات</h2>
          <ul className="mt-2 list-disc space-y-2 pr-5 text-[var(--muted)]">
            <li>استقبال: كلام → نص على العدسة</li>
            <li>إرسال: إشارة → نطق مسموع</li>
            <li>أمان: صفارة/إنذار → وميض + اهتزاز</li>
          </ul>
        </section>

        <section className="app-surface rounded-2xl p-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">مفردات الديمو</h2>
          {vocab ? (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {vocab.words.map((w) => (
                <li
                  key={w.index}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--ring)]"
                >
                  {w.display}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">شغّل الـ Backend لعرض المفردات.</p>
          )}
        </section>
      </div>
    </div>
  )
}
