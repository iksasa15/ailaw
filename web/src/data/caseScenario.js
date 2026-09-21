/**
 * سيناريو واقعي: استشارة قضية بين محامٍ وموكّل.
 * النص مطابق لجدول العبارات الحقيقي (محامي ↔ شخص).
 */
export const CASE_SCENARIO = [
  { role: 'lawyer', fingers: 1, text: 'أنا محاميك، تفضّل' },
  { role: 'person', fingers: 1, text: 'عندي قضية' },
  { role: 'lawyer', fingers: 2, text: 'ما تفاصيل القضية؟' },
  { role: 'person', fingers: 2, text: 'اتُهمت ظلماً' },
  { role: 'lawyer', fingers: 3, text: 'متى حدث ذلك؟' },
  { role: 'person', fingers: 3, text: 'حدث ذلك الأسبوع الماضي' },
  { role: 'lawyer', fingers: 4, text: 'هل لديك شهود؟' },
  { role: 'person', fingers: 4, text: 'لدي شهود' },
  { role: 'lawyer', fingers: 5, text: 'أين الدليل؟' },
  { role: 'person', fingers: 5, text: 'عندي دليل صورة' },
  { role: 'lawyer', fingers: 6, text: 'سأراجع أوراقك' },
  { role: 'person', fingers: 6, text: 'أحتاج محامياً' },
  { role: 'lawyer', fingers: 7, text: 'لا تخف، سأدافع عنك' },
  { role: 'person', fingers: 7, text: 'أنا خائف من النتيجة' },
  { role: 'lawyer', fingers: 8, text: 'نحتاج مستندات إضافية' },
  { role: 'person', fingers: 8, text: 'لم أفعل شيئاً خطأ' },
  { role: 'lawyer', fingers: 9, text: 'وقّع التوكيل من فضلك' },
  { role: 'person', fingers: 9, text: 'ساعدني من فضلك' },
  { role: 'lawyer', fingers: 10, text: 'القضية تحت المتابعة' },
  { role: 'person', fingers: 10, text: 'شكراً لك' },
]

export const SCENARIO_TITLE = 'جلسة استشارة قضية'
export const SCENARIO_SUBTITLE =
  'حوار حقيقي متبادل بين المحامي والشخص — نفس عبارات الأصابع 1 إلى 10'
