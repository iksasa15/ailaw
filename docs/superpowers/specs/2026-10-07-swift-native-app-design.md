# مواصفات تطبيق «النظارة الذكية» الأصلي (SwiftUI) — معالجة محلية كاملة

**التاريخ:** 2026-10-07
**الحالة:** بانتظار مراجعة المواصفات
**المشروع:** `AI LAW/AI LAW.xcodeproj` (حالياً قالب Xcode فارغ)

---

## 1. الهدف ومعيار النجاح

نقل كل ميزات موقع React PWA (`web/`) إلى تطبيق iPhone أصلي بـ SwiftUI، بحيث تتم **كل المعالجة على الجهاز** دون أي اعتماد على سيرفر FastAPI (`backend/`) أو على الإنترنت، مع إعادة تصميم الواجهة بالكامل لعرضها أمام اللجنة.

**معيار النجاح:** تشغيل سيناريو «جلسة حادث مروري» (`DEMO_SCRIPT.md`) كاملاً على جهازَي iPhone حقيقيين — جوال للمحامي وجوال للشخص — في وضع الطيران أو بدون إنترنت:

- كلام المحامي يظهر نصاً، ثم إشارات فيديو على جوال الشخص.
- إشارات الشخص (عدد الأصابع 1–10 أو الحروف) تُنطق بصوت مسموع على جوال المحامي.
- صوت صفارة أو إنذار قريب يُطلق وميضاً أحمر واهتزازاً.

## 2. القرارات المعتمدة

| القرار | القيمة | السبب |
|---|---|---|
| جهاز العرض | iPhone حقيقي ×2 | الكاميرا والمايك والاهتزاز وجلسة الجوالين |
| المنصات | iPhone فقط (إزالة macOS وvisionOS وiPad من الأهداف) | تقليل التعقيد؛ AVCapture وMultipeer يُختبران على منصة واحدة |
| الطريقة | SwiftUI + أطر Apple فقط، بلا مكتبات خارجية | لا شيء يتعطل يوم العرض؛ تعمل بلا إنترنت |
| كلمات ArSL العشر | قواعد بسيطة منقولة من `backend/app/services/arsl_service.py` (`_heuristic_predict`) | بلا ملف نموذج؛ الميزة اختيارية ومطفأة افتراضياً كما في الموقع |
| لغة الواجهة | العربية فقط، RTL | الجمهور واللجنة |
| الهوية البصرية | خط «ثمانية» + لون التيل `#0F766E` + شعار العدستين، بأسلوب iOS 26 (Liquid Glass) | استمرارية مع الموقع بتصميم أصلي حديث |
| أقل إصدار | iOS 26.4 (كما في المشروع الحالي) | يسمح بـ Liquid Glass وأحدث واجهات Speech |

**تحقق تقني مُنجز على جهاز التطوير:** `SFSpeechRecognizer(ar-SA).supportsOnDeviceRecognition == true`، و`DictationTranscriber` يدعم `ar_SA`. مصنّف `SNClassifySoundRequest(.version1)` يحتوي فئات: `siren`، `police_siren`، `ambulance_siren`، `fire_engine_siren`، `civil_defense_siren`، `emergency_vehicle`، `smoke_detector`، `car_horn`، `air_horn`، `alarm_clock`، `screaming`، `glass_breaking`.

## 3. خارج النطاق

- إعدادات عنوان السيرفر، وفحص `/health`، وتثبيت PWA.
- QR والانضمام بالرابط (`PairJoin`، `pairInvite.js`)، ويحل محلهما الاكتشاف التلقائي عبر Multipeer.
- نموذج HuggingFace الحقيقي (torch) وتحويله إلى CoreML.
- Whisper وYAMNet، وتحل محلهما Speech وSoundAnalysis.
- نسخ macOS وvisionOS وiPad.
- أي تعديل على `web/` أو `backend/`، فهما يبقيان كما هما.

## 4. بنية التطبيق

