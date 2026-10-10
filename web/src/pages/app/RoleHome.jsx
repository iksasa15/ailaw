import { COURSES } from '../../platform/courses'
import { earnedBadges } from '../../platform/features'
import { courseProgress } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import LawyerDashboard from './LawyerDashboard'
import PersonDashboard from './PersonDashboard'

/** `/app`: لوحة الدور الحالي. */
export default function RoleHome() {
  const { state } = usePlatform()
  if (state.role === 'lawyer') return <LawyerDashboard />
  const learning = COURSES.map((c) => ({ id: c.id, title: c.title, percent: courseProgress(c, state.progress?.[c.id]) }))
  const all = earnedBadges(state)
  const badges = { earned: all.filter((b) => b.earned).length, total: all.length }
  return <PersonDashboard learning={learning} badges={badges} />
}
