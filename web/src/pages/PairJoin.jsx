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
    const invite =
      parsePairInvite(window.location.href) ||
      (api ? { api: api.replace(/\/$/, ''), role } : null)

    if (!invite?.api || (invite.role !== 'lawyer' && invite.role !== 'person')) {
      setError('رابط الدعوة غير صالح')
      return
    }
    const path = applyPairInvite(invite, update)
    setTarget(path)
  }, [params, update])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0b1220] px-6 text-white">
        <p className="text-[#ff3b4e]">{error}</p>
        <a href="/screens" className="rounded-xl bg-[#3ecf8e] px-4 py-3 font-bold text-[#062016]">
          العودة لشاشتين
        </a>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b1220] text-white">
        جاري الانضمام…
      </div>
    )
  }

  return <Navigate to={target} replace />
}