```
AI LAW/
├─ AI LAW.xcodeproj
├─ Packages/AILawCore/              ← حزمة Swift محلية: منطق خالص بلا UIKit/AVFoundation/Vision
│  ├─ Package.swift
│  ├─ Sources/AILawCore/
│  │  ├─ Geometry/HandLandmarks.swift      21 نقطة (x,y,z) بإحداثيات MediaPipe (أصل أعلى-يسار، y لأسفل)
│  │  ├─ Logic/FingerCounter.swift         countExtendedFingers + countFingersFromHands
│  │  ├─ Logic/FingerPhraseMachine.swift   آلة الحالة: ثبات العدد + تثبيت الدور 5 ثوانٍ
│  │  ├─ Logic/AlphabetClassifier.swift    classifyAlphabetLetter + fingerFlags
│  │  ├─ Logic/AlphabetWriter.swift        تثبيت 3 ثوانٍ ← إلحاق حرف
│  │  ├─ Logic/WordSignClassifier.swift     قواعد كلمات ArSL العشر
│  │  ├─ Logic/TrackingQualityMeter.swift  lost/weak/locked من حركة النقاط
│  │  ├─ Logic/ObstacleDetector.swift      مقاييس الحاجز من صورة رمادية 80×60
│  │  ├─ Logic/DangerSoundPolicy.swift     فئات الخطر + العتبة + فترة الانتظار
│  │  ├─ Lexicon/SignLexicon.swift         resolveSignClips + fingerspellText + normalize
│  │  ├─ Data/Phrases.swift                LAWYER_PHRASES / PERSON_PHRASES / ROLE_LABELS
│  │  ├─ Data/CaseScenario.swift           السيناريو العشري
│  │  └─ Session/SceneMessage.swift        رسالة الجلسة Codable + منع التكرار
│  └─ Tests/AILawCoreTests/                Swift Testing — تُشغَّل بـ `swift test` على الماك
└─ AI LAW/                                  هدف التطبيق
   ├─ App/        AILawApp.swift, AppSettings.swift (Observable + UserDefaults), Theme.swift
   ├─ Engines/    CameraEngine, HandTracker, AudioHub, SpeechEngine, SpeakEngine,
   │              SoundAlertEngine, ObstacleEngine, PeerSession, Haptics, ReadinessChecker
   ├─ Features/
   │  ├─ Onboarding/   الترحيب + طلب الأذونات
   │  ├─ Lens/         LensScreen + LensViewModel + مكوّنات العدسة
   │  ├─ Session/      اختيار الدور + الاتصال
   │  ├─ Lab/          السيناريو + مترجم يدوي + اختبار المحامي
   │  └─ More/         التعليمات، الإعدادات، فحص الجاهزية، عن المشروع
   ├─ Components/      GlassChip, HoldRing, PrimaryButton, SectionCard …
   ├─ Resources/
   │  ├─ Fonts/        thmanyahsans-{Light,Regular,Medium,Bold,Black}.otf
   │  ├─ SignVideos/   كل ملفات web/public/signs/videos/*.mp4
   │  └─ Info.plist    مفاتيح لا تُولَّد تلقائياً (UIAppFonts, NSBonjourServices)
   └─ Assets.xcassets  الأيقونة، الألوان، صور الحروف (alphabet/*.jpg عدا _debug/_preview)، صور الإيماءات
```

**لماذا حزمة `AILawCore` منفصلة:** المنطق المنقول من الموقع هو الأكثر عرضة للخطأ والأسهل اختباراً. وضعه في حزمة بلا أطر Apple يتيح تشغيل `swift test` على الماك في ثوانٍ دون محاكي، ويجبر على حدود واضحة: المحركات تحوّل بيانات الأجهزة إلى أنواع `AILawCore`، والمنطق لا يعرف شيئاً عن الكاميرا.

**إعدادات المشروع:**
- يُزال `Item.swift` وSwiftData من القالب.
- `SUPPORTED_PLATFORMS = iphoneos iphonesimulator`، و`TARGETED_DEVICE_FAMILY = 1`، والاتجاه عمودي فقط.
- `ENABLE_APP_SANDBOX` إعداد خاص بالماك، فيُزال مع إزالة منصة macOS.
- المشروع يستخدم مجلدات متزامنة (objectVersion 77)، فالملفات الجديدة داخل `AI LAW/AI LAW/` تدخل الهدف تلقائياً. **أسماء الموارد يجب أن تكون فريدة** لأنها تُنسخ مسطحة إلى الحزمة.
- مفاتيح Info.plist (عبر `INFOPLIST_KEY_*` أو ملف Info.plist الجزئي):
  - `NSCameraUsageDescription`
  - `NSMicrophoneUsageDescription`
  - `NSSpeechRecognitionUsageDescription`
  - `NSLocalNetworkUsageDescription`
  - `NSBonjourServices`: `_ailaw-scene._tcp` و`_ailaw-scene._udp`
  - `UIAppFonts`
