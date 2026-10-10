# كلام المحامي ← لغة الإشارة في المنصة — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** كلام المحامي في جلسة المنصة يُعرض للأصم بلغة الإشارة في لوحة كبيرة — جملةً جملة، بلا تكرار ولا قطع — على اللابتوب وعلى الجوال المرتبط بالـQR.

**Architecture:** ثلاث وحدات صافية مُختبرة في `web/src/platform/` (محرك الترجمة، طابور العرض، مخزن الكلام)، وقاموس بيانات في `web/src/data/`، ومكوّن عرض `SignTranslator`، ثم توصيلها في `Home` (العدسة) و`SessionRoom` و`JoinSession`. لا خادم ولا مكتبات جديدة.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Vitest 3 (بيئة node), oxlint.

**Spec:** `docs/superpowers/specs/2026-10-10-lawyer-speech-to-sign-design.md`

## Global Constraints

- الموقع فقط (`web/`). لا تغيير على `backend/` ولا تطبيق الآيفون. **بلا مكتبات جديدة.**
- العربية فقط، RTL، خط Thmanyah، ألوان الهوية: لوحة `#0b1630`، أزرق `#136fb0`، برتقالي `#f9bd29`.
- المدد: `STEP_MS = { letter: 800, word: 1200, videoMax: 4000, gap: 400 }`؛ `MAX_PENDING = 3`؛ سكون الجملة `pauseMs = 800`؛ التهجئة للكلمة المجهولة ≤ 4 حروف.
- العدسة الحرة `/app/lens` تبقى بمربعها الصغير؛ المنصة (`SessionRoom`, `JoinSession`) تخفيه.
- الأوامر (من جذر المستودع): الاختبار `npm --prefix web test`، البناء `npm --prefix web run build`، الفحص `npm --prefix web run lint` (لا أخطاء جديدة).
- الاختبارات الحالية (66) تبقى خضراء.
- كل commit ينتهي بـ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## قرارات فوق المواصفات (تفاصيل لم تحددها، لا تخالفها)

- `Step` يحمل `span` (عدد الكلمات التي تغطيها الخطوة) بجانب `token`، لتمييز «من فضلك» كاملة.
- الصيغ المحذوفة السوابق/اللواحق لا تُقبل إلا إذا بقي الجذر **3 حروف فأكثر** (يمنع «كما» ← «ما» = إشارة السؤال).
- `resolveSignClips` ينتقل من `data/signLexicon.js` إلى `platform/signTranslate.js` (بنفس التوقيع) لتفادي استيراد دائري؛ `signLexicon.js` يبقى للبيانات و`fingerspellText`.
- مخزن الكلام يقطع الجملة أيضاً عند **12 كلمة** دون انتظار السكون (مونولوج طويل لا يتأخر).
- `removeEcho` في `platform/logic.js`: يحذف صدى صوت اللابتوب من جملة المحامي ويُبقي كلامه بعده.
- عند الكتابة بدور «المحامي» تصير الردود السريعة هي جمل السيناريو العشر (`LAWYER_PHRASES`).

## Review Focus

- المحامي يتكلم طويلاً بلا توقف ← الجملة تُقطع كل 12 كلمة والترجمة تبدأ فوراً (اختبار في Task 3: `a long monologue is cut every 12 words`).
- المحامي يبدأ الكلام فور نطق اللابتوب ردَّ الشخص ← يُحذف الصدى ويبقى كلام المحامي (اختبار في Task 4: `removeEcho`).
- متصفح بلا تعرّف صوتي (Firefox) أو مايك مرفوض ← حالة واضحة، والكتابة تعمل (اختبار في Task 3: `speechStateOf`).
- سطر في القاموس بلا ملف فيديو ← يكشفه اختبار (Task 1: `every vocabulary clip exists on disk`)، وفي التشغيل تظهر الكلمة مكتوبة وتمضي اللوحة (فحص يدوي في Task 4).
- الجوال ينضم متأخراً والمحادثة فيها جمل كثيرة ← يبدأ المترجم من الأحدث ولا يعيد التاريخ (اختبار في Task 2: `five sentences at once start at the newest`).

---

## File Structure

