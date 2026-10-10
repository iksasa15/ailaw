import { Link, useParams } from 'react-router-dom'
import { courseById } from '../../platform/courses'
import { certificateNumber } from '../../platform/features'
import { courseProgress, formatDate } from '../../platform/logic'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandIcon, BrandMark } from '../../components/brand/BrandMark'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

/** شهادة إتمام دورة قابلة للطباعة (A4 أفقي). */
export default function Certificate() {
  const { course: courseId } = useParams()
  const { state, me } = usePlatform()
  const course = courseById(courseId)
  const person = state.users.p1
  if (!course || courseProgress(course, state.progress?.[course.id]) < 100) {
    return (
      <EmptyState
        icon="award"
        title="أكمل الدورة أولاً"
        text="تظهر الشهادة بعد إتمام كل دروس الدورة."
        action={
          <Button as={Link} to="/app/learn">
            مركز التعلّم
          </Button>
        }
      />
    )
  }
  const number = certificateNumber(course.id, person.name)
  return (
    <div className="mx-auto max-w-4xl">
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/app/learn" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">
          <Icon name="chevron" size={16} className="rotate-180" /> مركز التعلّم
        </Link>
        <Button onClick={() => window.print()}>
          <Icon name="print" size={18} /> طباعة / PDF
        </Button>
      </div>
      <div className="print-sheet relative aspect-[1.414] overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_20px_50px_rgba(11,28,36,0.12)]">
        <div className="flex h-full flex-col items-center justify-between rounded-[18px] border-[6px] border-double border-[var(--accent)]/70 px-10 py-8 text-center">
          <div className="flex w-full items-center justify-between">
            <BrandIcon size={56} />
            <div className="text-xs text-[var(--muted)]" dir="ltr">
              {number}
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-[var(--accent)]">النظارة الذكية · مركز تعلّم لغة الإشارة</div>
            <h1 className="mt-3 text-5xl font-black text-[var(--ink)]">شهادة إتمام</h1>
            <p className="mt-6 text-lg text-[var(--muted)]">تشهد منصة النظارة الذكية بأن</p>
            <div className="mt-2 text-4xl font-black text-[var(--accent-2)]">{person.name}</div>
            <p className="mt-4 text-lg text-[var(--muted)]">أتمّ بنجاح دورة</p>
            <div className="mt-1 text-3xl font-black text-[var(--ink)]">{course.title}</div>
            <p className="mt-2 text-sm text-[var(--muted)]">{course.lessons.length} دروس · {course.description}</p>
          </div>
          <div className="flex w-full items-end justify-between text-sm">
            <div>
              <div className="text-[var(--muted)]">تاريخ الإصدار</div>
              <div className="font-bold">{formatDate(new Date())}</div>
            </div>
            <BrandMark height={34} />
            <div>
              <div className="border-t border-[var(--ink)]/30 px-6 pt-1 font-bold">منصة النظارة الذكية</div>
              <div className="text-xs text-[var(--muted)]">{me?.role === 'lawyer' ? '' : 'تحقّق برقم الشهادة'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
