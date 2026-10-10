# منصة «النظارة الذكية» على الويب — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تحويل `web/` من تطبيق بشكل جوال إلى منصة كاملة (حجز جلسات أصم ↔ محامٍ، غرفة جلسة، محضر، مركز تعلّم) جاهزة للعرض غداً على لابتوب.

**Architecture:** داخل مشروع React 19 + Vite + Tailwind 4 الحالي. طبقة `src/platform/` (منطق صرف مُختبر + بيانات عرض + تخزين localStorage + سياق React)، غلاف منصة جديد بقائمة جانبية، صفحات جديدة تحت `/app`، وإعادة استخدام صفحة العدسة `Home` كما هي داخل غرفة الجلسة عبر خاصية `onConversation`.

**Tech Stack:** React 19, react-router-dom 7, Tailwind 4, MediaPipe Tasks (موجود), Vitest (جديد، dev فقط), oxlint.

**Spec:** `docs/superpowers/specs/2026-10-10-web-platform-design.md`

## Global Constraints

- العربية فقط، `dir="rtl"`، خط Thmanyah Sans (`--font-ui`)، أرقام لاتينية (`toLocaleString('ar-SA-u-nu-latn')`).
- ألوان الهوية: `--accent #0f766e`، `--accent-soft #14b8a6`، `--accent-2 #1e5bb8`، `--bg #e8f1f4`، `--ink #0b1c24`، `--highlight #5eead4`.
- لا حسابات حقيقية ولا سيرفر للمنصة؛ مفتاح التخزين `sg-platform-v1`. الإعدادات الحالية (`SettingsContext`) لا تُمس.
- الحساب الأصم: «أحمد العتيبي» (`p1`)، الحساب المحامي: «أ. سارة القحطاني» (`l1`).
- الأيام المتاحة: الأحد–الخميس (`getDay()` 0–4)، الساعات 9–16 بداية (حتى 17:00)، مدة الجلسة 30 دقيقة، الحجز للأيام السبعة القادمة.
- الحالات: `pending | confirmed | completed | cancelled | declined`.
- الحروف التي يتعرف عليها المتصفح للتدريب بالكاميرا: أ ب ت ث د ر ص ض ط ظ ف ق ل لا م ن ي.
- عرض المحتوى الأقصى 1200px؛ القائمة الجانبية ≥ 1024px (`lg:`)، تبويبات سفلية تحتها.
- المسارات القديمة `/screens`, `/screen/lawyer`, `/screen/person`, `/pair` تبقى تعمل.
- كل commit ينتهي بـ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- العرض بعد موعد الجلسة المؤكدة اليوم: جلسة مؤكدة بدأت قبل أقل من 60 دقيقة تبقى «قادمة/جارية» ويمكن دخولها (اختبار في Task 1: `splitSessions`).
- يوم بلا توفر (جمعة/سبت) في منتقي الأيام: يظهر معطّلاً «لا مواعيد» ولا ينكسر (اختبار `availableSlots` في Task 1).
- نقرتان سريعتان على «تأكيد الحجز»: حجز واحد فقط (اختبار `book` في Task 2 يرفض وقتاً محجوزاً).
- localStorage تالف أو من إصدار أقدم: يُعاد البذر بدل شاشة بيضاء (اختبار `loadState` في Task 2).
- متصفح بلا `SpeechRecognition` أو كاميرا مرفوضة في الدرس/الغرفة: رسالة واضحة والصفحة تعمل (فحص يدوي في Task 7 و8 بإيقاف الإذن).

---

## File Structure

```
web/src/platform/
  logic.js            دوال صرفة: المواعيد، الانتقالات، المحضر، التقدم، تقسيم الجلسات
  logic.test.js
  seed.js             buildSeed(now): المستخدمان، 6 محامين، حجوزات بيانات العرض، محضر الحادث
  store.js            loadState/saveState(storage) + reducer الإجراءات
  store.test.js
  PlatformContext.jsx PlatformProvider + usePlatform()
  courses.js          تعريف دورات مركز التعلّم ودروسها
web/src/components/brand/BrandMark.jsx   شعار النظارة SVG
web/src/components/ui/                   Card, Button, Badge, Avatar, Stat, EmptyState, Icon, StatusBadge
web/src/components/platform/             PlatformShell, Sidebar, TopBar, MobileTabs, RoleSwitch, RequireRole
web/src/pages/public/                    Landing.jsx, Login.jsx
web/src/pages/app/                       PersonDashboard, LawyersDirectory, LawyerProfile (+BookingWizard),
                                         Sessions, LawyerDashboard, Requests, Availability,
                                         SessionRoom, SessionRecord, LearnHome, Lesson
web/src/pages/Home.jsx                   + onConversation(entry), + embedded
web/src/App.jsx                          المسارات الجديدة والتحويلات
```