```
web/src/data/signVocabulary.js        (جديد) القاموس: SIGN_VOCABULARY
web/src/data/signLexicon.js           (تعديل) يُحذف منه resolveSignClips
web/src/platform/signTranslate.js     (جديد) translateToSigns, resolveSignClips, STEP_MS
web/src/platform/signQueue.js         (جديد) طابور العرض
web/src/platform/speechBuffer.js      (جديد) createSpeechBuffer, speechStateOf
web/src/platform/logic.js             (تعديل) removeEcho
web/src/hooks/useBrowserStt.js        (تعديل) يكشف final
web/src/hooks/useSttSocket.js         (تعديل) يكشف final
web/src/pages/Home.jsx                (تعديل) المخزن، onSpeechState، hideSignCoach
web/src/components/platform/SignTranslator.jsx  (جديد) لوحة المترجم
web/src/components/overlay/SignCoachAvatar.jsx  (تعديل) الاستيراد + نوع word
web/src/components/platform/SignPlayer.jsx      (تعديل) الاستيراد + نوع word
web/src/pages/app/SessionRoom.jsx     (تعديل) التخطيط، مفتاح الدور، removeEcho
web/src/pages/public/JoinSession.jsx  (تعديل) المترجم على جوال الأصم
DEMO_SCRIPT.md                        (تعديل) قسم «كلام المحامي بالإشارة»
```

---

### Task 1: القاموس ومحرك الترجمة

**Files:**
- Create: `web/src/data/signVocabulary.js`, `web/src/platform/signTranslate.js`
- Modify: `web/src/data/signLexicon.js` (حذف `resolveSignClips` و`normalize` إن لم يعد مستعملاً)، `web/src/components/overlay/SignCoachAvatar.jsx`، `web/src/components/platform/SignPlayer.jsx`
- Test: `web/src/platform/signTranslate.test.js`

**Interfaces:**
- Consumes: `LAWYER_SIGN_CLIPS`, `LETTER_SIGN_CLIPS`, `fingerspellText` من `data/signLexicon.js`؛ `LAWYER_PHRASES` من `hooks/useFingerPhrases.js`.
- Produces:
  - `SIGN_VOCABULARY: { clip: string, label: string, words: string[] }[]`
  - `translateToSigns(text: string) → { tokens: string[], steps: Step[] }`
  - `Step = { kind: 'video'|'letter', src, label, token, span } | { kind: 'word', label, token, span }` — `token` فهرس أول كلمة أو `null` لجملة سيناريو (`span: 0`).
  - `resolveSignClips(phrase: {text?, fingers?} | null, { spellLetters = false } = {}) → { src?, label, type: 'video'|'letter'|'word' }[] | null`
  - `STEP_MS = { letter: 800, word: 1200, videoMax: 4000, gap: 400 }`

- [ ] **Step 1: اكتب الاختبار الفاشل** `web/src/platform/signTranslate.test.js`

