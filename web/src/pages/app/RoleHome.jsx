import { usePlatform } from '../../platform/PlatformContext'
import { Card } from '../../components/ui/Card'

/** `/app`: لوحة الدور الحالي. */
export default function RoleHome() {
  const { me } = usePlatform()
  return (
    <Card>
      <h2 className="text-2xl font-black">مرحباً {me?.name}</h2>
    </Card>
  )
}