---

### Task 1: المنطق الصرف + Vitest

**Files:**
- Modify: `web/package.json` (devDependency `vitest`، سكربت `"test": "vitest run"`)
- Create: `web/src/platform/logic.js`, `web/src/platform/logic.test.js`

**Interfaces:**
- Produces:
  - `availableSlots(lawyer, bookings, { from: Date, days = 7, now: Date }) -> Array<{ date: 'YYYY-MM-DD', weekday: number, slots: string[] /* ISO */ }>` — يوم بلا توفر يظهر بـ `slots: []`.
  - `transition(booking, action: 'accept'|'decline'|'cancel'|'complete') -> booking` (يرمي `Error('invalid-transition')`).
  - `buildRecord(entries: {role,text,at}[], startedAt: number, endedAt: number) -> Record` (`summary.facts` = نصوص الشخص بلا تكرار، `summary.lawyerNotes` = نصوص المحامي بلا تكرار).
  - `recordToText({ booking, lawyer, person }) -> string`.
  - `courseProgress(course, progress) -> number` (0–100 صحيح).
  - `splitSessions(bookings, now) -> { upcoming, past }` و`nextSession(bookings, now) -> booking|null`.

- [ ] **Step 1: ثبّت Vitest:** `cd web && npm i -D vitest` ثم أضف `"test": "vitest run"`.
- [ ] **Step 2: اكتب الاختبارات الفاشلة** في `logic.test.js`:
```js
// availableSlots
test('slots exclude booked, past and off days', () => {
  const lawyer = { id: 'l1', availability: { 0: [9, 10], 1: [9] } }
  const now = new Date(2026, 9, 11, 9, 30)             // Sunday 09:30
  const booked = [{ lawyerId: 'l1', start: new Date(2026, 9, 12, 9).toISOString(), status: 'pending' }]
  const days = availableSlots(lawyer, booked, { from: now, days: 7, now })
  expect(days[0].slots).toEqual([new Date(2026, 9, 11, 10).toISOString()]) // 9:00 passed
  expect(days[1].slots).toEqual([])                                       // Monday 9 booked
  expect(days.find((d) => d.weekday === 5).slots).toEqual([])             // Friday off
})
test('cancelled/declined bookings free the slot', () => { /* status 'cancelled' → slot returns */ })
// transition
test('pending → accept → confirmed → complete', () => { /* statuses chain */ })
test('completed cannot be cancelled', () => { expect(() => transition({ status: 'completed' }, 'cancel')).toThrow('invalid-transition') })
// splitSessions
test('confirmed session started 30 min ago is still upcoming', () => { /* start = now-30min → upcoming */ })
test('completed and cancelled are past', () => {})
// buildRecord
test('record dedupes consecutive phrases and splits roles', () => {
  const r = buildRecord([{ role: 'person', text: 'أ', at: 1 }, { role: 'person', text: 'أ', at: 2 }, { role: 'lawyer', text: 'ب', at: 3 }], 0, 600000)
  expect(r.durationSec).toBe(600); expect(r.summary.facts).toEqual(['أ']); expect(r.summary.lawyerNotes).toEqual(['ب'])
})
test('empty conversation gives an empty summary', () => {})
// courseProgress
test('progress rounds to a percent', () => { expect(courseProgress({ lessons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, { a: true })).toBe(33) })
```
- [ ] **Step 3: شغّل** `npm test` — FAIL (`availableSlots is not defined`).
- [ ] **Step 4: نفّذ** `logic.js` (أوقات محلية؛ الحجز «يشغل» الوقت إذا حالته `pending|confirmed|completed`؛ «جارية» = `confirmed` و`now - start < 60 دقيقة`).
- [ ] **Step 5: شغّل** `npm test` — PASS.
- [ ] **Step 6: Commit** `feat(web): platform logic (slots, booking transitions, record, progress)`