```js
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { resolveSignClips, STEP_MS, translateToSigns } from './signTranslate'
import { SIGN_VOCABULARY } from '../data/signVocabulary'

const V = (clip) => `/signs/videos/${clip}.mp4`
const kinds = (r) => r.steps.map((s) => s.kind)
const srcs = (r) => r.steps.filter((s) => s.kind === 'video').map((s) => s.src)
const labels = (r) => r.steps.map((s) => s.label)

describe('scenario sentences', () => {
  test('a full scenario sentence plays its sentence clips', () => {
    const r = translateToSigns('السلام عليكم، أنا محاميك')
    expect(srcs(r)).toEqual([V('word-hello'), V('word-lawyer')])
    expect(r.steps.every((s) => s.token === null)).toBe(true)
  })
  test('diacritics, and a scenario sentence inside longer speech', () => {
    expect(srcs(translateToSigns('سأتابعُ القضيةَ غداً'))).toEqual([V('word-follow'), V('word-case')])
    expect(srcs(translateToSigns('طيب، هل لديك تقرير شرطة؟ أخبرني'))).toEqual([V('word-ask'), V('word-paper')])
  })
})

describe('word by word', () => {
  test('the spec example: card, sign, then spelling', () => {
    const r = translateToSigns('نحتاج الأوراق يوم الأحد')
    expect(r.tokens).toEqual(['نحتاج', 'الأوراق', 'يوم', 'الأحد'])
    expect(kinds(r)).toEqual(['word', 'video', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter'])
    expect(labels(r)).toEqual(['نحتاج', 'ورقة', 'ي', 'و', 'م', 'ا', 'ح', 'د'])
    expect(r.steps.map((s) => s.token)).toEqual([0, 1, 2, 2, 2, 3, 3, 3])
  })
  test('prefixes and suffixes are stripped for lookup', () => {
    expect(srcs(translateToSigns('والأوراق'))).toEqual([V('word-paper')])
    expect(srcs(translateToSigns('قضيتك'))).toEqual([V('word-case')])
    expect(srcs(translateToSigns('محاميكم'))).toEqual([V('word-lawyer')])
  })
  test('a stripped stem shorter than 3 letters is not a match', () => {
    expect(labels(translateToSigns('كما'))).toEqual(['ك', 'م', 'ا'])
  })
  test('a two-word phrase wins over its particle', () => {
    const r = translateToSigns('من فضلك اكتب')
    expect(srcs(r)).toEqual([V('word-please'), V('word-write')])
    expect(r.steps.map((s) => [s.token, s.span])).toEqual([[0, 2], [2, 1]])
  })
  test('particles are skipped in signs but kept in tokens', () => {
    const r = translateToSigns('في القضية')
    expect(r.tokens).toEqual(['في', 'القضية'])
    expect(r.steps.map((s) => [s.kind, s.token])).toEqual([['video', 1]])
    expect(translateToSigns('في على').steps).toEqual([])
  })
  test('short unknown words are spelled, لا counts as one letter', () => {
    expect(labels(translateToSigns('علاج'))).toEqual(['ع', 'لا', 'ج'])
  })
  test('longer unknown words and numbers become a written card', () => {
    expect(translateToSigns('المستشفى').steps).toEqual([{ kind: 'word', label: 'المستشفى', token: 0, span: 1 }])
    expect(kinds(translateToSigns('2025 ٢٠٢٥'))).toEqual(['word', 'word'])
  })
  test('empty input', () => {
    expect(translateToSigns('')).toEqual({ tokens: [], steps: [] })
    expect(translateToSigns('  ،،  ').steps).toEqual([])
  })
})

describe('resolveSignClips (lens and record)', () => {
  test('a finger count picks the scenario clips', () => {
    expect(resolveSignClips({ fingers: 4 }).map((c) => c.src)).toEqual([V('word-ask'), V('word-paper')])
  })
  test('spellLetters spells everything', () => {
    expect(resolveSignClips({ text: 'سلام' }, { spellLetters: true }).map((c) => c.label)).toEqual(['س', 'لا', 'م'])
  })
  test('free text uses the engine; written cards have type word', () => {
    expect(resolveSignClips({ text: 'نحتاج الأوراق' }).map((c) => c.type)).toEqual(['word', 'video'])
  })
  test('nothing to sign → null', () => {
    expect(resolveSignClips({ text: 'في' })).toBeNull()
    expect(resolveSignClips(null)).toBeNull()
  })
})

test('every vocabulary clip exists on disk', () => {
  for (const { clip } of SIGN_VOCABULARY) {
    const file = fileURLToPath(new URL(`../../public/signs/videos/${clip}.mp4`, import.meta.url))
    expect(existsSync(file), clip).toBe(true)
  }
})

test('step durations', () => {
  expect(STEP_MS).toEqual({ letter: 800, word: 1200, videoMax: 4000, gap: 400 })
})
```

- [ ] **Step 2: شغّله ليفشل**

Run: `npm --prefix web test -- src/platform/signTranslate.test.js`
Expected: FAIL — `Failed to resolve import "./signTranslate"`.

- [ ] **Step 3: اكتب القاموس** `web/src/data/signVocabulary.js` — `export const SIGN_VOCABULARY` بجدول المواصفات (القسم 3) حرفياً، مع هذه العناوين (`label`):
  `word-hello` السلام عليكم · `word-ana` أنا · `word-you` أنت · `word-lawyer` محامي · `word-ask` سؤال · `word-where` أين · `word-when` متى · `word-case` قضية · `word-paper` ورقة · `word-evidence` دليل · `word-witness` شاهد · `word-help` مساعدة · `word-protect` حماية · `word-follow` متابعة · `word-write` اكتب · `word-please` من فضلك · `word-thank` شكراً · `word-yes` نعم · `word-no` لا.
  تعليق في رأس الملف: «إضافة إشارة: ضع `<clip>.mp4` في `public/signs/videos/` وأضف سطراً هنا».

