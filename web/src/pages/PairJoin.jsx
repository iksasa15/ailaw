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
      <div className="app-bg flex h-full flex-col items-center justify-center gap-4 px-6">
        <p className="font-semibold text-[var(--danger)]">{error}</p>
        <a href="/screens" className="btn-primary rounded-xl px-4 py-3">
          العودة للجلسة
        </a>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="app-bg flex h-full items-center justify-center text-[var(--ink)]">
        جاري الانضمام…
      </div>
    )
  }

  return <Navigate to={target} replace />
}
