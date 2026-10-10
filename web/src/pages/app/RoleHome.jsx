import { usePlatform } from '../../platform/PlatformContext'
import LawyerDashboard from './LawyerDashboard'
import PersonDashboard from './PersonDashboard'

/** `/app`: لوحة الدور الحالي. */
export default function RoleHome() {
  const { state } = usePlatform()
  return state.role === 'lawyer' ? <LawyerDashboard /> : <PersonDashboard />
}
