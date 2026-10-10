import { LAWYER_PHRASES, PERSON_PHRASES } from '../hooks/useFingerPhrases'

/** حروف أبجدية الإشارة بالترتيب، مع ملف الصورة في /signs/alphabet. */
const LETTERS = [
  ['أ', 'alef'], ['ب', 'ba'], ['ت', 'ta'], ['ث', 'tha'], ['ج', 'jeem'], ['ح', 'ha'], ['خ', 'kha'],
  ['د', 'dal'], ['ذ', 'dhal'], ['ر', 'ra'], ['ز', 'zay'], ['س', 'seen'], ['ش', 'sheen'], ['ص', 'sad'],
  ['ض', 'dad'], ['ط', 'tah'], ['ظ', 'zah'], ['ع', 'ain'], ['غ', 'ghain'], ['ف', 'fa'], ['ق', 'qaf'],
  ['ك', 'kaf'], ['ل', 'lam'], ['م', 'meem'], ['ن', 'noon'], ['ه', 'haa'], ['و', 'waw'], ['ي', 'ya'],
  ['ة', 'ta_marbuta'], ['لا', 'la'],
]

/** الحروف التي يتعرف عليها المتصفح (useAlphabetSign) — لها تدريب بالكاميرا. */
export const CAMERA_LETTERS = new Set(['أ', 'ب', 'ت', 'ث', 'د', 'ر', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ل', 'لا', 'م', 'ن', 'ي'])

const WORDS = [
  ['salam', 'السلام عليكم', 'تحية بداية الجلسة.'],
  ['shukran', 'شكراً', 'للشكر في نهاية الحديث.'],
  ['musaada', 'مساعدة', 'لطلب المساعدة أو الدعم.'],
  ['huna', 'هنا', 'للإشارة إلى مكان قريب.'],
  ['qalaq', 'قلق', 'للتعبير عن القلق.'],
  ['murtabik', 'مرتبك', 'عندما لا تفهم أو تحتاج الإعادة.'],
  ['hub', 'حب', 'للتعبير عن المودة.'],
  ['yanam', 'ينام', 'فعل النوم.'],
  ['yaskut', 'يسكت', 'طلب الهدوء أو التوقف عن الكلام.'],
  ['yudakhin', 'يدخن', 'فعل التدخين.'],
]

const LENS_LESSONS = [
  ['start', 'تشغيل العدسة', 'من القائمة اختر «العدسة» واسمح للكاميرا والمايك. ضع يدك أمام الكاميرا حتى تظهر «يد متثبتة».'],
  ['receive', 'الاستقبال: كلام ← نص وإشارة', 'فعّل «استقبال». ما يقوله المحامي يظهر نصاً أسفل الشاشة، ويترجمه «مترجم الإشارة» إلى فيديوهات إشارة.'],
  ['send', 'الإرسال: أصابع ← صوت', 'فعّل «إرسال» وارفع عدد الأصابع (1–10) وثبّتها. العدسة تنطق عبارة الدور الحالي (محامٍ أو شخص) بصوت واضح.'],
  ['letters', 'الكتابة بالحروف', 'فعّل «حروف» وثبّت شكل الحرف حتى تمتلئ الدائرة فيُكتب. استخدم المسافة والحذف ثم «إرسال» لينطق النص.'],
]

export const COURSES = [
  {
    id: 'letters',
    title: 'الحروف العربية',
    description: 'أبجدية لغة الإشارة حرفاً حرفاً، مع تدريب بالكاميرا لـ17 حرفاً.',
    icon: 'hand',
    lessons: LETTERS.map(([letter, file]) => ({
      id: file,
      title: `حرف ${letter}`,
      symbol: letter,
      image: `/signs/alphabet/${file}.jpg`,
      text: CAMERA_LETTERS.has(letter)
        ? 'شكّل يدك مثل الصورة أمام الكاميرا وثبّتها ثانية ونصف.'
        : 'انظر للصورة وقلّد شكل اليد، ثم اضغط «أتقنته».',
      practice: CAMERA_LETTERS.has(letter) ? { kind: 'letter', target: letter } : null,
    })),
  },
  {
    id: 'words',
    title: 'كلمات ArSL العشر',
    description: 'أهم الكلمات اليومية في لغة الإشارة العربية.',
    icon: 'sparkles',
    lessons: WORDS.map(([file, word, text]) => ({
      id: file,
      title: word,
      symbol: word,
      image: `/gestures/${file}.png`,
      text: `${text} انظر للصورة وقلّد الحركة، ثم اضغط «أتقنته».`,
      practice: null,
    })),
  },
  {
    id: 'phrases',
    title: 'عبارات القضية بالأصابع',
    description: 'من 1 إلى 10: كل عدد أصابع يعني عبارة للمحامي وعبارة للشخص.',
    icon: 'message',
    lessons: Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
      id: `f${n}`,
      title: `${n} ${n === 1 ? 'إصبع' : n === 2 ? 'إصبعان' : n <= 10 ? 'أصابع' : ''}`,
      symbol: String(n),
      phrases: { person: PERSON_PHRASES[n], lawyer: LAWYER_PHRASES[n] },
      text: n > 5 ? `ارفع ${n} أصابع باليدين معاً وثبّتها ثانية ونصف.` : `ارفع ${n} ${n <= 2 ? 'إصبع' : 'أصابع'} وثبّتها ثانية ونصف.`,
      practice: { kind: 'fingers', target: n },
    })),
  },
  {
    id: 'lens',
    title: 'استخدام العدسة',
    description: 'كيف تستقبل كلام المحامي وترسل إشارتك صوتاً.',
    icon: 'glasses',
    lessons: LENS_LESSONS.map(([id, title, text], i) => ({ id, title, symbol: String(i + 1), text, practice: null })),
  },
]

export const courseById = (id) => COURSES.find((c) => c.id === id) || null
