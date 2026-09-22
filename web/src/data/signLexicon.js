import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'

/** مقطع فيديو إشارة حقيقية تحت /signs/videos/ */
const S = (file, label) => ({
  src: `/signs/videos/${file}.mp4`,
  label,
  type: 'video',
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

/** كلمات شائعة → فيديو إشارة */
export const WORD_SIGN_CLIPS = {
  أنا: S('word-ana', 'أنا'),
  محامي: S('word-lawyer', 'محامي'),
  محاميك: S('word-lawyer', 'محاميك'),
  السلام: S('word-hello', 'سلام'),
  عليكم: S('word-you', 'عليكم'),
  ماذا: S('word-ask', 'ماذا'),
  حدث: S('lawyer-03b', 'حدث'),
  بالضبط: S('word-ask', 'بالضبط'),
  أين: S('word-where', 'أين'),
  وقع: S('word-where', 'وقع'),
  الحادث: S('lawyer-05', 'الحادث'),
  هل: S('word-ask', 'هل'),
  لديك: S('word-you', 'لديك'),
  تقرير: S('word-paper', 'تقرير'),
  شرطة: S('word-paper', 'شرطة'),
  من: S('word-ask', 'من'),
  كان: S('word-you', 'كان'),
  يقود: S('lawyer-02', 'يقود'),
  السيارة: S('word-case', 'السيارة'),
  أصيب: S('word-help', 'أصيب'),
  أحد: S('word-you', 'أحد'),
  سنطالب: S('word-protect', 'سنطالب'),
  بالتعويض: S('word-case', 'تعويض'),
  أحضر: S('word-please', 'أحضر'),
  أوراق: S('word-paper', 'أوراق'),
  التأمين: S('word-paper', 'تأمين'),
  لا: S('word-no', 'لا'),
  تتحدث: S('word-no', 'تتحدث'),
  مع: S('word-you', 'مع'),
  الطرف: S('word-you', 'الطرف'),
  الآخر: S('word-you', 'الآخر'),
  سأتابع: S('word-follow', 'سأتابع'),
  القضية: S('word-case', 'قضية'),
  غداً: S('word-when', 'غداً'),
  غدا: S('word-when', 'غداً'),
  تعرضت: S('word-help', 'تعرضت'),
  لحادث: S('lawyer-05', 'حادث'),
  اصطدم: S('lawyer-03b', 'اصطدم'),
  بي: S('word-you', 'بي'),
  الخلف: S('word-where', 'الخلف'),
  عند: S('word-where', 'عند'),
  الإشارة: S('word-ask', 'الإشارة'),
  معي: S('word-you', 'معي'),
  المرور: S('word-paper', 'المرور'),
  كنت: S('word-ana', 'كنت'),
  أقود: S('lawyer-02', 'أقود'),
  أصبت: S('word-help', 'أصبت'),
  في: S('word-where', 'في'),
  رقبتي: S('word-help', 'رقبتي'),
  أريد: S('word-please', 'أريد'),
  تعويضاً: S('word-case', 'تعويض'),
  عادلاً: S('word-yes', 'عادلاً'),
  رفض: S('word-no', 'رفض'),
  الدفع: S('word-paper', 'الدفع'),
  يهددني: S('word-protect', 'يهددني'),
  أعتمد: S('word-thank', 'أعتمد'),
  عليك: S('word-you', 'عليك'),
  شكرا: S('word-thank', 'شكراً'),
  شكراً: S('word-thank', 'شكراً'),
  نعم: S('word-yes', 'نعم'),
  مرحبا: S('word-hello', 'مرحبا'),
  مرحباً: S('word-hello', 'مرحبا'),
}

const UNKNOWN = S('word-unknown', 'كلمة')

function normalize(text) {
  return String(text || '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * حوّل عبارة المحامي إلى تسلسل فيديوهات إشارة حقيقية.
 * @returns {{ src: string, label: string, type: string }[] | null}
 */
export function resolveSignClips(lawyerPhrase) {
  if (!lawyerPhrase?.text && !(lawyerPhrase?.fingers >= 1)) return null

  const fingers = Number(lawyerPhrase.fingers)
  if (fingers >= 1 && fingers <= 10 && LAWYER_SIGN_CLIPS[fingers]) {
    return LAWYER_SIGN_CLIPS[fingers]
  }

  const raw = normalize(lawyerPhrase.text)
  if (!raw) return null

  for (let i = 1; i <= 10; i += 1) {
    if (normalize(LAWYER_PHRASES[i]) === raw && LAWYER_SIGN_CLIPS[i]) {
      return LAWYER_SIGN_CLIPS[i]
    }
  }

  // partial phrase match
  for (let i = 1; i <= 10; i += 1) {
    const p = normalize(LAWYER_PHRASES[i])
    if (p && (raw.includes(p) || p.includes(raw)) && LAWYER_SIGN_CLIPS[i]) {
      return LAWYER_SIGN_CLIPS[i]
    }
  }

  const words = raw.split(' ').filter(Boolean).slice(0, 8)
  return words.map((w) => WORD_SIGN_CLIPS[w] || { ...UNKNOWN, label: w })
}
