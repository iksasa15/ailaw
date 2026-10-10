import { useId } from 'react'

/**
 * شعار «النظارة الذكية»: نظارة، في العدسة اليمنى صوت (أعمدة) وفي اليسرى يد تشير.
 * نفس هندسة `AI LAW/AI LAW/Components/BrandMark.swift` (فضاء 1024).
 */

const LEFT = { x: 319, y: 520 }
const RIGHT = { x: 705, y: 520 }
const R = 150
const STROKE = 46
const deg = (rad) => (rad * 180) / Math.PI

const TONES = {
  brand: { ring: 'var(--accent)', hand: 'var(--accent)', wave: 'var(--accent-soft)' },
  white: { ring: '#ffffff', hand: '#ffffff', wave: '#5EEAD4' },
  mono: { ring: 'currentColor', hand: 'currentColor', wave: 'currentColor' },
}

function Glyph({ ring, hand, wave }) {
  const palmTop = LEFT.y - 2
  const fingers = [
    [-45, 84, -0.1],
    [-15, 98, -0.03],
    [15, 92, 0.03],
    [45, 72, 0.12],
  ]
  return (
    <g>
      {[LEFT, RIGHT].map((c) => (
        <g key={c.x}>
          <circle cx={c.x} cy={c.y} r={R - STROKE / 2} fill={ring} opacity="0.1" />
          <circle cx={c.x} cy={c.y} r={R} fill="none" stroke={ring} strokeWidth={STROKE} />
        </g>
      ))}
      <path d="M478 492 C494 452 530 452 546 492" fill="none" stroke={ring} strokeWidth="40" strokeLinecap="round" />
      <path d="M156 470 L112 438 M868 470 L912 438" fill="none" stroke={ring} strokeWidth="40" strokeLinecap="round" />
      {[
        [-58, 108],
        [0, 188],
        [58, 128],
      ].map(([dx, h]) => (
        <rect key={dx} x={RIGHT.x + dx - 19} y={RIGHT.y - h / 2} width="38" height={h} rx="19" fill={wave} />
      ))}
      <g fill={hand}>
        <rect x={LEFT.x - 60} y={palmTop - 6} width="120" height="100" rx="42" />
        {fingers.map(([dx, len, tilt]) => (
          <rect
            key={dx}
            x="-12"
            y={-len}
            width="24"
            height={len + 24}
            rx="12"
            transform={`translate(${LEFT.x + dx} ${palmTop + 6}) rotate(${deg(tilt)})`}
          />
        ))}
        <rect
          x="-13"
          y="-70"
          width="26"
          height="84"
          rx="13"
          transform={`translate(${LEFT.x - 52} ${LEFT.y + 56}) rotate(${deg(-Math.PI / 4.2)})`}
        />
      </g>
    </g>
  )
}

/** النظارة وحدها بإطار ضيّق (للشريط والعناوين). */
export function BrandMark({ height = 28, tone = 'brand', className = '' }) {
  return (
    <svg
      viewBox="92 380 840 270"
      height={height}
      width={(height * 840) / 270}
      className={className}
      role="img"
      aria-label="شعار النظارة الذكية"
    >
      <Glyph {...TONES[tone]} />
    </svg>
  )
}

/** أيقونة التطبيق المربعة بخلفيتها المتدرجة. */
export function BrandIcon({ size = 48, className = '' }) {
  // معرّفات فريدة: نسخة مخفية (display:none) لا يجوز أن تحمل التدرج الذي تستعمله نسخة ظاهرة.
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="46.5 52.5 931 931"
      width={size}
      height={size}
      className={`rounded-[22%] shadow-[0_10px_30px_rgba(15,118,110,0.35)] ${className}`}
      role="img"
      aria-label="النظارة الذكية"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13897F" />
          <stop offset="1" stopColor="#0B4F4A" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.25" cy="0.12" r="0.65">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="46.5" y="52.5" width="931" height="931" fill={`url(#${id}-bg)`} />
      <rect x="46.5" y="52.5" width="931" height="931" fill={`url(#${id}-shine)`} />
      <Glyph {...TONES.white} />
    </svg>
  )
}