- [ ] **Step 4: اكتب المحرك** `web/src/platform/signTranslate.js` وفق القسم 3 من المواصفات.
  - `normalizeWord`: حذف التشكيل والتطويل (`ـ`)، `أإآٱ ← ا`، `ة ← ه`، `ى ← ي`. الكلمات (`tokens`) = النص مقسوماً على المسافات، مع حذف علامات الترقيم من طرفي كل كلمة، وحذف الفارغ. الأرقام `[0-9٠-٩]` تبقى.
  - القاموس يُطبَّع مرة عند التحميل إلى `Map<string (كلمات مطبّعة بمسافة), entry>`.
  - المطابقة: نافذة 3 ثم 2 ثم 1 كلمة؛ للكلمة الواحدة الصيغ: كما هي ← بلا سابقة ← بلا لاحقة ← بلا الاثنين، مع بديل `ت ← ه` لآخر الجذر بعد حذف اللاحقة؛ الصيغ المحذوفة تُقبل فقط إن بقي الجذر ≥ 3 حروف. ترتيب السوابق: `وال بال فال كال لل ال و ف ب ل ك`؛ اللواحق: `كم هم ها ك ه ي`.
  - حروف الربط (القائمة في المواصفات) تُفحص **بعد** محاولة النافذة متعددة الكلمات.
  - التهجئة: الكلمة المطبّعة بلا `ال` أولها، إن كان طولها ≤ 4 ← `fingerspellText`؛ وإلا (أو كانت رقماً) ← `{ kind: 'word', label: الكلمة كما قيلت }`.
  - جملة السيناريو: النص المطبّع كاملاً يساوي أو يحتوي إحدى `LAWYER_PHRASES` المطبّعة ← خطوات `LAWYER_SIGN_CLIPS[i]` بـ `token: null, span: 0`.
  - `resolveSignClips`: نفس منطق `signLexicon.js` الحالي للأصابع و`spellLetters`، والنص الحر عبر `translateToSigns` مع `kind ← type`؛ `null` إن لم تكن خطوات.

- [ ] **Step 5: انقل المستهلكين** — `SignCoachAvatar.jsx` و`SignPlayer.jsx` يستوردان `resolveSignClips` من `../../platform/signTranslate`، ويعرضان `type === 'word'` كبطاقة: نص `label` بخط كبير أبيض على `#0b1630` (بلا `src`)، وتتقدّم بعد `STEP_MS.word` كما تتقدّم صور الحروف (`SignPlayer` يستعمل `STEP_MS.letter` بدل `LETTER_MS`). احذف `resolveSignClips` من `signLexicon.js`.

- [ ] **Step 6: شغّل الاختبارات والبناء**

Run: `npm --prefix web test && npm --prefix web run build`
Expected: كل الاختبارات تمر (66 + الجديدة)، والبناء ينجح.

- [ ] **Step 7: Commit**

```bash
git add web/src/data web/src/platform/signTranslate.js web/src/platform/signTranslate.test.js web/src/components/overlay/SignCoachAvatar.jsx web/src/components/platform/SignPlayer.jsx
git commit -m "feat(web): sign translation engine with a word vocabulary, spelling and written cards"
```

---

### Task 2: طابور العرض

**Files:**
- Create: `web/src/platform/signQueue.js`
- Test: `web/src/platform/signQueue.test.js`

**Interfaces:**
- Consumes: `translateToSigns` (Task 1).
- Produces:
  - `MAX_PENDING = 3`
  - `initialQueue = { items: [], current: -1, step: 0, done: false }` — `item = { id, text, tokens, steps }`
  - `enqueue(state, { id, text }) → state` · `advance(state) → state` · `skipToLatest(state) → state` · `replay(state) → state`
  - `pending(state) → number` · `currentStep(state) → { item, sign: Step, index: number } | null` (`index` = رقم الخطوة في الجملة)
  - كل دالة تعيد **الكائن نفسه** إن لم يتغير شيء.

- [ ] **Step 1: اكتب الاختبار الفاشل** `web/src/platform/signQueue.test.js`

```js
import { expect, test } from 'vitest'
import { advance, currentStep, enqueue, initialQueue, MAX_PENDING, pending, replay, skipToLatest } from './signQueue'

const S1 = { id: 'a', text: 'السلام عليكم، أنا محاميك' } // خطوتان
const S2 = { id: 'b', text: 'أين وقع الحادث؟' } // خطوتان
const S3 = { id: 'c', text: 'هل أصيب أحد؟' } // خطوتان
const S4 = { id: 'd', text: 'شكرا' } // خطوة
const S5 = { id: 'e', text: 'نعم' } // خطوة
const all = (...s) => s.reduce((q, x) => enqueue(q, x), initialQueue)

test('the first sentence starts at once', () => {
  const q = all(S1)
  expect(currentStep(q).item.id).toBe('a')
  expect([q.step, pending(q)]).toEqual([0, 0])
})
test('a new sentence waits — it never cuts the current one', () => {
  const q = all(S1, S2)
  expect(currentStep(q).item.id).toBe('a')
  expect(pending(q)).toBe(1)
})
test('advance walks steps, then sentences, then stops after the last', () => {
  let q = all(S1, S2)
  q = advance(q)
  expect([q.current, q.step]).toEqual([0, 1])
  q = advance(q)
  expect([q.current, q.step]).toEqual([1, 0])
  q = advance(advance(q))
  expect(q.done).toBe(true)
  expect(advance(q)).toBe(q)
})
test('a sentence after the end starts right away', () => {
  let q = advance(all(S4))
  expect(q.done).toBe(true)
  q = enqueue(q, S5)
  expect(currentStep(q).item.id).toBe('e')
  expect(q.done).toBe(false)
})
test('duplicate ids and sentences with nothing to sign are ignored', () => {
  const q = all(S1)
  expect(enqueue(q, S1)).toBe(q)
  expect(enqueue(q, { id: 'z', text: 'في على' })).toBe(q)
})
test(`more than ${MAX_PENDING} waiting jumps to the newest`, () => {
  let q = all(S1, S2, S3, S4)
  expect([q.current, pending(q)]).toEqual([0, 3])
  q = enqueue(q, S5)
  expect(currentStep(q).item.id).toBe('e')
  expect(pending(q)).toBe(0)
})
test('five sentences at once start at the newest (phone joins late)', () => {
  expect(currentStep(all(S1, S2, S3, S4, S5)).item.id).toBe('e')
})
test('skipToLatest and replay', () => {
  let q = skipToLatest(all(S1, S2))
  expect([q.current, q.step]).toEqual([1, 0])
  q = replay(advance(q))
  expect(q.step).toBe(0)
  expect(skipToLatest(initialQueue)).toBe(initialQueue)
  expect(replay(initialQueue)).toBe(initialQueue)
})
```

