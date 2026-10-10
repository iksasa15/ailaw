import { CASE_SCENARIO } from '../data/caseScenario'
import { buildRecord } from './logic'

/** بيانات العرض: مواعيدها نسبية لـ `now` حتى تبقى «اليوم/غداً» صحيحة يوم العرض. */

const WORKDAYS = [0, 1, 2, 3, 4] // الأحد–الخميس
const everyWorkday = (hours) => Object.fromEntries(WORKDAYS.map((d) => [d, [...hours]]))

const LAWYERS = [
  {
    id: 'l1',
    onlineNow: true,
    name: 'أ. سارة القحطاني',
    title: 'محامية ومستشارة قانونية',
    specialties: ['مرور', 'تعويضات'],
    city: 'الرياض',
    years: 9,
    rating: 4.9,
    reviewsCount: 128,
    signFluent: true,
    bio: 'متخصصة في قضايا الحوادث المرورية والتعويضات. تتقن لغة الإشارة السعودية وتخدم الصم منذ ست سنوات.',
    reviews: [
      { author: 'منى', stars: 5, text: 'فهمت قضيتي من أول جلسة، والترجمة كانت واضحة جداً.' },
      { author: 'سلطان', stars: 5, text: 'متابعة ممتازة وحصلت على التعويض كاملاً.' },
    ],
    availability: everyWorkday([9, 10, 11, 13, 14, 15, 16]),
  },
  {
    id: 'l2',
    name: 'أ. خالد الشهري',
    title: 'محامٍ جنائي',
    specialties: ['جنائي'],
    city: 'جدة',
    years: 12,
    rating: 4.8,
    reviewsCount: 94,
    signFluent: false,
    bio: 'خبرة طويلة في القضايا الجنائية والدفاع أمام المحاكم، ويعتمد الترجمة الفورية في جلسات الصم.',
    reviews: [
      { author: 'فيصل', stars: 5, text: 'دقيق ومطمئن، شرح لي كل خطوة.' },
      { author: 'هند', stars: 4, text: 'خبرة واضحة وسرعة في الرد.' },
    ],
    availability: everyWorkday([10, 11, 12, 14, 15]),
  },
  {
    id: 'l3',
    onlineNow: true,
    name: 'أ. نورة الدوسري',
    title: 'محامية أحوال شخصية',
    specialties: ['أسرة'],
    city: 'الرياض',
    years: 7,
    rating: 4.9,
    reviewsCount: 76,
    signFluent: true,
    bio: 'قضايا الأسرة والحضانة والنفقة، بأسلوب هادئ يراعي الخصوصية، وتتقن لغة الإشارة.',
    reviews: [
      { author: 'ريم', stars: 5, text: 'صبورة جداً وتتكلم بالإشارة بطلاقة.' },
      { author: 'عبير', stars: 5, text: 'حلت قضية الحضانة بسرعة.' },
    ],
    availability: everyWorkday([9, 10, 11, 12]),
  },
  {
    id: 'l4',
    name: 'أ. فهد الغامدي',
    title: 'محامي قضايا عمالية',
    specialties: ['عمل'],
    city: 'الدمام',
    years: 10,
    rating: 4.7,
    reviewsCount: 61,
    signFluent: false,
    bio: 'حقوق الموظفين، الفصل التعسفي، ومستحقات نهاية الخدمة.',
    reviews: [
      { author: 'ماجد', stars: 5, text: 'استرد مستحقاتي كاملة.' },
      { author: 'نوف', stars: 4, text: 'متعاون وواضح.' },
    ],
    availability: everyWorkday([13, 14, 15, 16]),
  },
  {
    id: 'l5',
    name: 'أ. ريم الزهراني',
    title: 'محامية عقود وشركات',
    specialties: ['عقود'],
    city: 'جدة',
    years: 6,
    rating: 4.8,
    reviewsCount: 52,
    signFluent: true,
    bio: 'صياغة العقود ومراجعتها ونزاعات الإيجار والبيع، وتتقن لغة الإشارة.',
    reviews: [
      { author: 'تركي', stars: 5, text: 'راجعت عقد الإيجار ونبهتني لبنود مهمة.' },
      { author: 'لمى', stars: 5, text: 'تعامل راقٍ وشرح مبسط.' },
    ],
    availability: everyWorkday([9, 11, 13, 15]),
  },
  {
    id: 'l6',
    onlineNow: true,
    name: 'أ. عبدالله المطيري',
    title: 'محامٍ ومستشار',
    specialties: ['مرور', 'جنائي'],
    city: 'المدينة المنورة',
    years: 15,
    rating: 4.6,
    reviewsCount: 140,
    signFluent: false,
    bio: 'قضايا المرور والمخالفات والقضايا الجنائية البسيطة.',
    reviews: [
      { author: 'خالد', stars: 5, text: 'خبرة كبيرة وحلول عملية.' },
      { author: 'سارة', stars: 4, text: 'جيد جداً.' },
    ],
    availability: everyWorkday([10, 12, 14, 16]),
  },
]

