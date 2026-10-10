import { SIGN_VOCABULARY } from '../data/signVocabulary'
import { fingerspellText, LAWYER_SIGN_CLIPS } from '../data/signLexicon'
import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'

/** مدة (ms) كل خطوة في العرض، وفاصل بين الخطوات */
export const STEP_MS = { letter: 800, word: 1200, videoMax: 4000, gap: 400 }

/** حروف الربط: تُتخطّى في الإشارات وتبقى في النص (مطبّعة عند التحميل) */
const STOP_WORDS_RAW =
  'في من على الى عن ان او ثم قد لقد هذا هذه ذلك تلك الذي التي يا مع و'

const PREFIXES = ['وال', 'بال', 'فال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك']
const SUFFIXES = ['كم', 'هم', 'ها', 'ك', 'ه', 'ي']
/** أقل طول للجذر بعد حذف سابقة أو لاحقة */
const MIN_STEM = 3
/** أطول كلمة (بلا «ال») تُهجَّأ حرفاً حرفاً؛ ما فوقها بطاقة مكتوبة */
const MAX_SPELLED = 4
const MAX_WINDOW = 3

const HAS_DIGIT = /[0-9٠-٩]/
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu

/** تطبيع للبحث فقط: بلا تشكيل ولا تطويل، وتوحيد الهمزات والتاء المربوطة والألف المقصورة */
function normalizeWord(word) {
  return String(word || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
}

/** كلمات النص كما قيلت (بلا علامات الترقيم على الأطراف) مع صيغتها المطبّعة */
function tokenize(text) {
  return String(text ?? '')
    .split(/\s+/)
    .map((word) => word.replace(EDGE_PUNCTUATION, ''))
    .map((word) => ({ word, norm: normalizeWord(word) }))
    .filter((t) => t.norm)
}

const STOP_WORDS = new Set(STOP_WORDS_RAW.split(' ').map(normalizeWord))

/** القاموس مطبّعاً: «كلمات مطبّعة بمسافة» ← مدخل (الأول يغلب عند التكرار) */
const LEXICON = new Map()
for (const entry of SIGN_VOCABULARY) {
  for (const words of entry.words) {
    const key = words.split(/\s+/).map(normalizeWord).join(' ')
    if (!LEXICON.has(key)) LEXICON.set(key, entry)
  }
}

/** جمل السيناريو العشر مطبّعة، لمطابقتها داخل الكلام */
const SCENARIOS = Object.keys(LAWYER_PHRASES)
  .filter((n) => LAWYER_SIGN_CLIPS[n])
  .map((n) => ({
    n,
    key: tokenize(LAWYER_PHRASES[n])
      .map((t) => t.norm)
      .join(' '),
  }))

/** صيغ الجذر بعد حذف لاحقة واحدة (مع بديل ت ← ه لآخر الجذر) */
function suffixForms(stem) {
  const forms = []
  for (const suffix of SUFFIXES) {
    if (!stem.endsWith(suffix)) continue
    const root = stem.slice(0, -suffix.length)
    if (root.length < MIN_STEM) continue
    forms.push(root)
    if (root.endsWith('ت')) forms.push(`${root.slice(0, -1)}ه`)
  }
  return forms
}

/** كما هي ← بلا سابقة ← بلا لاحقة ← بلا الاثنين */
function candidateForms(norm) {
  const stems = PREFIXES.filter((p) => norm.startsWith(p))
    .map((p) => norm.slice(p.length))
    .filter((s) => s.length >= MIN_STEM)
  return [norm, ...stems, ...suffixForms(norm), ...stems.flatMap(suffixForms)]
}

function lookupWord(norm) {
  for (const form of candidateForms(norm)) {
    const entry = LEXICON.get(form)
    if (entry) return entry
  }
  return null
}

/** أطول نافذة (3 ثم 2 ثم 1 كلمة) من الموضع i تطابق القاموس، أو null */
function matchAt(tokens, i) {
  for (let size = Math.min(MAX_WINDOW, tokens.length - i); size >= 1; size -= 1) {
    const window = tokens.slice(i, i + size).map((t) => t.norm)
    if (size > 1) {
      const entry = LEXICON.get(window.join(' '))
      if (entry) return { entry, span: size }
    } else if (!STOP_WORDS.has(window[0])) {
      const entry = lookupWord(window[0])
      if (entry) return { entry, span: 1 }
    }
  }
  return null
}

const videoStep = (entry, token, span) => ({
  kind: 'video',
  src: `/signs/videos/${entry.clip}.mp4`,
  label: entry.label,
  token,
  span,
})

/** كلمة غير معروفة: تهجئة إن كانت قصيرة، وإلا بطاقة مكتوبة (والأرقام دائماً بطاقة) */
function unknownWordSteps({ word, norm }, token) {
  if (!HAS_DIGIT.test(norm)) {
    const bare = norm.startsWith('ال') && norm.length - 2 >= MIN_STEM ? norm.slice(2) : norm
    if (bare.length <= MAX_SPELLED) {
      const letters = fingerspellText(bare)
      if (letters.length) {
        return letters.map((l) => ({ kind: 'letter', src: l.src, label: l.label, token, span: 1 }))
      }
    }
  }
  return [{ kind: 'word', label: word, token, span: 1 }]
}

/** جملة سيناريو داخل الكلام (كاملة وعلى حدود الكلمات) ← خطواتها، وإلا null */
function scenarioSteps(tokens) {
  const speech = ` ${tokens.map((t) => t.norm).join(' ')} `
  const hit = SCENARIOS.find(({ key }) => key && speech.includes(` ${key} `))
  if (!hit) return null
  return LAWYER_SIGN_CLIPS[hit.n].map(({ src, label }) => ({ kind: 'video', src, label, token: null, span: 0 }))
}

/**
 * ترجمة كلام عربي إلى خطوات إشارة.
 * @param {string} text
 * @returns {{ tokens: string[], steps: Array<
 *   | { kind: 'video' | 'letter', src: string, label: string, token: number | null, span: number }
 *   | { kind: 'word', label: string, token: number | null, span: number }> }}
 */
export function translateToSigns(text) {
  const words = tokenize(text)
  const tokens = words.map((t) => t.word)
  if (!words.length) return { tokens, steps: [] }

  const scenario = scenarioSteps(words)
  if (scenario) return { tokens, steps: scenario }

  const steps = []
  let i = 0
  while (i < words.length) {
    const match = matchAt(words, i)
    if (match) {
      steps.push(videoStep(match.entry, i, match.span))
      i += match.span
    } else {
      if (!STOP_WORDS.has(words[i].norm)) steps.push(...unknownWordSteps(words[i], i))
      i += 1
    }
  }
  return { tokens, steps }
}

/**
 * حوّل عبارة إلى مقاطع إشارة للعدسة وعارض المحضر.
 * - `fingers` 1–10: فيديوهات السيناريو
 * - `spellLetters`: تهجئة كاملة بأبجدية لغة الإشارة
 * - غير ذلك: المحرك (فيديو للمعروف، تهجئة أو بطاقة لغيره)
 * @returns {{ src?: string, label: string, type: 'video' | 'letter' | 'word' }[] | null}
 */
export function resolveSignClips(lawyerPhrase, { spellLetters = false } = {}) {
  if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null

  // زر «حروف» يجبر التهجئة الأبجدية دائماً
  if (spellLetters) {
    const spelled = fingerspellText(lawyerPhrase.text || (lawyerPhrase.fingers ? String(lawyerPhrase.fingers) : ''))
    return spelled.length ? spelled : null
  }

  const fingers = Number(lawyerPhrase.fingers)
  if (fingers >= 1 && fingers <= 10 && LAWYER_SIGN_CLIPS[fingers]) {
    return LAWYER_SIGN_CLIPS[fingers]
  }

  const { steps } = translateToSigns(lawyerPhrase.text)
  if (!steps.length) return null
  return steps.map(({ kind, src, label }) => (src ? { src, label, type: kind } : { label, type: kind }))
}
