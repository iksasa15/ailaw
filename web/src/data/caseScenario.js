import { LAWYER_PHRASES, PERSON_PHRASES } from '../hooks/useFingerPhrases'

/**
 * سيناريو واقعي: استشارة قضية بين محامٍ وموكّل (شخص أصم).
 * يتبادل الطرفان الأدوار بالتسلسل الطبيعي للجلسة.
 */
export const CASE_SCENARIO = [
  {
    role: 'lawyer',
    fingers: 1,
    text: LAWYER_PHRASES[1],
    note: 'افتتاح الجلسة والترحيب',
  },
  {
    role: 'person',
    fingers: 1,
    text: PERSON_PHRASES[1],
    note: 'الموكّل يوضح سبب الزيارة',
  },
  {
    role: 'lawyer',
    fingers: 2,
    text: LAWYER_PHRASES[2],
    note: 'طلب تفاصيل القضية',
  },
  {
    role: 'person',
    fingers: 2,
    text: PERSON_PHRASES[2],
    note: 'الموكّل يروي الاتهام',
  },
  {
    role: 'lawyer',
    fingers: 3,
    text: LAWYER_PHRASES[3],
    note: 'متى وقع الحادث؟',
  },
  {
    role: 'person',
    fingers: 3,
    text: PERSON_PHRASES[3],
    note: 'تحديد الزمن',
  },
  {
    role: 'lawyer',
    fingers: 4,
    text: LAWYER_PHRASES[4],
    note: 'الاستفسار عن الشهود',
  },
  {
    role: 'person',
    fingers: 4,
    text: PERSON_PHRASES[4],
    note: 'وجود شهود',
  },
  {
    role: 'lawyer',
    fingers: 5,
    text: LAWYER_PHRASES[5],
    note: 'طلب الدليل',
  },
  {
    role: 'person',
    fingers: 5,
    text: PERSON_PHRASES[5],
    note: 'دليل صورة',
  },
  {
    role: 'lawyer',
    fingers: 6,
    text: LAWYER_PHRASES[6],
    note: 'مراجعة الأوراق',
  },
  {
    role: 'person',
    fingers: 6,
    text: PERSON_PHRASES[6],
    note: 'طلب تمثيل قانوني',
  },
  {
    role: 'lawyer',
    fingers: 7,
    text: LAWYER_PHRASES[7],
    note: 'طمأنة الموكّل',
  },
  {
    role: 'person',
    fingers: 7,
    text: PERSON_PHRASES[7],
    note: 'القلق من النتيجة',
  },
  {
    role: 'lawyer',
    fingers: 8,
    text: LAWYER_PHRASES[8],
    note: 'طلب مستندات',
  },
  {
    role: 'person',
    fingers: 8,
    text: PERSON_PHRASES[8],
    note: 'نفي التهمة',
  },
  {
    role: 'lawyer',
    fingers: 9,
    text: LAWYER_PHRASES[9],
    note: 'توقيع التوكيل',
  },
  {
    role: 'person',
    fingers: 9,
    text: PERSON_PHRASES[9],
    note: 'طلب المساعدة',
  },
  {
    role: 'lawyer',
    fingers: 10,
    text: LAWYER_PHRASES[10],
    note: 'إغلاق: القضية قيد المتابعة',
  },
  {
    role: 'person',
    fingers: 10,
    text: PERSON_PHRASES[10],
    note: 'شكر المحامي',
  },
]

export const SCENARIO_TITLE = 'جلسة استشارة قضية'
export const SCENARIO_SUBTITLE =
  'حوار واقعي متبادل: المحامي يتكلم ← يظهر بالإشارة للموكّل، والموكّل يرد بالإصبع ← يُنطق للمحامي'