const USERS = {
  p1: { id: 'p1', role: 'person', name: 'أحمد العتيبي', city: 'الرياض' },
  l1: { id: 'l1', role: 'lawyer', name: 'أ. سارة القحطاني', city: 'الرياض' },
  p2: { id: 'p2', role: 'person', name: 'منى الحربي', city: 'الرياض' },
  p3: { id: 'p3', role: 'person', name: 'سلطان العنزي', city: 'الخرج' },
  p4: { id: 'p4', role: 'person', name: 'فيصل الدوسري', city: 'جدة' },
  p5: { id: 'p5', role: 'person', name: 'هند القرني', city: 'الدمام' },
}

/** عبارات قصيرة لمحاضر الجلسات السابقة (للوحة الأثر). */
const TALK = {
  مرور: [['lawyer', 'أين وقع الحادث؟'], ['person', 'عند الإشارة'], ['lawyer', 'هل لديك تقرير المرور؟'], ['person', 'نعم معي التقرير']],
  جنائي: [['lawyer', 'متى حدثت الواقعة؟'], ['person', 'يوم الخميس مساءً'], ['lawyer', 'هل يوجد شهود؟'], ['person', 'نعم شخصان']],
  أسرة: [['lawyer', 'ما طلبك في القضية؟'], ['person', 'أريد حضانة أطفالي'], ['lawyer', 'سنرفع الطلب للمحكمة']],
  عمل: [['lawyer', 'متى انتهى عقدك؟'], ['person', 'قبل شهرين'], ['lawyer', 'هل استلمت مستحقاتك؟'], ['person', 'لا لم أستلم']],
  عقود: [['lawyer', 'هل العقد موثّق؟'], ['person', 'نعم موثّق'], ['lawyer', 'سأراجع البنود']],
  تعويضات: [['lawyer', 'ما قيمة الضرر؟'], ['person', 'خمسون ألف ريال'], ['lawyer', 'سنطالب بالتعويض']],
}

/** جلسات مكتملة خلال الأسابيع الماضية: [أسابيع مضت، يوم في الأسبوع، محامٍ، موكّل، نوع القضية، دقائق]. */
const HISTORY = [
  [7, 1, 'l2', 'p4', 'جنائي', 18],
  [6, 2, 'l3', 'p5', 'أسرة', 25],
  [6, 4, 'l1', 'p2', 'مرور', 14],
  [5, 0, 'l4', 'p2', 'عمل', 22],
  [4, 1, 'l5', 'p4', 'عقود', 16],
  [4, 3, 'l1', 'p3', 'تعويضات', 28],
  [3, 2, 'l6', 'p5', 'مرور', 12],
  [3, 4, 'l3', 'p4', 'أسرة', 20],
  [2, 0, 'l1', 'p5', 'مرور', 19],
  [2, 3, 'l2', 'p3', 'جنائي', 24],
  [1, 1, 'l4', 'p4', 'عمل', 21],
  [1, 2, 'l1', 'p2', 'تعويضات', 26],
]