- [ ] **Step 2: شغّله ليفشل**

Run: `npm --prefix web test -- src/platform/signQueue.test.js`
Expected: FAIL — `Failed to resolve import "./signQueue"`.

- [ ] **Step 3: اكتب `signQueue.js`** بالدلالات أعلاه: `enqueue` يضيف ثم يبدأ الجملة إن كان `current === -1` أو `done`، ثم إن تجاوز `pending` القيمة `MAX_PENDING` ← `skipToLatest`. `advance` لا يفعل شيئاً إن كان `current === -1` أو `done`. `pending` = `current === -1 ? 0 : items.length - 1 - current`.

- [ ] **Step 4: شغّل الاختبارات**

Run: `npm --prefix web test`
Expected: الكل يمر.

- [ ] **Step 5: Commit**

```bash
git add web/src/platform/signQueue.js web/src/platform/signQueue.test.js
git commit -m "feat(web): sign display queue — in order, never cut, jump to newest past 3"
```

---

### Task 3: الكلام المتواصل في العدسة

**Files:**
- Create: `web/src/platform/speechBuffer.js`
- Modify: `web/src/hooks/useBrowserStt.js`, `web/src/hooks/useSttSocket.js`, `web/src/pages/Home.jsx`
- Test: `web/src/platform/speechBuffer.test.js`

**Interfaces:**
- Produces:
  - `createSpeechBuffer({ pauseMs = 800, maxWords = 12, onSentence }) → { push(text), flush(), cancel() }`
  - `speechStateOf({ receiveEnabled, supported, status }) → 'off' | 'unsupported' | 'error' | 'listening'` (بهذا الترتيب في الأولوية)
  - الخطافان يعيدان أيضاً `final: { id: number, text: string } | null`.
  - `Home` يقبل خاصيتين جديدتين: `hideSignCoach` (boolean)، `onSpeechState({ state, partial, error, retry })`.

- [ ] **Step 1: اكتب الاختبار الفاشل** `web/src/platform/speechBuffer.test.js`

```js
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createSpeechBuffer, speechStateOf } from './speechBuffer'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const collect = (opts) => {
  const out = []
  return { out, b: createSpeechBuffer({ ...opts, onSentence: (t) => out.push(t) }) }
}

test('chunks within the pause become one sentence, once', () => {
  const { out, b } = collect({ pauseMs: 800 })
  b.push('أين')
  vi.advanceTimersByTime(500)
  b.push('وقع الحادث')
  vi.advanceTimersByTime(799)
  expect(out).toEqual([])
  vi.advanceTimersByTime(1)
  expect(out).toEqual(['أين وقع الحادث'])
  vi.advanceTimersByTime(5000)
  expect(out).toEqual(['أين وقع الحادث'])
})
test('a long monologue is cut every 12 words without waiting for a pause', () => {
  const { out, b } = collect({})
  const words = 'ا ب ت ث ج ح خ د ذ ر ز س ش'.split(' ')
  b.push(words.slice(0, 10).join(' '))
  b.push(words.slice(10).join(' '))
  expect(out).toEqual([words.join(' ')])
  b.push('بعد')
  vi.advanceTimersByTime(800)
  expect(out).toEqual([words.join(' '), 'بعد'])
})
test('flush emits now, cancel drops, blank chunks are ignored', () => {
  const { out, b } = collect({})
  b.push('   ')
  vi.advanceTimersByTime(1000)
  expect(out).toEqual([])
  b.push('نعم')
  b.flush()
  expect(out).toEqual(['نعم'])
  b.push('لا')
  b.cancel()
  vi.advanceTimersByTime(1000)
  expect(out).toEqual(['نعم'])
})
test('speech state for the translator status line', () => {
  expect(speechStateOf({ receiveEnabled: false, supported: false, status: 'error' })).toBe('off')
  expect(speechStateOf({ receiveEnabled: true, supported: false, status: 'idle' })).toBe('unsupported')
  expect(speechStateOf({ receiveEnabled: true, supported: true, status: 'error' })).toBe('error')
  expect(speechStateOf({ receiveEnabled: true, supported: true, status: 'idle' })).toBe('listening')
})
```