- يبقى `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`. المحركات التي تعالج الصور والصوت تعمل على طوابير خلفية وتنشر نتائجها إلى MainActor.

## 5. المحركات (Engines) — الواجهات

كل محرك كائن `@Observable` بمهمة واحدة، ويملك حالة `status` تعرضها الواجهة وفحص الجاهزية.

| المحرك | الإطار | المدخل ← المخرج | تفاصيل |
|---|---|---|---|
| `CameraEngine` | AVFoundation | ← `CMSampleBuffer` لمستهلكين متعددين + `previewLayer` | أمامية/خلفية؛ 720p؛ `status`: idle/ready/denied/unavailable (المحاكي) |
| `HandTracker` | Vision `VNDetectHumanHandPoseRequest` (`maximumHandCount = 2`) | إطار ← `[HandLandmarks]` + `TrackingQuality` | ~8 إطارات/ث؛ ثقة نقطة ≥ 0.3؛ تنعيم EMA α=0.35 كما في `useHands.js`؛ تحويل إحداثيات Vision (أصل أسفل-يسار) إلى أصل أعلى-يسار، مع عكس أفقي للكاميرا الأمامية؛ ترتيب المفاصل حسب MediaPipe |
| `AudioHub` | AVAudioEngine + AVAudioSession (الفئة `.playAndRecord`، الوضع `.default`، الخيارات `defaultToSpeaker` و`allowBluetoothA2DP`). لا يُستخدم `.voiceChat` لأن معالجته الصوتية تُضعف رصد الصفارات | مايك واحد ← tap يوزّع `AVAudioPCMBuffer` على المشتركين | يقابل `useSharedMic.js`؛ يعالج المقاطعات وتغيّر المسار |
| `SpeechEngine` | Speech `SFSpeechRecognizer(ar-SA)` + `requiresOnDeviceRecognition = true` | buffers ← `text` (مُجمّع) + `partial` | إعادة تشغيل المهمة تلقائياً عند انتهائها (~60 ث) أو عند الخطأ؛ `status`: idle/listening/unavailable/denied/error؛ `clearText()` |
| `SpeakEngine` | AVSpeechSynthesizer | نص ← صوت | صوت عربي `ar-SA` إن وُجد، وإلا الافتراضي؛ `rate` يعادل 0.92 في الويب؛ cooldown 1600ms لنفس النص، و`force` يتجاوزه |
| `SoundAlertEngine` | SoundAnalysis `SNClassifySoundRequest(.version1)` | buffers ← `DangerAlert?` | نافذة 1.5 ث بتداخل 50%؛ القرار في `DangerSoundPolicy`: فئة خطر بثقة ≥ 0.5 في نافذتين متتاليتين، ثم انتظار 4 ث |
| `ObstacleEngine` | Accelerate/CoreImage للتصغير | إطار خلفي ← `near`, `ObstacleAlert?` | تصغير إلى 80×60 رمادي كل 180ms ثم `ObstacleDetector` |
| `PeerSession` | MultipeerConnectivity | `SceneMessage` ↔ الجوال الآخر | خدمة `ailaw-scene`؛ تعلن وتبحث معاً؛ دعوة تلقائية حسب الدور المكمّل؛ `state`: searching/connected/disconnected؛ إعادة اتصال تلقائية |
| `Haptics` | UIKit `UINotificationFeedbackGenerator` + CoreHaptics | — | نمط تنبيه الخطر، ونبضة القبول |
| `ReadinessChecker` | كل ما سبق | ← قائمة بنود ✓/✗ مع تعليمات إصلاح | الأذونات، حزمة الكلام العربي، الصوت العربي، الكاميرا، اتصال الجوال الثاني |

