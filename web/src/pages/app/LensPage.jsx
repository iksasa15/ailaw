import Home from '../Home'
import { FOCUS_CLASS, FullscreenButton, useFocusMode } from '../../components/platform/FullscreenButton'

/** العدسة داخل المنصة (بلا خادم) مع زر ملء الشاشة. */
export default function LensPage() {
  const [focused, toggleFocus] = useFocusMode()
  return (
    <div className={`${focused ? FOCUS_CLASS : 'relative h-full'} bg-black`}>
      <Home serverless />
      <FullscreenButton focused={focused} onToggle={toggleFocus} className="absolute bottom-4 start-4 z-40" />
    </div>
  )
}