### Task 2: بيانات العرض + التخزين + السياق

**Files:**
- Create: `web/src/platform/seed.js`, `store.js`, `store.test.js`, `PlatformContext.jsx`

**Interfaces:**
- Consumes: `availableSlots`, `transition`, `buildRecord` من Task 1.
- Produces:
  - `buildSeed(now: Date) -> State` حيث `State = { version: 1, role: null|'person'|'lawyer', users: {p1,l1}, lawyers: Lawyer[6], bookings: Booking[], progress: {} }`.
    بيانات العرض: حجز `pending` (غداً 10:00 مع l1)، حجز `confirmed` اليوم بعد ساعة (مع l1؛ إن تجاوز اليوم 16:00 فغداً 11:00)، حجز `completed` قبل يومين بمحضر «حادث مروري» من `CASE_SCENARIO`، حجز `confirmed` مع محامٍ آخر بعد 3 أيام.
    المحامون: l1 سارة القحطاني (مرور، تعويضات؛ الرياض؛ 9 سنوات؛ 4.9؛ يتقن الإشارة)، l2 خالد الشهري (جنائي)، l3 نورة الدوسري (أسرة)، l4 فهد الغامدي (عمل)، l5 ريم الزهراني (عقود)، l6 عبدالله المطيري (مرور، جنائي). لكلٍّ نبذة سطرين ومراجعتان وتوفر الأحد–الخميس بأوقات مختلفة.
  - `loadState(storage, now) -> State` (مفقود/تالف/`version !== 1` ⇒ `buildSeed(now)`)، `saveState(storage, state)`.
  - `reducer(state, action) -> State` للأفعال: `login{role}`, `logout`, `switchRole`, `book{lawyerId,start,caseType,description,channel,now}` (يرمي `slot-taken` إن لم يكن الوقت ضمن `availableSlots`)، `accept{id}`, `decline{id}`, `cancel{id}`, `complete{id,entries,startedAt,endedAt}`, `toggleAvailability{lawyerId,weekday,hour}`, `markLesson{course,lesson}`, `reset{now}`.
  - `usePlatform() -> { state, me, lawyerById(id), dispatch helpers: login, logout, switchRole, book, accept, decline, cancel, complete, toggleAvailability, markLesson, resetDemo }` — `book` يعيد `{ ok: true, id } | { ok: false, error }`.

- [ ] **Step 1: اختبارات فاشلة** في `store.test.js` بتخزين وهمي `{ getItem, setItem }`:
  `loadState` من تخزين فارغ ⇒ 6 محامين؛ من `'{bad json'` ⇒ بذر؛ من `{version:0}` ⇒ بذر؛
  `book` على وقت متاح ⇒ حجز `pending` جديد؛ `book` مرتين على نفس الوقت ⇒ الثانية ترمي `slot-taken`؛
  `accept` ⇒ `confirmed`؛ `complete` ⇒ `completed` مع `record.summary`؛ `toggleAvailability` يضيف/يحذف الساعة؛
  `reset` ⇒ يطابق `buildSeed`.
- [ ] **Step 2:** `npm test` ⇒ FAIL.
- [ ] **Step 3: نفّذ** `seed.js` و`store.js`، ثم `PlatformContext.jsx` (`useReducer` + حفظ في كل تغيير؛ `book` يلتقط `slot-taken`).
- [ ] **Step 4:** `npm test` ⇒ PASS.
- [ ] **Step 5: Commit** `feat(web): platform demo data, store and context`

### Task 3: الهوية ومكوّنات الواجهة

**Files:**
- Create: `web/src/components/brand/BrandMark.jsx`, `web/src/components/ui/{Card,Button,Badge,Avatar,Stat,EmptyState,Icon,StatusBadge}.jsx`
- Modify: `web/src/index.css` (تدرّج خلفية المنصة، `.print-only`/`@media print`)، `web/public/pwa-192.png`, `pwa-512.png`, `favicon.svg`، `web/vite.config.js` (manifest `orientation: 'any'`, `display: 'standalone'` يبقى)