## 6. المنطق المنقول (AILawCore) — الأرقام الحرفية من الويب

يُنقل المنطق **بنفس الأرقام** لأن الإحداثيات تُحوَّل إلى نظام MediaPipe نفسه.

- **عدّ الأصابع** (`useFingerPhrases.js`):
  - الإصبع ممدود إذا كان `dist(tip, wrist) > dist(pip, wrist) × 1.12`.
  - الإبهام ممدود إذا كان `dist(thumbTip, pinkyMcp) > dist(thumbIp, pinkyMcp) × 1.08`.
  - المجموع لليدين بحد أقصى 10.
- **جودة التتبع** (`useHands.js`):
  - إذا كانت الحركة < 0.012 يزيد `stable`، وإلا ينقص 2.
  - `stable ≥ 10` تعني locked، و`≥ 3` تعني weak.
  - 5 إطارات بلا يد تعني lost.
- **آلة العبارات:**
  - تُقرأ كل 120ms.
  - القبول يحتاج ثبات `stableNeed = 10` قراءات إذا كان التتبع locked، و14 إذا لم يكن.
  - معاينة غير مقبولة تظهر عند locked مع ثبات ≥ 3.
  - مفتاح القبول هو `role:fingers:phrase`.
  - **تثبيت الدور:**
    - إصبع واحد يعني محامي، وإصبعان يعنيان شخص.
    - يُحسب فقط إذا كان التتبع locked والدور غير مقفل.
    - مدته 5000ms.
    - أثناء التثبيت لا تُقبل عبارة إذا كانت 0.08 < progress < 1.
  - الدور الافتراضي هو شخص.
- **الحروف** (`useAlphabetSign.js`):
  - جدول الأنماط `t i m r p` وقواعد القرصة والانتشار كما هي.
  - القراءة كل 100ms.
  - التثبيت 3000ms.
  - بين إلحاق حرفين 500ms، وتكرار نفس الحرف يحتاج ضعف ذلك.
  - العمليات: `backspace`، `space`، `clear`.
- **كلمات ArSL** (`arsl_service.py`):
  - نفس قواعد `_heuristic_predict` وجدول `DEMO_VOCAB`.
  - التطبيع: الإزاحة إلى الرسغ والقسمة على المسافة بين الرسغ و`middle_mcp`.
  - التصويت كما في `useArsl.js`: نافذة 6، ويلزم 3 أصوات (2 عند locked).
- **الأولوية** (`Home.jsx`): نتيجة عدّ الأصابع المقبولة أولاً، ثم ArSL إذا كان مفعّلاً وثقته ≥ 0.45.
- **المعجم** (`signLexicon.js`):
  - `normalize`: حذف التشكيل `ً-ٰٟ`، وتحويل غير العربي والأرقام إلى مسافة، وضغط المسافات.
  - ترتيب المطابقة:
    1. رقم الأصابع من 1 إلى 10.
    2. تطابق تام مع عبارة.
    3. احتواء العبارة كاملة داخل النص.
    4. التهجئة: 48 حرفاً كحد أقصى، و«لا» حرف واحد.
  - `spellLetters` يفرض التهجئة.
- **الحاجز** (`useObstacleProximity.js`):
  - `uniformClose = std < 26 && edges < 16 && 20 < mean < 230`.
  - `softClose = edges < 11 && 28 < mean < 215`.
  - `looming = softClose && 7 < diff < 48`.
  - العداد يزيد 1 عند الإصابة وينقص 2 عند عدمها.
  - `near` تعني عداد ≥ 6.
  - بين تنبيهين 4500ms.
  - صوت التحذير: 5 نغمات مربعة 880/660Hz بتوليد AVAudioEngine.
- **مترجم الإشارة** (`SignCoachAvatar.jsx`):
  - المقاطع تُعرض بالتتابع وتتكرر في حلقة.
  - الفيديو ينتقل للتالي عند انتهائه، أو بعد 2800ms إذا تعذّر تشغيله.
  - صورة الحرف تُعرض 900ms.
  - العنوان «مترجم» للفيديو و«تهجئة» للحروف.
  - يبدأ من أول مقطع عند وصول عبارة جديدة.
