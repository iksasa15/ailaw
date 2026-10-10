/**
 * خطوة واحدة في تدريب الدرس: القراءة المطابقة تبدأ/تكمل التثبيت، وغيرها يعيده للصفر.
 * `state = { since: number|null, progress: 0..1, done: boolean }`.
 */
export function practiceStep(state, reading, target, now, holdMs) {
  if (state.done) return state
  if (reading !== target || reading == null) return { since: null, progress: 0, done: false }
  const since = state.since ?? now
  const progress = Math.min(1, (now - since) / holdMs)
  return { since, progress, done: progress >= 1 }
}