- [ ] **Step 2: شغّله ليفشل**

Run: `npm --prefix web test -- src/platform/speechBuffer.test.js`
Expected: FAIL — `Failed to resolve import "./speechBuffer"`.

- [ ] **Step 3: اكتب `speechBuffer.js`** — كل `push` يعيد ضبط مؤقت السكون؛ عند بلوغ `maxWords` يُفرغ فوراً.

- [ ] **Step 4: شغّل الاختبار ليمر**

Run: `npm --prefix web test -- src/platform/speechBuffer.test.js`
Expected: PASS.

- [ ] **Step 5: الخطافان يكشفان `final`** — في `useBrowserStt` (عند `finalChunk`) وفي `useSttSocket` (عند `msg.type === 'final'`): `setFinal((f) => ({ id: (f?.id || 0) + 1, text }))`، ويُعاد `final`. `clearText` لا يغيّر `final`.

- [ ] **Step 6: `Home.jsx`**
  - احذف مسار «آخر 12 كلمة» (`lastPublishedSttRef` والـ effect حول السطر 333–382).
  - مخزن واحد في `useRef` (`createSpeechBuffer({ onSentence: (t) => sentenceRef.current(t) })`)، و`cancel()` عند التفكيك.
  - effect على `stt.final`: مفتاح `${useWs ? 'ws' : 'browser'}:${stt.final.id}` يُمرَّر مرة واحدة فقط؛ الشروط نفسها السابقة (`receiveEnabled` و`isLawyerTalking || isPersonListening`) ثم `push(stt.final.text)`.
  - `sentenceRef.current(text)` = ما كان يفعله الـ effect القديم: `setLocalLawyerPhrase({ fingers: null, text, at: Date.now() })`، `emitConversation('lawyer', text)`، والنشر للغرفة (`publishScenePhrase` ثم `sceneMarkRef.current?.()`) إن كانت الشاشة شاشة المحامي وليست `serverless`.
  - `onSpeechState`: effect على `[state, stt.partial, sttError]` يستدعي آخر قيمة للخاصية (عبر ref) بـ `{ state, partial: stt.partial, error: sttError, retry }`، حيث `state = speechStateOf({ receiveEnabled: settings.receiveEnabled, supported: backendWhisper || Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), status: sttStatus })`، و`retry` ثابتة (ref): `off` ← `update({ receiveEnabled: true })`، وغير ذلك ← `mic.start(); stt.start?.()`.
  - `SignCoachAvatar visible={!hideSignCoach && …الشرط الحالي}`.

- [ ] **Step 7: تحقّق**

Run: `npm --prefix web test && npm --prefix web run build && npm --prefix web run lint`
Expected: الكل يمر، البناء ينجح، لا أخطاء lint جديدة.
ثم في المتصفح (`/app/lens`): الصفحة تعمل والمربع الصغير ظاهر، ولا أخطاء في الـconsole. (المايك الحقيقي يُختبر على جهاز المستخدم.)

- [ ] **Step 8: Commit**

```bash
git add web/src/platform/speechBuffer.js web/src/platform/speechBuffer.test.js web/src/hooks/useBrowserStt.js web/src/hooks/useSttSocket.js web/src/pages/Home.jsx
git commit -m "fix(web): each spoken sentence is translated once — no more re-reading the last 12 words"
```

---

### Task 4: لوحة المترجم في جلسة اللابتوب

**Files:**
- Create: `web/src/components/platform/SignTranslator.jsx`
- Modify: `web/src/platform/logic.js`, `web/src/pages/app/SessionRoom.jsx`
- Test: `web/src/platform/logic.test.js` (إضافة)

**Interfaces:**
- Consumes: `initialQueue, enqueue, advance, skipToLatest, replay, pending, currentStep` (Task 2)؛ `STEP_MS` (Task 1)؛ `Home` بـ `hideSignCoach` و`onSpeechState` (Task 3).
- Produces:
  - `removeEcho(entries, entry) → entry | null` في `logic.js`
  - `<SignTranslator sentences={{ id, text }[]} status={{ state, partial, error, retry }}? compact? />`