- **الاستقبال إلى إشارة** (`Home.jsx`):
  - آخر 12 كلمة من النص.
  - تأخير 800ms بعد آخر تغيير.
  - تُتجاهل النصوص الأقصر من حرفين.
  - لا يتكرر نفس المقطع مرتين.

## 7. الشاشات والتصميم

**نظام التصميم (`Theme.swift`):**
- **الألوان:**
  - accent `#0F766E`، و accentSoft `#14B8A6`، و accent2 `#1E5BB8`، و danger `#DC2626`، و highlight `#5EEAD4`.
  - في الوضع الفاتح: ink `#0B1C24` و bg `#E8F1F4`.
  - في الوضع الداكن: ألوان مقابلة.
- **الخط:** «Thmanyah Sans» بأوزانه الخمسة، ويتأثر بإعداد حجم الخط.
- **العناصر فوق الكاميرا:** `glassEffect` (Liquid Glass) بزوايا مستديرة.
- **الاتجاه:** `layoutDirection = .rightToLeft` على مستوى التطبيق.
- **الحركة:** نبضة عند القبول، وحلقة تثبيت، ووميض الخطر.

**التنقل:** `TabView` بأربعة تبويبات: **عدسة · جلسة · معمل · المزيد**، بأيقونات SF Symbols. يسبقها شاشة **الترحيب** عند أول تشغيل (`onboarded`).

| الشاشة | المحتوى | مصدرها في الويب |
|---|---|---|
| الترحيب | الشعار، «النظارة الذكية»، جملة التعريف، ثم «ابدأ الآن» يطلب الأذونات الأربعة بالتتابع مع شرح كل إذن | `Onboarding.jsx` |
| العدسة | الكاميرا ملء الشاشة؛ رسم نقاط اليد (أخضر عند locked وأصفر عند weak)؛ شارات علوية للتتبع والدور (مع حلقة التثبيت) والاتصال؛ النتيجة في الوسط مع إعادة النطق؛ «ضع يدك هنا»؛ لوحة مترجم الإشارة؛ فقاعة النص الحي؛ بطاقة «الشخص بالإشارة» على شاشة المحامي؛ شريط أزرار (استقبال، إرسال، أمان، حروف، ترجمة، قلب الكاميرا، مسح)؛ لوحة كتابة الحروف؛ تنبيه الخطر بملء الشاشة؛ شارة «اقترب من حاجز…» | `Home.jsx`، `Overlay.jsx`، `BottomBar.jsx`، `SignCoachAvatar.jsx`، `AlphabetWriteOverlay.jsx` |
| الجلسة | «ثلاث خطوات» مختصرة؛ زرا «أنا المحامي» و«أنا الشخص»؛ حالة البحث والاتصال واسم الجوال الآخر؛ «ادخل شاشتي» (عدسة مقفلة الدور)؛ «إنهاء الجلسة» | `ScreenPick.jsx` |
| المعمل | سيناريو الحادث (عنوان + 20 سطراً + التالي/إعادة + نطق السطر)؛ مترجم إشارة يدوي (نص → إشارات، مع مفتاح «حروف»)؛ اختبار المحامي (أزرار 1–10 + نص حر) | `Lab.jsx` |
| المزيد ← التعليمات | الأقسام الستة نفسها (قبل البدء، استقبال، إرسال، أمان، شارات التتبع، إعدادات مفيدة)؛ جدول العبارات؛ صور الإيماءات العشر | `Guide.jsx`، `GestureArt.jsx` |
| المزيد ← الإعدادات | محررا عبارات المحامي والشخص (1–10) مع «استرجاع الافتراضي»؛ حجم الخط؛ شفافية العدسة؛ حساسية التعرف؛ تفعيل ArSL؛ فحص الجاهزية؛ إعادة الضبط | `Settings.jsx` |
| المزيد ← عن المشروع | الوصف، الاتجاهات الثلاثة، مفردات ArSL العشر (من البيانات المحلية بدلاً من `/arsl/vocab`) | `About.jsx` |

