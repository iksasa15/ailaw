import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useSettings } from '../app/SettingsContext'
import { applyPairInvite, parsePairInvite } from '../services/pairInvite'

/** Deep-link landing: /pair?api=...&role=person|lawyer */
export default function PairJoin() {
  const [params] = useSearchParams()
  const { update } = useSettings()
  const [target, setTarget] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const api = params.get('api') || ''
    const role = params.get('role') || 'person'
    const room = params.get('room') || ''
    const invite =
      parsePairInvite(window.location.href) ||
      (api ? { api: api.replace(/\/$/, ''), role, room: room || null } : null)

    if (!invite?.api || (invite.role !== 'lawyer' && invite.role !== 'person')) {
      setError('رابط الدعوة غير صالح')
      return
    }
    const path = applyPairInvite(invite, update)
    setTarget(path)
  }, [params, update])

  if (error) {
    return (
      <div className="app-bg flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="app-surface w-full max-w-sm rounded-2xl p-6">
          <p className="font-brand text-sm font-bold text-[var(--accent)]">النظارة الذكية</p>
          <p className="mt-3 text-lg font-bold text-[var(--danger)]">{error}</p>
          <a href="/screens" className="btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-base">
            العودة للجلسة
          </a>
        </div>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="app-bg flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--accent)]/25" aria-hidden />
        <p className="font-semibold text-[var(--ink)]">جاري الانضمام…</p>
        <p className="text-sm text-[var(--muted)]">يتم تطبيق دعوة الجلسة</p>
      </div>
    )
  }

  return <Navigate to={target} replace />
}
