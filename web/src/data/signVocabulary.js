// قاموس الإشارات: كل مدخل = فيديو إشارة + الكلمات والعبارات (كلمة إلى 3 كلمات) التي تُعرض به.
// الكلمات تُكتب طبيعية؛ المحرك (platform/signTranslate.js) يطبّعها عند التحميل.
// إضافة إشارة: ضع `<clip>.mp4` في `public/signs/videos/` وأضف سطراً هنا.

/**
 * @typedef {{ clip: string, label: string, words: string[] }} SignVocabularyEntry
 * clip: اسم الملف تحت /signs/videos/ بلا امتداد · label: ما يُكتب تحت الفيديو
 */

/** @type {SignVocabularyEntry[]} */
export const SIGN_VOCABULARY = [
  { clip: 'word-hello', label: 'السلام عليكم', words: ['السلام', 'سلام', 'السلام عليكم', 'مرحبا', 'أهلا', 'هلا'] },
  { clip: 'word-ana', label: 'أنا', words: ['أنا'] },
  { clip: 'word-you', label: 'أنت', words: ['أنت', 'أنتي', 'أنتم', 'لك'] },
  { clip: 'word-lawyer', label: 'محامي', words: ['محامي', 'محاميك', 'المحامي', 'محاماة'] },
  { clip: 'word-ask', label: 'سؤال', words: ['هل', 'ماذا', 'ما', 'سؤال', 'اسأل', 'سأل'] },
  { clip: 'word-where', label: 'أين', words: ['أين', 'وين'] },
  { clip: 'word-when', label: 'متى', words: ['متى'] },
  { clip: 'word-case', label: 'قضية', words: ['قضية', 'دعوى', 'القضية'] },
  { clip: 'word-paper', label: 'ورقة', words: ['ورقة', 'أوراق', 'ورق', 'تقرير', 'مستند', 'مستندات', 'وثيقة'] },
  { clip: 'word-evidence', label: 'دليل', words: ['دليل', 'أدلة', 'إثبات'] },
  { clip: 'word-witness', label: 'شاهد', words: ['شاهد', 'شهود'] },
  { clip: 'word-help', label: 'مساعدة', words: ['مساعدة', 'ساعد', 'أساعد', 'نساعد', 'سأساعد', 'سنساعد'] },
  { clip: 'word-protect', label: 'حماية', words: ['حماية', 'أحمي', 'نحمي', 'نحميك'] },
  { clip: 'word-follow', label: 'متابعة', words: ['متابعة', 'تابع', 'أتابع', 'سنتابع', 'سأتابع'] },
  { clip: 'word-write', label: 'اكتب', words: ['اكتب', 'كتابة'] },
  { clip: 'word-please', label: 'من فضلك', words: ['من فضلك', 'لو سمحت', 'فضلا'] },
  { clip: 'word-thank', label: 'شكراً', words: ['شكرا', 'شكرا لك'] },
  { clip: 'word-yes', label: 'نعم', words: ['نعم', 'ايوه', 'صح'] },
  { clip: 'word-no', label: 'لا', words: ['لا'] },
]
