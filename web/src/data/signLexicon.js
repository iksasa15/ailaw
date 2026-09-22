import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'

/** مقطع فيديو إشارة تحت /signs/videos/ */
const S = (file, label) => ({
  src: `/signs/videos/${file}.mp4`,
  label,
  type: 'video',
})

/** حرف أبجدية لغة الإشارة */
const L = (file, label) => ({
  src: `/signs/alphabet/${file}.jpg`,
  label,
  type: 'letter',
})

/** تسلسل إشارات لكل عبارة محامي (1–10) — سيناريو حادث مروري */
export const LAWYER_SIGN_CLIPS = {
  1: [S('word-hello', 'السلام عليكم'), S('word-lawyer', 'أنا محاميك')],
  2: [S('word-ask', 'ماذا حدث'), S('lawyer-03b', 'بالضبط')],
  3: [S('word-where', 'أين'), S('lawyer-05', 'وقع الحادث')],
  4: [S('word-ask', 'هل لديك'), S('word-paper', 'تقرير شرطة')],
  5: [S('word-you', 'من كان'), S('lawyer-02', 'يقود السيارة')],
  6: [S('word-ask', 'هل أصيب'), S('word-you', 'أحد')],
  7: [S('word-protect', 'سنطالب'), S('word-case', 'بالتعويض')],
  8: [S('word-paper', 'أوراق'), S('lawyer-08', 'التأمين')],
  9: [S('word-no', 'لا تتحدث'), S('word-you', 'مع الطرف الآخر')],
  10: [S('word-follow', 'سأتابع'), S('word-case', 'القضية غداً')],
}

/** أبجدية عربية بلغة الإشارة (من لوحة الحروف) */
export const LETTER_SIGN_CLIPS = {
  أ: L('alef', 'أ'),
  ا: L('alef', 'ا'),
  إ: L('alef', 'إ'),
  آ: L('alef', 'آ'),
  ٱ: L('alef', 'ا'),
  ب: L('ba', 'ب'),
  ت: L('ta', 'ت'),
  ث: L('tha', 'ث'),
  ج: L('jeem', 'ج'),
  ح: L('ha', 'ح'),
  خ: L('kha', 'خ'),
  د: L('dal', 'د'),
  ذ: L('dhal', 'ذ'),
  ر: L('ra', 'ر'),
  ز: L('zay', 'ز'),
  س: L('seen', 'س'),
  ش: L('sheen', 'ش'),
  ص: L('sad', 'ص'),
  ض: L('dad', 'ض'),
  ط: L('tah', 'ط'),
  ظ: L('zah', 'ظ'),
  ع: L('ain', 'ع'),
  غ: L('ghain', 'غ'),
  ف: L('fa', 'ف'),
  ق: L('qaf', 'ق'),
  ك: L('kaf', 'ك'),
  ل: L('lam', 'ل'),
  م: L('meem', 'م'),
  ن: L('noon', 'ن'),
  ه: L('haa', 'ه'),
  ة: L('ta_marbuta', 'ة'),
  و: L('waw', 'و'),
  ؤ: L('waw', 'ؤ'),
  ي: L('ya', 'ي'),
  ى: L('ya', 'ى'),
  ئ: L('ya', 'ئ'),
  لا: L('la', 'لا'),
}

function normalize(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * تهجئة نص بأبجدية لغة الإشارة حرفاً حرفاً.
 * @returns {{ src: string, label: string, type: string }[]}
 */
export function fingerspellText(text, { maxLetters = 48 } = {}) {
  const raw = normalize(text)
  if (!raw) return []
  const clips = []
  const compact = raw.replace(/\s+/g, ' ')
  let i = 0
  while (i < compact.length && clips.length < maxLetters) {
    const ch = compact[i]
    if (ch === ' ') {
      i += 1
      continue
    }
    // digraph لا
    if (ch === 'ل' && compact[i + 1] === 'ا') {
      clips.push({ ...LETTER_SIGN_CLIPS.لا })
      i += 2
      continue
    }
    const mapped = LETTER_SIGN_CLIPS[ch]
    if (mapped) clips.push({ ...mapped })
    i += 1
  }
  return clips
}

/**
 * حوّل عبارة إلى تسلسل إشارات.
 * - داخل النص (1–10 / مطابقة عبارة): فيديوهات السيناريو
 * - خارج النص أو spellLetters: تهجئة أبجدية لغة الإشارة
 * @returns {{ src: string, label: string, type: string }[] | null}
 */
export function resolveSignClips(lawyerPhrase, { spellLetters = false } = {}) {
  if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null

  const raw = normalize(lawyerPhrase.text)

  // زر «حروف» يجبر التهجئة الأبجدية دائماً
  if (spellLetters) {
    const text = raw || (lawyerPhrase?.fingers ? String(lawyerPhrase.fingers) : '')
    const spelled = fingerspellText(text)
    return spelled.length ? spelled : null
  }

  const fingers = Number(lawyerPhrase.fingers)
  if (fingers >= 1 && fingers <= 10 && LAWYER_SIGN_CLIPS[fingers]) {
    return LAWYER_SIGN_CLIPS[fingers]
  }

  if (!raw) return null

  for (let i = 1; i <= 10; i += 1) {
    if (normalize(LAWYER_PHRASES[i]) === raw && LAWYER_SIGN_CLIPS[i]) {
      return LAWYER_SIGN_CLIPS[i]
    }
  }

  for (let i = 1; i <= 10; i += 1) {
    const p = normalize(LAWYER_PHRASES[i])
    // فقط إذا احتوى الكلام على العبارة كاملة (تجنّب مطابقة كلمات قصيرة)
    if (p && raw.includes(p) && LAWYER_SIGN_CLIPS[i]) {
      return LAWYER_SIGN_CLIPS[i]
    }
  }

  // خارج النص المكتوب → تهجئة إشارة حرفاً حرفاً
  const spelled = fingerspellText(raw)
  return spelled.length ? spelled : null
}
