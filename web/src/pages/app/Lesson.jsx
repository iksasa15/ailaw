import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { courseById } from '../../platform/courses'
import { usePlatform } from '../../platform/PlatformContext'
import { useCamera } from '../../hooks/useCamera'
import { useHands } from '../../hooks/useHands'
import { usePracticeCheck } from '../../hooks/usePracticeCheck'
import { HandLandmarkCanvas, PermissionGate, VideoFeed } from '../../components/camera/Camera'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'

/** التدريب بالكاميرا: حلقة تمتلئ أثناء تثبيت الإجابة الصحيحة، ثم ✓ ويُحفظ التقدّم. */
function Practice({ practice, onDone }) {
  const camera = useCamera({ facingMode: 'user', enabled: true })
  const hands = useHands({ videoRef: camera.videoRef, enabled: camera.status === 'ready' })
  const check = usePracticeCheck({
    landmarksRef: hands.landmarksRef,
    allHandsRef: hands.allHandsRef,
    practice,
    enabled: camera.status === 'ready',
  })
  useEffect(() => {
    if (check.done) onDone()
  }, [check.done, onDone])
  const circumference = 2 * Math.PI * 34
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-black">
      <PermissionGate status={camera.status} error={camera.error} onRetry={camera.start}>
        <VideoFeed videoRef={camera.videoRef} />
        <HandLandmarkCanvas canvasRef={hands.canvasRef} />
      </PermissionGate>
      <div className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-black/60 p-3 text-white backdrop-blur">
        <svg viewBox="0 0 80 80" className="size-16 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={check.done ? '#3ecf8e' : '#f9bd29'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - check.progress)}
          />
        </svg>
        <div>
          <div className="text-xs text-white/70">المطلوب: {practice.kind === 'letter' ? `حرف ${practice.target}` : `${practice.target} أصابع`}</div>
          <div className="text-lg font-black">
            {check.done
              ? 'أحسنت! ✓'
              : check.reading == null
                ? 'ضع يدك أمام الكاميرا'
                : `أرى: ${practice.kind === 'letter' ? check.reading : `${check.reading} أصابع`}`}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Lesson() {
  const { course: courseId, lesson: lessonId } = useParams()
  const { state, markLesson } = usePlatform()
  const course = courseById(courseId)
  const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  const lesson = index >= 0 ? course.lessons[index] : null
  if (!lesson) {
    return (
      <EmptyState
        icon="book"
        title="الدرس غير موجود"
        action={
          <Button as={Link} to="/app/learn">
            مركز التعلّم
          </Button>
        }
      />
    )
  }
  const next = course.lessons[index + 1]
  const done = Boolean(state.progress?.[course.id]?.[lesson.id])
  const complete = () => {
    if (!state.progress?.[course.id]?.[lesson.id]) markLesson(course.id, lesson.id)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/learn" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">
          <Icon name="chevron" size={16} className="rotate-180" /> {course.title}
        </Link>
        <span className="text-sm text-[var(--muted)] tabular-nums">
          الدرس {index + 1} من {course.lessons.length}
        </span>
      </div>

      <div className={`grid items-start gap-5 ${lesson.practice ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_1fr]'}`}>
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-white">{lesson.symbol}</span>
            <div>
              <h2 className="text-2xl font-black">{lesson.title}</h2>
              {done ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                  <Icon name="check" size={14} strokeWidth={3} /> أتقنته
                </span>
              ) : null}
            </div>
          </div>
          {lesson.image ? (
            <img src={lesson.image} alt={lesson.title} className="mx-auto max-h-80 w-full rounded-2xl bg-[var(--bg)] object-contain p-2" />
          ) : null}
          {lesson.phrases ? (
            <div className="grid gap-2">
              <div className="rounded-2xl bg-[var(--accent)]/8 p-4">
                <div className="text-xs font-bold text-[var(--accent)]">الشخص يقول</div>
                <div className="mt-1 text-lg font-bold">{lesson.phrases.person}</div>
              </div>
              <div className="rounded-2xl bg-[var(--accent-2)]/8 p-4">
                <div className="text-xs font-bold text-[var(--accent-2)]">المحامي يقول</div>
                <div className="mt-1 text-lg font-bold">{lesson.phrases.lawyer}</div>
              </div>
            </div>
          ) : null}
          <p className="leading-8 text-[var(--ink)]/85">{lesson.text}</p>
          <div className="flex flex-wrap gap-2">
            {!done ? (
              <Button variant="secondary" onClick={complete}>
                <Icon name="check" size={18} /> أتقنته
              </Button>
            ) : null}
            {next ? (
              <Button as={Link} to={`/app/learn/${course.id}/${next.id}`}>
                الدرس التالي ←
              </Button>
            ) : (
              <Button as={Link} to="/app/learn">
                أنهيت الدورة 🎉
              </Button>
            )}
          </div>
        </Card>
        {lesson.practice ? <Practice key={lesson.id} practice={lesson.practice} onDone={complete} /> : null}
      </div>
    </div>
  )
}