**الإعدادات المحفوظة** (`AppSettings`، تقابل `SettingsContext.jsx`):
- `fontScale = 1`، `overlayOpacity = 0.55`، `confidence = 0.38`
- `receiveEnabled`، `sendEnabled`، `safetyEnabled`: كلها `true`
- `arslEnabled = false`، `onboarded = false`
- `lawyerPhrases` و`personPhrases`
- `phrasePack = "accident-case-v1"`: إذا تغيرت قيمته تُعاد العبارات إلى الافتراضي

## 8. تدفق البيانات

### 8.1 جوال واحد (تبويب العدسة، الدور غير مقفل)
1. الكاميرا: أمامية إذا كان الإرسال مفعلاً، وخلفية إذا كان الأمان وحده مفعلاً. الإطار يمر إلى `HandTracker`، ثم إلى `FingerPhraseMachine` و`AlphabetWriter` و`WordSignClassifier` (حسب الوضع).
2. تغيير الدور: ينطق «وضع المحامي» أو «وضع الشخص»، وتنبض الشارة.
3. نتيجة مقبولة جديدة (مفتاح مختلف): تُعرض، وتُنطق، وتنبض الشارة. تُحذف النتائج القصيرة لإصبع أو إصبعين أثناء تثبيت الدور (progress > 0.15)، وعبارة المحامي تُحفظ كآخر عبارة للمحامي.
4. المايك يمر عبر `AudioHub` إلى `SpeechEngine` وفقاعة النص. إذا كان الدور محامياً أو شخصاً، يؤخذ المقطع ويحفظ كآخر عبارة للمحامي، ثم يمر إلى `SignLexicon` فيعرضه مترجم الإشارة.
5. وضع الحروف: الإرسال ينطق النص ثم يمسحه، وتظهر «تم الإرسال» لمدة 2.5 ثانية.
6. الأمان:
   - `SoundAlertEngine` أو `ObstacleEngine` يطلق تنبيه ملء الشاشة واهتزازاً. التنبيه يُغلق باللمس.
   - الحاجز ينطق أيضاً «احذر، حاجز قريب»، بفترة انتظار 4 ثوانٍ.

### 8.2 جوالان (تبويب الجلسة ← شاشة مقفلة الدور)

**جوال المحامي:**
- كلامه بعد تحويله إلى نص، وعبارات أصابعه: تُرسل للشخص، وعبارات الأصابع تُنطق محلياً أيضاً.
- رسائل الشخص المستقبلة: تُنطق بصوت مسموع، وتظهر في بطاقة «الشخص بالإشارة».

**جوال الشخص:**
- عبارات أصابعه ونص الحروف: تُرسل للمحامي، **ولا تُنطق محلياً**.
- رسائل المحامي المستقبلة: تُعرض في مترجم الإشارة.

**الرسالة:**
```json
{ "type": "phrase", "role": "lawyer|person", "text": "…", "fingers": 1-10|null, "at": 1739999999999, "id": "UUID" }
{ "type": "snapshot", "lawyer": {…}|null, "person": {…}|null }
```
- تُرسل بوضع `.reliable`.
- عند الاتصال يرسل كل طرف `snapshot`.
- منع التكرار يعتمد على `id`، مع احتياط بمفتاح `at:text`.
- آخر عبارة للمحامي هي الأحدث بين المحلية والمستقبلة، حسب `at`.

## 9. التعامل مع الأخطاء

| الحالة | السلوك |
|---|---|
| رفض إذن كاميرا/مايك/كلام/شبكة محلية | بطاقة سبب واضحة + زر يفتح `UIApplication.openSettingsURLString`؛ الميزات الأخرى تستمر |
| حزمة الكلام العربي غير متاحة على الجهاز | `SpeechEngine.status = .unavailable` + رسالة في الفقاعة + خطوات الإصلاح في فحص الجاهزية (إضافة لوحة مفاتيح عربية وتفعيل الإملاء). **لا رجوع للخادم أبداً** |
| انتهاء مهمة التعرف (~60 ث) أو خطأ عابر | إعادة تشغيل تلقائية مع الإبقاء على النص المجمّع |
| مقاطعة صوتية (مكالمة، Siri) | إيقاف، ثم استئناف عند `.ended` |
| لا يوجد صوت نطق عربي | الصوت الافتراضي + تحذير في فحص الجاهزية |
| ضياع اليد | تصفير العدادات وتثبيت الدور والحروف + إطار «ضع يدك هنا» |
| انقطاع الجوال الآخر | الشارة «منقطع» + إعادة الإعلان والبحث تلقائياً |
| حرارة الجهاز | Vision بحوالي 8 إطارات/ث فقط، وتحليل الحاجز كل 180ms على صورة 80×60؛ إيقاف المحركات غير المستخدمة عند إطفاء أوضاعها أو مغادرة التبويب |
| ملف فيديو إشارة مفقود | عرض نص المقطع بدلاً منه والانتقال للتالي |
| المحاكي (لا كاميرا) | `CameraEngine.status = .unavailable` ← بطاقة «الكاميرا غير متاحة على المحاكي»؛ باقي الشاشات تعمل |