**Interfaces:**
- Produces:
  - `<BrandMark size?: number, variant?: 'light'|'dark'|'mono' />` — نفس هندسة `AI LAW/AI LAW/Components/BrandMark.swift` (عدستان مركزهما (319,520) و(705,520) نصف قطر 150 سماكة 46، الجسر، الذراعان، أعمدة الصوت يميناً، اليد يساراً) في `viewBox="92 380 840 270"`؛ `<BrandIcon size />` = الخلفية المتدرجة 0x13897F→0x0B4F4A + الرسم (viewBox المربع).
  - `<Button variant: 'primary'|'secondary'|'ghost'|'danger', size?: 'md'|'lg', as?, ...>`، `<Card className?>`، `<Badge tone>`، `<Avatar name size>` (حرفان أوليان بلون مشتق من الاسم)، `<Stat label value icon>`، `<EmptyState icon title text action?>`، `<Icon name>` (أيقونات SVG مضمّنة: home, users, calendar, inbox, clock, book, eye, flask, help, settings, info, logout, switch, search, star, check, x, video, mic, hand, print, download, chevron)، `<StatusBadge status>` (نصوص: بانتظار التأكيد/مؤكدة/مكتملة/ملغاة/مرفوضة).
- [ ] **Step 1:** نفّذ المكوّنات؛ أيقونات PWA من `AI LAW/AI LAW/Assets.xcassets/AppIcon.appiconset/AppIcon-light.png` عبر `sips -z 192 192` و`-z 512 512`؛ `favicon.svg` = `BrandIcon`.
- [ ] **Step 2:** `npm run lint && npm run build` ⇒ بلا أخطاء.
- [ ] **Step 3: Commit** `feat(web): brand mark and platform UI kit`

### Task 4: الغلاف والمسارات والصفحة العامة والدخول

**Files:**
- Create: `web/src/components/platform/{PlatformShell,Sidebar,TopBar,MobileTabs,RoleSwitch,RequireRole}.jsx`, `web/src/pages/public/{Landing,Login}.jsx`
- Modify: `web/src/App.jsx`, `web/src/main.jsx` (لف `PlatformProvider`)، `web/src/components/layout/AppShell.jsx` (يبقى للمسارات القديمة فقط)

**Interfaces:**
- Consumes: `usePlatform()` (Task 2)، UI kit (Task 3).
- Produces: `NAV.person` و`NAV.lawyer` (مصفوفات `{to, label, icon}` بالترتيب في المواصفات §3)، `<RequireRole role?: 'person'|'lawyer'>` (بلا دخول ⇒ `/login`؛ دور خاطئ ⇒ `/app`)، `<PlatformShell fullBleed?>` (`fullBleed` للعدسة وغرفة الجلسة).
- المسارات: كما في جدول المواصفات §3؛ تحويلات `/lab→/app/lab`, `/guide→/app/guide`, `/settings→/app/settings`, `/about→/app/about`, `/more→/app`, `/onboarding→/login`.
- [ ] **Step 1:** نفّذ الغلاف (قائمة جانبية `hidden lg:flex` بعرض 272px، شريط علوي مع `RoleSwitch` وزر «العدسة»، `MobileTabs` `lg:hidden` بخمسة عناصر)، والصفحة العامة (المواصفات §4.1، الأرقام من `state`)، والدخول (§4.2).
- [ ] **Step 2:** `npm run dev` وافتح `/`, `/login`, `/app` بعرض 1440 و390 في المتصفح المدمج؛ تحقق: التبديل بين الدورين يغيّر القائمة؛ `/app` بلا دخول ⇒ `/login`؛ `/screen/person` ما زال يعمل.
- [ ] **Step 3: Commit** `feat(web): platform shell, landing and demo login`

### Task 5: صفحات الأصم

**Files:**
- Create: `web/src/pages/app/{PersonDashboard,LawyersDirectory,LawyerProfile,BookingWizard,Sessions}.jsx`