- [ ] **Step 1: اكتب الاختبار الفاشل** — أضف `removeEcho` إلى قائمة الاستيراد الحالية من `./logic` في `web/src/platform/logic.test.js`، ثم:

```js
describe('removeEcho', () => {
  const said = { role: 'person', text: 'أحتاج مساعدة', at: 1000 }
  test('the laptop hearing its own voice is dropped', () => {
    expect(removeEcho([said], { role: 'lawyer', text: 'أحتاج مساعدة', at: 3000 })).toBeNull()
  })
  test('lawyer words right after the echo are kept, without the echo', () => {
    expect(removeEcho([said], { role: 'lawyer', text: 'أحتاج مساعدة حسناً سأساعدك الآن', at: 3000 }).text).toBe('حسناً سأساعدك الآن')
  })
  test('normal lawyer speech passes untouched', () => {
    const e = { role: 'lawyer', text: 'أين وقع الحادث', at: 3000 }
    expect(removeEcho([said], e)).toBe(e)
  })
})
```

- [ ] **Step 2: شغّله ليفشل**

Run: `npm --prefix web test -- src/platform/logic.test.js`
Expected: FAIL — `removeEcho is not a function`.

- [ ] **Step 3: `removeEcho`** في `logic.js`: إن لم يكن `isEcho(entries, entry)` ← `entry` نفسه. وإلا: ابحث في كلمات الجملة (مطبّعة كلمةً كلمة بـ `normalizeArabic`) عن كلمات عبارة الشخص المطابقة متتالية واحذفها من الكلمات الأصلية؛ إن بقي **كلمتان فأكثر** ← `{ ...entry, text: الباقي }`، وإلا `null`.

- [ ] **Step 4: شغّل الاختبار ليمر**

Run: `npm --prefix web test -- src/platform/logic.test.js`
Expected: PASS.

- [ ] **Step 5: `SignTranslator.jsx`** (القسم 6 من المواصفات)
  - `useReducer` على دوال الطابور (`enqueue | advance | skip | replay`)؛ effect على `sentences` يرسل `enqueue` لكل جملة (المكرر يُتجاهل).
  - المؤقتات على `[current, step, done]`: `letter` ← `STEP_MS.letter`، `word` ← `STEP_MS.word`، `video` ← `onEnded` أو `STEP_MS.videoMax` أيهما أسبق؛ فشل الفيديو (`onError`) ← بطاقة `label` ثم `STEP_MS.word`. آخر خطوة في الجملة تضيف `STEP_MS.gap`.
  - المسرح: فيديو (`autoPlay muted playsInline`)، أو حرف على أبيض، أو بطاقة كلمة. تحته `label` بالبرتقالي، ثم الجملة من `tokens` والكلمات `token…token+span-1` بخلفية برتقالية، ثم نقاط التقدّم، ثم زرا «إعادة» و«الأحدث» (+N بانتظار) — الأخير يظهر فقط حين `pending > 0`.
  - النصوص حرفياً: العنوان «مترجم الإشارة»؛ قبل أي كلام «سيظهر هنا كلام المحامي بالإشارة»؛ الحالة: `listening` «يستمع للمحامي» (+ `partial`)، `off` «الاستماع متوقف» + زر «تشغيل»، `error` نص `error` أو «تعذّر الوصول للمايك» + زر «تشغيل»، `unsupported` «هذا المتصفح لا يدعم الاستماع — استعمل Chrome أو Safari، أو اكتب بوضع المحامي».
  - `compact`: خطوط وأزرار أصغر، المسرح يملأ الارتفاع المتاح.

- [ ] **Step 6: `SessionRoom.jsx`**
  - `onConversation`: `removeEcho` بدل `isEcho` ثم `appendEntry`.
  - `showTranslator = !link || link.hostRole === 'person'`؛ `sentences` = مداخل المحامي `{ id: \`${e.at}:${e.text}\`, text }` (useMemo).
  - `speech` state من `onSpeechState`؛ يُمرَّر `status` للمترجم فقط حين `!link`.
  - `Home` يأخذ `hideSignCoach` دائماً هنا.
  - التخطيط: منطقة الكاميرا `flex flex-col` وعلى `lg` (`lg:grid lg:grid-cols-2` حين `showTranslator`): المترجم أولاً ثم الكاميرا. تحت `lg`: المترجم في قسم `max-h-[45%]` بشريط طيّ («مترجم الإشارة ▾/▴»، `lg:hidden`)؛ المطوي يبقى الشريط فقط. المترجم يُرسم **مرة واحدة** (التجاوب بالـCSS فقط) حتى لا يُعاد تركيبه.
  - مفتاح «أنا: الشخص / المحامي» (`speaker`, الافتراضي `person`) يظهر فقط حين `!link`. `say` يستعمل `role = link ? link.hostRole : speaker`؛ النطق فقط حين `role === 'person'`. العنوان: «اكتب وانطق» للشخص، «اكتب للشخص (يراه بالإشارة)» للمحامي. الردود السريعة: `QUICK_REPLIES` للشخص و`Object.values(LAWYER_PHRASES)` للمحامي.

