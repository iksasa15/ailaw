import { useState } from 'react'
import { usePlatform } from '../../platform/PlatformContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

const LABELS = ['', 'سيئة', 'مقبولة', 'جيدة', 'جيدة جداً', 'ممتازة']

/** تقييم المحامي بعد الجلسة (مرة واحدة)؛ يظهر فوراً في صفحة المحامي. */
export function RatingCard({ booking, lawyerName }) {
  const { rate } = usePlatform()
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  if (booking.rating) {
    return (
      <Card className="no-print flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <Icon name="star" size={24} />
        </span>
        <div>
          <div className="font-black">شكراً لتقييمك</div>
          <div className="flex items-center gap-1 text-amber-500" aria-label={`${booking.rating.stars} من 5`}>
            {Array.from({ length: booking.rating.stars }, (_, i) => (
              <Icon key={i} name="star" size={16} />
            ))}
            {booking.rating.text ? <span className="ms-2 text-sm text-[var(--muted)]">«{booking.rating.text}»</span> : null}
          </div>
        </div>
      </Card>
    )
  }

  const shown = hover || stars
  return (
    <Card className="no-print flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-black">كيف كانت جلستك مع {lawyerName}؟</h3>
        <p className="text-sm text-[var(--muted)]">تقييمك يساعد غيرك من الصم على اختيار المحامي المناسب.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" role="radiogroup" aria-label="التقييم" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} من 5`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setStars(n)}
              className={`transition-transform hover:scale-110 ${n <= shown ? 'text-amber-400' : 'text-black/15'}`}
            >
              <Icon name="star" size={34} />
            </button>
          ))}
        </div>
        <span className="font-bold text-[var(--muted)]">{LABELS[shown]}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="تعليق اختياري…"
        className="w-full rounded-2xl border border-[var(--ring)] px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)]"
      />
      {error ? <div className="text-sm font-bold text-red-600">{error}</div> : null}
      <Button
        disabled={!stars}
        onClick={() => {
          const r = rate(booking.id, stars, text)
          if (!r.ok) setError(r.error)
        }}
      >
        إرسال التقييم
      </Button>
    </Card>
  )
}
