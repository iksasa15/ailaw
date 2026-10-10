import { Navigate, useLocation } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'

/** بلا دخول ⇒ `/login`؛ دور غير مسموح ⇒ `/app`. */
export function RequireRole({ role, children }) {
  const { state } = usePlatform()
  const location = useLocation()
  if (!state.role) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (role && state.role !== role) return <Navigate to="/app" replace />
  return children
}