## 10. الاختبار

1. **اختبارات تلقائية** (`swift test` في `Packages/AILawCore`، Swift Testing):
   - `FingerCounter`: نقاط يد لقبضة (0)، وسبابة (1)، وعلامة النصر (2)، وثلاثة، وأربعة، وكف مفتوح (5)، ويدين بمجموع 10.
   - `FingerPhraseMachine` بساعة قابلة للحقن:
     - القبول بعد 10 قراءات عند locked و14 عند غيره.
     - عدم تكرار القبول.
     - تبديل الدور بعد 5000ms.
     - كبت العبارة أثناء التثبيت.
     - الدور المقفل لا يتبدل.
   - `AlphabetClassifier`: كل نمط في الجدول يعطي حرفه.
   - `AlphabetWriter`: الإلحاق بعد 3000ms، وفترة 500ms بين الحروف، والحذف والمسافة.
   - `WordSignClassifier` والتصويت.
   - `TrackingQualityMeter`: الانتقال بين lost وweak وlocked.
   - `ObstacleDetector`: صورة موحدة تعطي near بعد 6 إطارات، وصورة مليئة بالتفاصيل لا تعطيه.
   - `DangerSoundPolicy`: التنبيه يحتاج نافذتين، وفترة الانتظار تُحترم.
   - `SignLexicon`: عبارات السيناريو الكاملة، والاحتواء، وإزالة التشكيل، و«لا» كحرف واحد، وحد 48 حرفاً.
   - `SceneMessage`: التحويل من وإلى JSON، ومنع التكرار.
2. **بناء التطبيق:** `xcodebuild` على محاكي iPhone بلا أخطاء، وتشغيله، والتأكد بلقطات شاشة من كل الشاشات واتجاه RTL والخط.
3. **قائمة تجربة يدوية على جهازين** (`docs/DEVICE_TEST_CHECKLIST.md`):
   - فحص الجاهزية كله ✓.
   - السيناريو العشري كاملاً في الاتجاهين، في وضع الطيران مع تشغيل الواي فاي والبلوتوث.
   - صفارة من جهاز ثالث تعطي وميضاً واهتزازاً.
   - تقريب الكاميرا الخلفية من جدار يعطي تنبيه الحاجز.
   - وضع الحروف: كتابة «سلام» ثم إرسالها.
   - تبديل الدور على جوال واحد.

## 11. المخاطر

| الخطر | التخفيف |
|---|---|
| دقة نقاط Vision تختلف قليلاً عن MediaPipe فتتغير عتبات العدّ | العتبات في ثوابت مركزية؛ وضع تصحيح مخفي في العدسة يعرض العدد والأنماط الخام لضبطها على الجهاز |
| حزمة الإملاء العربي غير محمّلة على جوال العرض | فحص الجاهزية + تعليمات واضحة + تجربة قبل العرض بيوم |
| Multipeer يحتاج إذن الشبكة المحلية وقد يتأخر الاكتشاف | طلب الإذن في الترحيب؛ إبقاء الواي فاي والبلوتوث مفعّلين؛ إعادة المحاولة تلقائياً |
| تعارض جلسة الصوت بين التسجيل والنطق | AudioHub يملك AVAudioSession وحده بفئة `.playAndRecord`، والنطق يمر عبر نفس الجلسة |
| حجم الحزمة (≈6MB موارد + خطوط) | مقبول |