- [ ] **Step 7: تحقّق في المتصفح** (`.claude/launch.json`، المنفذ 5175؛ حساب الأصم ← «جلساتي» ← ادخل جلسة اليوم)
  - المفتاح على «المحامي»، اكتب «نحتاج الأوراق يوم الأحد» ← بطاقة «نحتاج» ← إشارة «ورقة» ← تهجئة «يوم» و«احد»، والكلمة الحالية مميّزة؛ لا نطق؛ الجملة في المحادثة مرة واحدة.
  - ثلاث جمل سيناريو بسرعة ← تُعرض بالترتيب و«+N بانتظار» ظاهر؛ «الأحدث» يقفز.
  - غيّر مؤقتاً `src` إحدى الخطوات لملف غير موجود (من أدوات المتصفح بتعديل الـ DOM) ← تظهر الكلمة مكتوبة وتمضي اللوحة.
  - عرض الجوال (375px): المترجم بطاقة قابلة للطي فوق الكاميرا. ملء الشاشة يشمل المترجم.
  - لا أخطاء في الـconsole.

Run: `npm --prefix web test && npm --prefix web run build && npm --prefix web run lint`
Expected: الكل يمر.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/platform/SignTranslator.jsx web/src/platform/logic.js web/src/platform/logic.test.js web/src/pages/app/SessionRoom.jsx
git commit -m "feat(web): large sign translator panel in the session room, lawyer typing mode"
```

---

### Task 5: المترجم على جوال الأصم + سيناريو العرض

**Files:**
- Modify: `web/src/pages/public/JoinSession.jsx`, `DEMO_SCRIPT.md`

**Interfaces:**
- Consumes: `SignTranslator` (Task 4)؛ `Home` بـ `hideSignCoach` و`onConversation`.

- [ ] **Step 1: `JoinSession.jsx`** — حين `invite.role === 'person'`:
  - `sentences` state، و`onConversation` (useCallback) يضيف مداخل `role === 'lawyer'` كـ `{ id: \`${at}:${text}\`, text }`.
  - `main` يصير `flex flex-col`: `<SignTranslator compact sentences={sentences} />` في قسم `basis-[55%] shrink-0 min-h-0`، ثم `Home` (`hideSignCoach`, `onConversation`) في `relative min-h-0 flex-1`.
  - دور المحامي على الجوال لا يتغير.

- [ ] **Step 2: تحقّق بنافذتين** (يحتاج الخادم: `cd backend && PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000` في الخلفية)
  - اللابتوب: جلسة اليوم ← «ربط جهاز ثانٍ (QR)» ← هذا الحاسب «المحامي» ← «فتح الرابط في نافذة» (عرض 375px) ← «ابدأ الجلسة المرتبطة».
  - اكتب في اللابتوب «أين وقع الحادث؟» ثم «نحتاج الأوراق يوم الأحد» ← مترجم الجوال يعرضهما بالترتيب؛ المربع الصغير مخفي؛ المحادثة على اللابتوب فيها كل جملة مرة واحدة.
  - العكس: الحاسب «الشخص» ← ما يكتبه الجوال كمحامٍ يظهر في مترجم اللابتوب.
  - لا أخطاء في الـconsole في النافذتين.

- [ ] **Step 3: `DEMO_SCRIPT.md`** — قسم «كلام المحامي بالإشارة»: في الجلسة، مفتاح «أنا: المحامي» ثم جملة سيناريو (فيديو) وجملة حرة (بطاقة + إشارة + تهجئة)؛ المايك يحتاج Chrome أو Safari؛ إضافة إشارة = ملف في `web/public/signs/videos/` + سطر في `web/src/data/signVocabulary.js`.

- [ ] **Step 4: تحقّق أخير**

Run: `npm --prefix web test && npm --prefix web run build && npm --prefix web run lint`
Expected: الكل يمر.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/public/JoinSession.jsx DEMO_SCRIPT.md
git commit -m "feat(web): the deaf person's linked phone shows the lawyer's speech in sign language"
```