const at = (base, dayOffset, hour, minute = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute)

/** محضر حادث مروري جاهز من سيناريو المعمل. */
function accidentRecord(start) {
  const t0 = start.getTime()
  const entries = CASE_SCENARIO.map((line, i) => ({ role: line.role, text: line.text, at: t0 + (i + 1) * 40_000 }))
  return buildRecord(entries, t0, t0 + 12 * 60_000)
}

function historyBookings(now) {
  return HISTORY.map(([weeksAgo, weekday, lawyerId, personId, caseType, minutes], i) => {
    const start = at(now, -now.getDay() - weeksAgo * 7 + weekday, 10 + (i % 5))
    const t0 = start.getTime()
    const entries = TALK[caseType].map(([role, text], k) => ({ role, text, at: t0 + (k + 1) * 60_000 }))
    return {
      id: `h-${i + 1}`,
      personId,
      lawyerId,
      start: start.toISOString(),
      durationMin: 30,
      caseType,
      description: '',
      channel: i % 3 ? 'sign' : 'text',
      status: 'completed',
      createdAt: start.toISOString(),
      record: buildRecord(entries, t0, t0 + minutes * 60_000),
    }
  })
}

export function buildSeed(now) {
  // جلسة اليوم بعد نصف ساعة على الأقل؛ بعد نهاية الدوام تصبح غداً 11:00.
  const todayHour = now.getHours() + (now.getMinutes() < 30 ? 1 : 2)
  const todayStart = todayHour >= 17 ? at(now, 1, 11) : at(now, 0, todayHour)
  const doneStart = at(now, -2, 10)
  const oldStart = at(now, -7, 13)
  const booking = (id, personId, lawyerId, start, caseType, description, channel, status, extra = {}) => ({
    id,
    personId,
    lawyerId,
    start: start.toISOString(),
    durationMin: 30,
    caseType,
    description,
    channel,
    status,
    createdAt: at(now, -3, 9).toISOString(),
    ...extra,
  })
  return {
    version: 2,
    role: null,
    users: structuredClone(USERS),
    lawyers: structuredClone(LAWYERS),
    progress: {},
    bookings: [
      booking('b-today', 'p1', 'l1', todayStart, 'حادث مروري', 'متابعة مطالبة التعويض بعد الحادث.', 'sign', 'confirmed'),
      booking('b-req', 'p1', 'l1', at(now, 1, 10), 'تعويضات', 'استشارة عن رفض شركة التأمين.', 'sign', 'pending'),
      booking('b-l3', 'p1', 'l3', at(now, 3, 12), 'أسرة', 'استشارة في إجراءات النفقة.', 'text', 'confirmed'),
      booking('b-done', 'p1', 'l1', doneStart, 'حادث مروري', 'تعرضت لحادث سيارة وأريد تعويضاً.', 'sign', 'completed', {
        record: accidentRecord(doneStart),
      }),
      booking('b-p2', 'p2', 'l1', at(now, 2, 14), 'عمل', 'فصل من العمل دون إنذار.', 'sign', 'pending'),
      booking('b-p3', 'p3', 'l1', oldStart, 'مرور', 'اعتراض على مخالفة مرورية.', 'text', 'completed', {
        record: buildRecord(
          [
            { role: 'lawyer', text: 'ما سبب المخالفة؟', at: oldStart.getTime() + 60_000 },
            { role: 'person', text: 'تجاوز السرعة وأنا لم أكن أقود', at: oldStart.getTime() + 120_000 },
            { role: 'lawyer', text: 'سنقدّم اعتراضاً مع إثبات', at: oldStart.getTime() + 180_000 },
          ],
          oldStart.getTime(),
          oldStart.getTime() + 8 * 60_000,
        ),
      }),
      ...historyBookings(now),
    ],
  }
}
