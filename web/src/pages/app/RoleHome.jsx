import { usePlatform } from '../../platform/PlatformContext'
import { Card } from '../../components/ui/Card'
import PersonDashboard from './PersonDashboard'

/** `/app`: لوحة الدور الحالي. */
export default function RoleHome() {
  const { state, me } = usePlatform()
  if (state.role === 'person') return <PersonDashboard />
  return (
    <Card>
      <h2 className="text-2xl font-black">مرحباً {me?.name}</h2>
    </Card>
  )
}
