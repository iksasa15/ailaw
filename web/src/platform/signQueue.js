import { translateToSigns } from './signTranslate'

/** أكثر عدد جمل تنتظر بعد الحالية قبل القفز إلى الأحدث */
export const MAX_PENDING = 3

/** items: { id, text, tokens, steps }[] · current: رقم الجملة الحالية (-1 لا شيء) · step: خطوتها · done: انتهت آخر جملة */
export const initialQueue = { items: [], current: -1, step: 0, done: false }

/** عدد الجمل التي بعد الحالية */
export function pending(state) {
  return state.current === -1 ? 0 : state.items.length - 1 - state.current
}

/** الخطوة المعروضة الآن؛ تبقى آخر خطوة معروضة بعد `done`، و`null` قبل أي جملة */
export function currentStep(state) {
  if (state.current === -1) return null
  const item = state.items[state.current]
  return { item, sign: item.steps[state.step], index: state.step }
}

/** يقفز إلى أحدث جملة من خطوتها الأولى؛ لا شيء ينتظر ← الحالة نفسها */
export function skipToLatest(state) {
  if (pending(state) === 0) return state
  return { ...state, current: state.items.length - 1, step: 0, done: false }
}

/** الجملة الحالية من أولها */
export function replay(state) {
  if (state.current === -1 || (state.step === 0 && !state.done)) return state
  return { ...state, step: 0, done: false }
}

/** الخطوة التالية، ثم الجملة التالية؛ يقف بعد آخر خطوة */
export function advance(state) {
  if (state.current === -1 || state.done) return state
  if (state.step + 1 < state.items[state.current].steps.length) {
    return { ...state, step: state.step + 1 }
  }
  if (state.current + 1 < state.items.length) {
    return { ...state, current: state.current + 1, step: 0 }
  }
  return { ...state, done: true }
}

/** يضيف جملة (تُترجم هنا) دون أن يقطع الحالية؛ المكرر وما بلا إشارات ← الحالة نفسها */
export function enqueue(state, { id, text }) {
  if (state.items.some((item) => item.id === id)) return state
  const { tokens, steps } = translateToSigns(text)
  if (!steps.length) return state
  const items = [...state.items, { id, text, tokens, steps }]
  const next =
    state.current === -1 || state.done
      ? { items, current: items.length - 1, step: 0, done: false }
      : { ...state, items }
  return pending(next) > MAX_PENDING ? skipToLatest(next) : next
}
