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

        <div className="app-surface overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-[var(--ring)] bg-[var(--accent)]/8 px-4 py-3">
            <svg viewBox="0 0 88 40" className="h-7 w-14" aria-hidden>
              <circle cx="28" cy="20" r="14" fill="none" stroke="var(--accent-2)" strokeWidth="3" />
              <circle cx="60" cy="20" r="14" fill="none" stroke="var(--accent)" strokeWidth="3" />
              <path d="M42 20h4" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="font-brand text-base font-bold text-[var(--ink)]">النظارة الذكية</p>
          </div>
          <p className="px-4 py-4 leading-7 text-[var(--ink)]">
            تطبيق جوال يحاكي نظارة ذكية: كاميرا ومايك كعدسة، كلام يتحول إلى نص، وإشارات مرئية/صوت، مع
            تنبيهات بصرية لأصوات الخطر.
          </p>
        </div>

        <section className="app-surface rounded-2xl p-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">الاتجاهات</h2>
          <ul className="mt-3 space-y-2.5">
            {[
              'استقبال: كلام → نص على العدسة',
              'إرسال: إشارة → نطق مسموع',
              'أمان: صفارة/إنذار → وميض + اهتزاز',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-[var(--muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                <span className="leading-6">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="app-surface rounded-2xl p-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">مفردات الديمو</h2>
          {vocab ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {vocab.words.map((w) => (
                <li
                  key={w.index}
                  className="rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--ring)]"
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