**Interfaces:**
- Consumes: `availableSlots`, `splitSessions`, `nextSession`, `courseProgress`، `usePlatform().book/cancel`.
- Produces: `<Sessions />` يُستخدم للدورين (يعرض «الطرف الآخر» حسب `state.role`)؛ رابط دخول الجلسة `/app/session/:id`، رابط المحضر `/app/session/:id/record`.
- [ ] **Step 1:** نفّذ وفق §4.3–4.5: التصفية بالتخصص (`مرور، أسرة، عمل، جنائي، عقود، تعويضات`) والبحث بالاسم؛ المعالج بثلاث خطوات؛ وصف ≤ 300 حرف مع عدّاد؛ زر التأكيد يتعطل أثناء الإرسال؛ عند `ok:false` رسالة «هذا الموعد لم يعد متاحاً» وتحديث الأوقات؛ عند النجاح بطاقة نجاح + «عرض جلساتي».
- [ ] **Step 2:** في المتصفح: احجز موعداً ⇒ يظهر في «جلساتي/قادمة» بحالة «بانتظار التأكيد» ويختفي وقته من صفحة المحامي؛ «إلغاء» ⇒ «ملغاة» تحت «سابقة» ويعود الوقت.
- [ ] **Step 3: Commit** `feat(web): person dashboard, lawyers directory, booking, sessions`

### Task 6: صفحات المحامي

**Files:**
- Create: `web/src/pages/app/{LawyerDashboard,Requests,Availability}.jsx`

**Interfaces:**
- Consumes: `usePlatform().accept/decline/toggleAvailability`، `<Sessions />`.
- [ ] **Step 1:** نفّذ وفق §4.6 (عدّاد الطلبات في القائمة الجانبية = عدد `pending` للمحامي `l1`؛ شبكة التوفر 5 أيام × 8 ساعات بأزرار تبديل).
- [ ] **Step 2:** في المتصفح: الطلب المحجوز في Task 5 يظهر في «الطلبات» ⇒ «قبول» ⇒ عند الأصم «مؤكدة» مع «ادخل الجلسة»؛ إلغاء ساعة من التوفر ⇒ تختفي من صفحة الحجز.
- [ ] **Step 3: Commit** `feat(web): lawyer dashboard, requests and availability`

### Task 7: غرفة الجلسة والمحضر

**Files:**
- Modify: `web/src/pages/Home.jsx` (خاصيتان: `onConversation?: (entry: {role:'lawyer'|'person', text, at}) => void`، `embedded?: boolean`)
- Create: `web/src/pages/app/{SessionRoom,SessionRecord}.jsx`

**Interfaces:**
- Consumes: `usePlatform().complete`, `buildRecord`, `recordToText`.
- Home يستدعي `onConversation` في: قبول عبارة إشارة (بعد `publishScenePhrase` في تأثير `sendResult`، بالدور `r.role || finger.role`)، ضبط `setLocalLawyerPhrase` من الكلام (دور `lawyer`)، إرسال الحروف (`person`)، والعبارة البعيدة في `onRemotePhrase`. `embedded` يغيّر الجذر من `h-full w-full` ليملأ حاويته فقط (لا تغيير منطق).
- [ ] **Step 1:** عدّل Home بأقل تغيير؛ تحقق أن `/app/lens` و`/screen/person` يعملان كما كانا.
- [ ] **Step 2:** `SessionRoom`: شبكة `lg:grid-cols-[1fr_360px]` بارتفاع الشاشة: يمين `Home embedded onConversation` ويسار اللوحة (المشاركان بـ Avatar، القضية، مؤقّت mm:ss من لحظة الدخول، المحادثة مع تمرير تلقائي للأسفل، «ربط جهاز ثانٍ» ⇒ `checkHealth()` من `services/api.js`: إن نجح ⇒ `/screens`، وإن فشل ⇒ تنبيه «ربط جهاز ثانٍ يتطلب تشغيل الخادم» بدون انتقال، «إنهاء الجلسة» بتأكيد ⇒ `complete` ⇒ `navigate('/app/session/:id/record')`). حجز غير موجود أو ليس `confirmed` ⇒ `EmptyState` مع رجوع.
- [ ] **Step 3:** `SessionRecord` وفق §4.8: `window.print()` مع `@media print` يخفي الغلاف؛ «تنزيل نصّاً» عبر `Blob` بنص `recordToText` واسم `محضر-<id>.txt`.
- [ ] **Step 4:** في المتصفح: ادخل الجلسة المؤكدة ⇒ الكاميرا تعمل ⇒ اكتب عبارة تجريبية عبر أزرار التصحيح أو ارفع أصابع ⇒ تظهر في المحادثة ⇒ «إنهاء» ⇒ المحضر يعرض الوقائع والسجل؛ محضر «حادث مروري» الجاهز يفتح من «سابقة».
- [ ] **Step 5: Commit** `feat(web): live session room and session record`

