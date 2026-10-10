import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'

/**
 * وضع ملء الشاشة: العنصر يغطي الصفحة كلها (فوق القائمة والشريط العلوي)، ويطلب ملء الشاشة
 * الحقيقي من المتصفح إن سمح. Esc أو الزر للخروج.
 */
export function useFocusMode() {
  const [focused, setFocused] = useState(false)

  const exit = useCallback(() => {
    setFocused(false)
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [])

  const toggle = useCallback(() => {
    if (focused) return exit()
    setFocused(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [focused, exit])

  useEffect(() => {
    if (!focused) return undefined
    // الخروج من ملء الشاشة الحقيقي (Esc) يُنهي الوضع أيضاً.
    const onChange = () => {
      if (!document.fullscreenElement) setFocused(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') exit()
    }
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKey)
    }
  }, [focused, exit])

  useEffect(() => () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [])

  return [focused, toggle]
}

/** يُضاف لجذر العنصر في وضع ملء الشاشة. */
export const FOCUS_CLASS = 'fixed inset-0 z-[60] h-dvh'

export function FullscreenButton({ focused, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={focused ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
      aria-pressed={focused}
      title={focused ? 'الخروج من ملء الشاشة (Esc)' : 'ملء الشاشة'}
      className={`inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20 ${className}`}
    >
      <Icon name={focused ? 'minimize' : 'maximize'} size={20} />
    </button>
  )
}
