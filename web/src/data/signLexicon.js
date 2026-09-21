import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'

const S = (file, label) => ({ src: `/signs/${file}.svg`, label })

/** تسلسل إشارات لكل عبارة محامي (1–10) — صور إشارة وليس أرقام أصابع */
export const LAWYER_SIGN_CLIPS = {
  1: [S('lawyer-01', 'أنا محاميك'), S('lawyer-01b', 'تفضّل')],
  2: [S('lawyer-02b', 'اسأل'), S('lawyer-02', 'تفاصيل القضية')],
  3: [S('lawyer-03', 'متى'), S('lawyer-03b', 'حدث')],
  4: [S('lawyer-04b', 'هل لديك'), S('lawyer-04', 'شهود')],
  5: [S('lawyer-05', 'أين الدليل'), S('lawyer-05b', 'دليل')],
  6: [S('lawyer-06', 'أراجع أوراقك'), S('lawyer-06b', 'أوراق')],
  7: [S('lawyer-07', 'لا تخف'), S('lawyer-07b', 'أدافع عنك')],
  8: [S('lawyer-08b', 'نحتاج'), S('lawyer-08', 'مستندات')],
  9: [S('lawyer-09', 'وقّع'), S('lawyer-09b', 'من فضلك')],
  10: [S('lawyer-10b', 'القضية'), S('lawyer-10', 'متابعة')],
}

/** كلمات شائعة → إشارة مرئية */
export const WORD_SIGN_CLIPS = {
  أنا: S('word-ana', 'أنا'),
  محامي: S('word-lawyer', 'محامي'),
  محاميك: S('word-lawyer', 'محاميك'),
  تفضل: S('word-please', 'تفضّل'),
  تفضّل: S('word-please', 'تفضّل'),
  اسأل: S('word-ask', 'اسأل'),
  تفاصيل: S('lawyer-02', 'تفاصيل'),
  قضية: S('word-case', 'قضية'),
  القضية: S('word-case', 'قضية'),
  متى: S('word-when', 'متى'),
  حدث: S('lawyer-03b', 'حدث'),
  هل: S('word-ask', 'هل'),
  لديك: S('word-you', 'لديك'),
  شهود: S('word-witness', 'شهود'),
  أين: S('word-where', 'أين'),
  الدليل: S('word-evidence', 'دليل'),
  دليل: S('word-evidence', 'دليل'),
  سأراجع: S('lawyer-06', 'أراجع'),
  أوراقك: S('word-paper', 'أوراق'),
  أوراق: S('word-paper', 'أوراق'),
  مستندات: S('word-paper', 'مستندات'),
  لا: S('word-no', 'لا'),
  تخف: S('word-protect', 'لا تخف'),
  سأدافع: S('word-protect', 'أدافع'),
  عنك: S('word-you', 'عنك'),
  نحتاج: S('word-help', 'نحتاج'),
  إضافية: S('word-paper', 'إضافية'),
  وقع: S('word-write', 'وقّع'),
  وقّع: S('word-write', 'وقّع'),
  التوكيل: S('word-write', 'توكيل'),
  فضلك: S('word-please', 'من فضلك'),
  المتابعة: S('word-follow', 'متابعة'),
  متابعة: S('word-follow', 'متابعة'),
  مرحبا: S('word-hello', 'مرحبا'),
  مرحباً: S('word-hello', 'مرحبا'),
  السلام: S('word-hello', 'سلام'),
  عليكم: S('word-you', 'عليكم'),
  شكرا: S('word-thank', 'شكراً'),
  شكراً: S('word-thank', 'شكراً'),
  مساعدة: S('word-help', 'مساعدة'),
  ساعدني: S('word-help', 'ساعدني'),
  نعم: S('word-yes', 'نعم'),
  أهلا: S('word-hello', 'أهلاً'),
  أهلاً: S('word-hello', 'أهلاً'),
}

const UNKNOWN = S('word-unknown', 'كلمة')

function normalize(text) {
  return String(text || '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * حوّل عبارة المحامي إلى تسلسل إشارات مرئية (صور).
 * @returns {{ src: string, label: string }[] | null}
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