### Task 8: مركز التعلّم

**Files:**
- Create: `web/src/platform/courses.js`, `web/src/pages/app/{LearnHome,Lesson}.jsx`, `web/src/hooks/usePracticeCheck.js`

**Interfaces:**
- Produces:
  - `COURSES: Array<{ id: 'letters'|'words'|'phrases'|'lens', title, description, lessons: Array<{ id, title, image?, video?, practice?: { kind: 'letter', target: string } | { kind: 'fingers', target: number } }> }>` — الحروف من `LETTER_SIGN_CLIPS` (صورة `/signs/alphabet/<file>.jpg`، `practice` فقط للحروف الـ17)؛ الكلمات من صور `/gestures/*.png`؛ العبارات 1–10 (`practice.kind='fingers'`) بنص `LAWYER_PHRASES`/`PERSON_PHRASES`؛ العدسة 4 دروس نصية من التعليمات.
  - `usePracticeCheck({ landmarksRef, allHandsRef, practice, holdMs = 1500, enabled }) -> { reading: string|number|null, progress: 0..1, done: boolean }` — يقرأ كل 100ms: حرف `classifyAlphabetLetter(landmarks)?.letter` أو عدد `countFingersFromHands(allHandsRef.current)`.
- [ ] **Step 1:** نفّذ `courses.js` و`LearnHome` (بطاقة لكل دورة بنسبة `courseProgress`).
- [ ] **Step 2:** `Lesson`: المرجع + التعليمات + (إن وُجد `practice`) كاميرا `useCamera` + `useHands` مع حلقة تقدّم؛ عند `done` ⇒ ✓ + `markLesson` + «الدرس التالي»؛ بدون `practice` ⇒ زر «أتقنته». الكاميرا المرفوضة ⇒ `PermissionGate` ويبقى زر «أتقنته».
- [ ] **Step 3:** في المتصفح: درس «أ» يكتمل عند تثبيت الإبهام 1.5 ث؛ النسبة تتحدّث في `LearnHome` ولوحة الأصم.
- [ ] **Step 4: Commit** `feat(web): sign learning center with camera practice`

### Task 9: الصفحات الحالية داخل المنصة

**Files:**
- Modify: `web/src/pages/{Lab,Guide,Settings,About}.jsx` (التخطيط فقط: أعمدة `lg:grid-cols-2`، `PageHeader` يُستبدل بعنوان الغلاف)، `web/src/pages/Settings.jsx` (+ بطاقة «بيانات العرض»: «إعادة بيانات العرض» بتأكيد ⇒ `resetDemo()`، + «تسجيل الخروج»)
- Modify: `web/src/App.jsx` (`/app/lens` ⇒ `<Home />` داخل `PlatformShell fullBleed`)

- [ ] **Step 1:** نفّذ؛ لا تغيير في منطق هذه الصفحات.
- [ ] **Step 2:** في المتصفح: كل صفحة بعرض 1440 و390 بلا تمرير أفقي؛ «إعادة بيانات العرض» تعيد الحجوزات الأصلية.
- [ ] **Step 3: Commit** `feat(web): lens, lab, guide, settings and about inside the platform`

### Task 10: التحقق الشامل وتحديث الوثائق

**Files:**
- Modify: `DEMO_SCRIPT.md` (قسم «عرض المنصة» بخطوات المواصفات §1)، `README.md` (قسم المنصة وأمر `npm test`)

- [ ] **Step 1:** `cd web && npm test && npm run lint && npm run build` ⇒ كلها تنجح.
- [ ] **Step 2:** شغّل سيناريو العرض (§1) كاملاً في المتصفح المدمج بعرض 1440، مع لقطة لكل خطوة؛ ثم الصفحات الرئيسية بعرض 390؛ `read_console_messages` بلا أخطاء.
- [ ] **Step 3:** أصلح أي خلل (كل إصلاح في commit مستقل)، ثم Commit الوثائق `docs: platform demo script`.
