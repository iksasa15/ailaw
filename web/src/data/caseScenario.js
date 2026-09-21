/**
 * سيناريو جديد: استشارة قضية حادث مروري بين محامٍ وموكّل.
 */
export const CASE_SCENARIO = [
  { role: 'lawyer', fingers: 1, text: 'السلام عليكم، أنا محاميك' },
  { role: 'person', fingers: 1, text: 'تعرضت لحادث سيارة' },
  { role: 'lawyer', fingers: 2, text: 'ماذا حدث بالضبط؟' },
  { role: 'person', fingers: 2, text: 'اصطدم بي من الخلف' },
  { role: 'lawyer', fingers: 3, text: 'أين وقع الحادث؟' },
  { role: 'person', fingers: 3, text: 'الحادث عند الإشارة' },
  { role: 'lawyer', fingers: 4, text: 'هل لديك تقرير شرطة؟' },
  { role: 'person', fingers: 4, text: 'معي تقرير المرور' },
  { role: 'lawyer', fingers: 5, text: 'من كان يقود السيارة؟' },
  { role: 'person', fingers: 5, text: 'أنا كنت أقود' },
  { role: 'lawyer', fingers: 6, text: 'هل أصيب أحد؟' },
  { role: 'person', fingers: 6, text: 'أصبت في رقبتي' },
  { role: 'lawyer', fingers: 7, text: 'سنطالب بالتعويض' },
  { role: 'person', fingers: 7, text: 'أريد تعويضاً عادلاً' },
  { role: 'lawyer', fingers: 8, text: 'أحضر أوراق التأمين' },
  { role: 'person', fingers: 8, text: 'التأمين رفض الدفع' },
  { role: 'lawyer', fingers: 9, text: 'لا تتحدث مع الطرف الآخر' },
  { role: 'person', fingers: 9, text: 'الطرف الآخر يهددني' },
  { role: 'lawyer', fingers: 10, text: 'سأتابع القضية غداً' },
  { role: 'person', fingers: 10, text: 'أعتمد عليك' },
]

export const SCENARIO_TITLE = 'جلسة حادث مروري'
export const SCENARIO_SUBTITLE =
  'سيناريو جديد: محامٍ يستمع لموكّل تعرّض لحادث ويطلب تعويضاً'
