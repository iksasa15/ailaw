# Native SwiftUI «النظارة الذكية» App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port every feature of the React PWA (`web/`) into the iPhone app in `AI LAW/`, with all processing on-device (no server, no internet), and a redesigned Arabic RTL SwiftUI interface.

**Architecture:**
- All decision logic ported from the web lives in a local Swift package, `AI LAW/Packages/AILawCore`. It has no Apple media frameworks and is unit-tested with `swift test`. The logic covers finger counting, role hold, alphabet, word signs, lexicon, obstacle and danger policies, peer messages, settings, and conversation routing.
- The app target wraps Apple frameworks in small `@Observable` engines: AVFoundation, Vision, Speech, SoundAnalysis, AVSpeechSynthesizer and MultipeerConnectivity.
- Each engine converts device data into `AILawCore` types. SwiftUI screens bind to the engines through per-screen view models.

**Tech Stack:** Swift 6.3 toolchain, SwiftUI (iOS 26.4, Liquid Glass), Swift Testing, Vision, AVFoundation, Speech, SoundAnalysis, MultipeerConnectivity, CoreHaptics.

**Spec:** `docs/superpowers/specs/2026-10-07-swift-native-app-design.md`. Read it before starting any task.

## Global Constraints

- **Platform:** iPhone only. `IPHONEOS_DEPLOYMENT_TARGET = 26.4`, `TARGETED_DEVICE_FAMILY = 1`, `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"`, portrait only.
- **Dependencies:** none from third parties. The app makes zero network calls. `SFSpeechRecognizer` requests always set `requiresOnDeviceRecognition = true`.
- **Language:** every user-visible string is Arabic. The root view sets `.environment(\.layoutDirection, .rightToLeft)`.
- **Font:** Thmanyah Sans. PostScript names are exactly `thmanyahsans-Light`, `thmanyahsans-Regular`, `thmanyahsans-Medium`, `thmanyahsans-Bold`, `thmanyahsans-Black`.
- **Colors:**
  - accent `#0F766E`, accentSoft `#14B8A6`, accent2 `#1E5BB8`, danger `#DC2626`, highlight `#5EEAD4`
  - light mode: ink `#0B1C24`, bg `#E8F1F4`, muted `#4A6570`
- **Web code is the authority.** Thresholds, timings, phrase text and Arabic copy are ported verbatim from the web files cited in each task. When a task says "port X rule-for-rule", keep every constant and branch order, even unreachable branches.
- **Concurrency:** the app target keeps `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` and `SWIFT_VERSION = 5.0`. Delegate and capture callbacks that run on background queues are declared `nonisolated` and hop to the main actor with `Task { @MainActor in … }`. Shared mutable registries touched from those queues are guarded by `OSAllocatedUnfairLock`.
- **AILawCore:** Swift tools 6.2, language mode 6, all public types `Sendable` where possible, no `import UIKit/AVFoundation/Vision/Speech/SoundAnalysis/MultipeerConnectivity`.
- **Branch:** work in this checkout on branch `swift-native-app` (`git switch -c swift-native-app` before Task 1). Do not use a separate worktree: the Xcode project exists only in the working tree and index, not in any commit yet.
- **Commits:**
  - Commit only the paths a task touches, using `git commit -m "<msg>" -- <paths>`.
  - Never include `web/` or any `xcuserdata` path.
  - End every message with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Test commands:**
  - Core tests: `cd "AI LAW/Packages/AILawCore" && swift test` → ends with `Test run with N tests … passed`.
  - App build, from the repo root: `xcodebuild -project "AI LAW/AI LAW.xcodeproj" -scheme "AI LAW" -destination 'id=5D96A21D-DFEA-49F0-AFDF-A04D6C42CA45' build` → `** BUILD SUCCEEDED **`. That id is the iPhone 16 simulator on iOS 26.4.
- **Simulator smoke check:**
  - Install and launch the built app on that simulator with launch arguments, then take a screenshot. Use the iOS Simulator tool, or `xcrun simctl install/launch/io screenshot`.
  - Launch arguments are read through `UserDefaults`:
    - `-uiOnboarded YES|NO` overrides `onboarded`.
    - `-uiTab lens|session|lab|more` selects the initial tab.
  - The simulator has no camera. The Lens must show the "camera unavailable" card there.
- **App-target tests:** the app target has no unit-test target (spec §10). Its verification is a clean build, a simulator screenshot, and the device checklist. Every decision that can be tested lives in `AILawCore`.

## Review Focus

1. **Partial hand.** Vision returns low-confidence joints when fingers are occluded (a fist, or a hand at the frame edge). Expected: the hand is dropped (lost/weak), and the app never produces a wrong finger count. Pinned by `fromJointsRejectsMostlyUnconfidentHand` in Task 1.
2. **Second hand flickering in and out.** The total jumps 5 ↔ 10 every frame. Expected: no phrase is accepted until one count is stable. Pinned by `secondHandFlickerNeverAccepts` in Task 3.
3. **Speech output without punctuation or hamza.** Example: `اين وقع الحادث` (no `؟` and no `أ`). Expected: it still resolves to the scenario's sign videos instead of letter-by-letter spelling. Pinned by `resolveMatchesWithoutPunctuationOrHamza` in Task 6.
4. **Speech running for many minutes.** Expected: the caption stays bounded and the snippet sent to the sign translator is still the last 12 words. Pinned by `accumulatorCapsAtWordBoundary` and `snippetFromVeryLongText` in Task 8.
5. **Malformed or foreign peer data.** Examples: garbage bytes, unknown `type`, empty text, `fingers: 0`. Expected: ignored, never a crash. Pinned by `decodeRejectsMalformedMessages` in Task 8.

---

## File Map

```
AI LAW/
├─ AppInfo.plist                                 (Task 10) UIAppFonts, NSBonjourServices, usage strings
├─ AI LAW.xcodeproj/project.pbxproj              (Task 10) platform settings + local package link
├─ Packages/AILawCore/
│  ├─ Package.swift                              (Task 1)
│  ├─ Sources/AILawCore/
│  │  ├─ Geometry/HandLandmarks.swift            (Task 1) Point3, Joint, HandLandmarks, planarDistance
│  │  ├─ Model/Role.swift                        (Task 1) Role, TrackingQuality, SignResult
│  │  ├─ Data/PhraseBook.swift                   (Task 1)
│  │  ├─ Data/CaseScenario.swift                 (Task 1)
│  │  ├─ Logic/FingerCounter.swift               (Task 2)
│  │  ├─ Logic/HandSmoother.swift                (Task 2)
│  │  ├─ Logic/TrackingQualityMeter.swift        (Task 2)
│  │  ├─ Logic/FingerPhraseMachine.swift         (Task 3)
│  │  ├─ Logic/AlphabetClassifier.swift          (Task 4)
│  │  ├─ Logic/AlphabetWriter.swift              (Task 4)
│  │  ├─ Logic/WordSignClassifier.swift          (Task 5) + WordSignVoter
│  │  ├─ Logic/SignArbiter.swift                 (Task 5)
│  │  ├─ Lexicon/SignLexicon.swift               (Task 6)
│  │  ├─ Logic/ObstacleDetector.swift            (Task 7)
│  │  ├─ Logic/DangerSoundPolicy.swift           (Task 7)
│  │  ├─ Session/SceneMessage.swift              (Task 8) ScenePhrase, SceneMessage, SceneDeduper
│  │  ├─ Settings/SettingsData.swift             (Task 8)
│  │  ├─ Speech/Transcript.swift                 (Task 8) SpeechSnippet, TranscriptAccumulator
│  │  └─ Session/ConversationRouter.swift        (Task 9) LensMode, LensAction, ConversationRouter
│  └─ Tests/AILawCoreTests/                      one *Tests.swift per source file + Support/HandFixture.swift
└─ AI LAW/                                        (synchronized folder: new files join the target automatically)
   ├─ App/AILawApp.swift, AppSettings.swift, Theme.swift, RootView.swift      (Task 10)
   ├─ App/AppEngines.swift                                                     (Task 11, grows in 12–14)
   ├─ Engines/CameraEngine.swift, HandTracker.swift                            (Task 11)
   ├─ Engines/AudioHub.swift, SpeechEngine.swift, SpeakEngine.swift, Haptics.swift   (Task 12)
   ├─ Engines/SoundAlertEngine.swift, ObstacleEngine.swift                     (Task 13)
   ├─ Engines/PeerSession.swift, ReadinessChecker.swift                        (Task 14)
   ├─ Components/PermissionCard.swift, CameraPreview.swift, HandSkeletonView.swift, DebugHUD.swift (Task 11)
   ├─ Components/GlassChip.swift, HoldRing.swift, AppButtonStyle.swift, SectionCard.swift, PageHeader.swift, SignCoachView.swift (Task 15)
   ├─ Features/Lab/LabView.swift, LabViewModel.swift                          (Task 15)
   ├─ Features/Lens/LensView.swift, LensViewModel.swift, LensOverlays.swift, LensControlsBar.swift, AlphabetPanel.swift (Task 16)
   ├─ Features/Session/SessionView.swift                                      (Task 17)
   ├─ Features/Onboarding/OnboardingView.swift                                (Task 18)
   ├─ Features/More/MoreView.swift, GuideView.swift, SettingsView.swift, ReadinessView.swift, AboutView.swift (Task 18)
   └─ Resources/Fonts/*.otf, SignVideos/*.mp4, Alphabet/*.jpg, Gestures/*.png (Task 10)
docs/DEVICE_TEST_CHECKLIST.md                                                  (Task 19)
```

Deleted in Task 10: `AI LAW/AI LAW/ContentView.swift`, `AI LAW/AI LAW/Item.swift`, `AI LAW/AI LAW/AI_LAWApp.swift`.

**Deviations from the spec:**

| The spec says | This plan does | Reason |
|---|---|---|
| `Resources/Info.plist` | `AI LAW/AppInfo.plist`, outside the synchronized folder | A plist inside that folder would be copied as a resource and collide with the generated Info.plist |
| Images in `Assets.xcassets` | Raw files in `Resources/`, loaded with `UIImage(named: "alef.jpg")` | Avoids 42 generated imagesets |

---

## Phase 1: AILawCore (pure logic, TDD)

### Task 1: Package scaffold, core types, phrase data, test fixture

**Files:**
- Create: `AI LAW/Packages/AILawCore/Package.swift`, `AI LAW/Packages/AILawCore/.gitignore` (contents: `.build/` and `.swiftpm/`, so `swift test` output is never committed)
- Create: `Sources/AILawCore/Geometry/HandLandmarks.swift`, `Model/Role.swift`, `Data/PhraseBook.swift`, `Data/CaseScenario.swift`
- Test: `Tests/AILawCoreTests/Support/HandFixture.swift`, `Tests/AILawCoreTests/CoreTypesTests.swift`

**Interfaces:**
- Produces:
  - `Point3(_ x: Double, _ y: Double, _ z: Double = 0)` with `var x, y, z`
  - `enum Joint: Int, CaseIterable`: `wrist = 0, thumbCMC, thumbMCP, thumbIP, thumbTip, indexMCP, indexPIP, indexDIP, indexTip, middleMCP, middlePIP, middleDIP, middleTip, ringMCP, ringPIP, ringDIP, ringTip, littleMCP, littlePIP, littleDIP, littleTip`. This is MediaPipe order.
  - `struct HandLandmarks: Equatable, Sendable`:
    - `let points: [Point3]` — image space, origin top-left, y down, normalized 0…1
    - `init?(points: [Point3])` — nil unless exactly 21 points
    - `subscript(_ j: Joint) -> Point3`
    - `static func fromJoints(_ joints: [Joint: (point: Point3, confidence: Double)], minConfidence: Double = 0.3, minConfidentJoints: Int = 16) -> HandLandmarks?`
  - `func planarDistance(_ a: Point3, _ b: Point3) -> Double` — `hypot(dx, dy)`, z ignored, same as web `dist`
  - `enum Role: String, Codable, Sendable, CaseIterable { case lawyer, person }`:
    - `var label: String` → `"محامي"` / `"شخص"`
    - `var modeAnnouncement: String` → `"وضع المحامي"` / `"وضع الشخص"`
  - `enum TrackingQuality: String, Sendable { case lost, weak, locked }`
  - `struct SignResult: Equatable, Sendable { var fingers: Int?; var display: String; var role: Role?; var confidence: Double; var accepted: Bool }`, with a memberwise `init` whose defaults are `fingers: nil, role: nil`
  - `struct PhraseBook: Equatable, Sendable`:
    - `static let defaultLawyer: [Int: String]`, `static let defaultPerson: [Int: String]`
    - `var lawyer, person`
    - `init(lawyer: = defaultLawyer, person: = defaultPerson)`
    - `static func merge(_ custom: [Int: String]?, defaults: [Int: String]) -> [Int: String]`
    - `func phrase(for role: Role, fingers: Int) -> String?`
  - `struct ScenarioLine: Equatable, Sendable { let role: Role; let fingers: Int; let text: String }`
  - `enum CaseScenario { static let title, subtitle: String; static let lines: [ScenarioLine] }`

- [ ] **Step 1: Create the package manifest**

`swift-tools-version: 6.2`. Package and library `AILawCore`, test target `AILawCoreTests`. Platforms `.iOS(.v26), .macOS(.v26)`.

- [ ] **Step 2: Write the test fixture** (`Support/HandFixture.swift`)

This geometry is calibrated against the web thresholds. Keep it exactly:

```swift
@testable import AILawCore

enum Finger: Hashable { case thumb, index, middle, ring, little }

enum HandFixture {
    /// Wrist at origin, fingers pointing up (y decreases). Thumb on the left.
    static func hand(extended: Set<Finger>, spacing: Double = 0.08,
                     thumbTipNear: Finger? = nil, origin: (x: Double, y: Double) = (0.5, 0.85)) -> HandLandmarks {
        func p(_ x: Double, _ y: Double) -> Point3 { Point3(origin.x + x, origin.y + y) }
        var pts = [Point3](repeating: p(0, 0), count: 21)
        let thumbOut = extended.contains(.thumb)
        pts[1] = p(-0.10, -0.08)
        pts[2] = thumbOut ? p(-0.18, -0.16) : p(-0.12, -0.16)
        pts[3] = thumbOut ? p(-0.25, -0.22) : p(-0.05, -0.24)
        pts[4] = thumbOut ? p(-0.33, -0.28) : p(0.03, -0.22)
        let fingers: [(Finger, Int)] = [(.index, 5), (.middle, 9), (.ring, 13), (.little, 17)]
        for (i, (finger, base)) in fingers.enumerated() {
            let bx = (Double(i) - 1.5) * spacing
            let out = extended.contains(finger)
            pts[base] = p(bx, -0.30)
            pts[base + 1] = p(bx, -0.40)
            pts[base + 2] = out ? p(bx, -0.47) : p(bx, -0.33)
            pts[base + 3] = out ? p(bx, -0.55) : p(bx, -0.27)
        }
        if let near = thumbTipNear, near != .thumb {
            let tipIndex = [Finger.index: 8, .middle: 12, .ring: 16, .little: 20][near]!
            pts[4] = Point3(pts[tipIndex].x + 0.02, pts[tipIndex].y)
        }
        return HandLandmarks(points: pts)!
    }
}
```

- [ ] **Step 3: Write failing tests** (`CoreTypesTests.swift`)

- `handLandmarksRequires21Points`: `HandLandmarks(points: Array(repeating: Point3(0,0), count: 20)) == nil`; with 21 points it is non-nil.
- `fromJointsKeepsMediaPipeOrder`: build a dict from a fixture's 21 points with confidence 0.9. The result's `points` equal the fixture's `points`.
- `fromJointsRejectsMostlyUnconfidentHand` (Review Focus 1): 6 joints at confidence 0.1 (only 15 confident) → `nil`. Remove one key entirely → `nil`.
- `phraseBookDefaults`:
  - `PhraseBook().phrase(for: .lawyer, fingers: 1) == "السلام عليكم، أنا محاميك"`
  - `phrase(for: .person, fingers: 10) == "أعتمد عليك"`
  - fingers `0` and `11` → `nil`
- `phraseBookMergeTrimsAndFallsBack`: `merge([3: "  نص  ", 4: "   "], defaults: PhraseBook.defaultPerson)` gives `[3] == "نص"` and `[4] == PhraseBook.defaultPerson[4]`.
- `caseScenarioShape`:
  - `lines.count == 20`
  - roles alternate starting with `.lawyer`
  - `lines[19].text == "أعتمد عليك"`
  - `CaseScenario.title == "جلسة حادث مروري"`

- [ ] **Step 4: Run tests and verify they fail.** Run `swift test`. Expected: compile errors for the missing types.

- [ ] **Step 5: Implement the types.**
  - Phrase text comes verbatim from `web/src/hooks/useFingerPhrases.js:4-29`.
  - The scenario comes from `web/src/data/caseScenario.js:4-29`.
  - `merge` trims each custom value and ignores empty ones, like `mergePhraseMap`.
  - `fromJoints` keeps the reported location of low-confidence joints. It returns nil only when a joint is missing or fewer than `minConfidentJoints` reach `minConfidence`.

- [ ] **Step 6: Run tests and verify they pass.** Run `swift test`. Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git switch -c swift-native-app
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): add AILawCore package with hand, role, phrase and scenario types" -- "AI LAW/Packages/AILawCore"
```

---

### Task 2: Finger counting, smoothing, tracking quality

**Files:**
- Create: `Sources/AILawCore/Logic/FingerCounter.swift`, `Logic/HandSmoother.swift`, `Logic/TrackingQualityMeter.swift`
- Test: `Tests/AILawCoreTests/FingerCounterTests.swift`, `TrackingQualityTests.swift`

**Interfaces:**
- Consumes: `HandLandmarks`, `Joint`, `planarDistance`, `TrackingQuality` (Task 1)
- Produces:
  - `struct FingerFlags: Equatable, Sendable`:
    - `var thumb, index, middle, ring, little: Bool`
    - `var pattern: String` — 5 chars in order thumb, index, middle, ring, little, e.g. `"10001"`
    - `var count: Int`
  - `enum FingerCounter`:
    - `static func flags(_ hand: HandLandmarks) -> FingerFlags`
    - `static func count(_ hand: HandLandmarks) -> Int` — max 5
    - `static func count(hands: [HandLandmarks]) -> Int` — max 10
  - `struct HandSmoother: Sendable`:
    - `init(alpha: Double = 0.35)`
    - `mutating func smooth(_ hands: [HandLandmarks]) -> [HandLandmarks]`
    - `mutating func reset()`
  - `func landmarkMotion(_ a: HandLandmarks?, _ b: HandLandmarks?) -> Double`
  - `struct TrackingQualityMeter: Sendable`:
    - `private(set) var quality: TrackingQuality` (starts `.lost`)
    - `mutating func update(previous: [HandLandmarks], current: [HandLandmarks]) -> TrackingQuality`

- [ ] **Step 1: Write failing tests**

- `countsSingleHand`: fixtures give these counts:

  | Extended fingers | Count |
  |---|---|
  | `[]` | 0 |
  | `[.index]` | 1 |
  | `[.index,.middle]` | 2 |
  | `[.index,.middle,.ring]` | 3 |
  | `[.index,.middle,.ring,.little]` | 4 |
  | all five | 5 |

- `countsTwoHandsUpToTen`: two all-five hands (second with `origin: (0.2, 0.85)`) → `count(hands:) == 10`.
- `flagsPattern`: `[.thumb, .little]` → `pattern == "10001"`.
- `qualityLockedAfterTenStillFrames`:
  - First `update(previous: [], current: [h])` → `.weak`.
  - Then 9 updates with identical `h` → still `.weak`.
  - The 10th → `.locked`.
- `qualityDropsToWeakOnJump`: once locked, one update with a hand shifted by `+0.1` in x → `.weak`. This is the stable 10 → 8 path.
- `qualityLostAfterFiveEmptyFrames`: once locked, 4 empty updates keep `.locked`, and the 5th gives `.lost`.
- `smootherBlends`: previous hand at x offset 0, new hand at +0.1 → smoothed x moves by `0.035`.

- [ ] **Step 2: Run tests and verify they fail.** Run `swift test`. Expected: missing symbols.

- [ ] **Step 3: Implement.**
  - `flags` / `count`: `web/src/hooks/useAlphabetSign.js:8-27` (`fingerFlags`) and `useFingerPhrases.js:68-98`. A finger is extended when `tip-wrist > pip-wrist × 1.12`. The thumb is extended when `thumbTip-littleMCP > thumbIP-littleMCP × 1.08`.
  - `HandSmoother`: `useHands.js:35-43`, per hand index.
  - `landmarkMotion`: `useHands.js:45-54`.
  - `TrackingQualityMeter`: `useHands.js:270-295`.
    - Motion is averaged over two hands when both exist.
    - `motion < 0.012` → `stable += 1`, else `stable = max(0, stable - 2)`.
    - `stable ≥ 10` → locked, otherwise weak.
    - On an empty frame, `stable = 0` and `lost += 1`. At `lost ≥ 5` → `.lost`.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): port finger counting, smoothing and tracking quality" -- "AI LAW/Packages/AILawCore"
```

---

### Task 3: FingerPhraseMachine (phrase acceptance + hold-to-switch role)

**Files:**
- Create: `Sources/AILawCore/Logic/FingerPhraseMachine.swift`
- Test: `Tests/AILawCoreTests/FingerPhraseMachineTests.swift`

**Interfaces:**
- Consumes: `FingerCounter.count(hands:)`, `PhraseBook`, `Role`, `TrackingQuality`, `SignResult`
- Produces: `struct FingerPhraseMachine: Sendable` with:
  - `static let tickInterval: Double = 0.12`
  - `init(lockedRole: Role? = nil, stableNeed: Int = 10, roleHoldSeconds: Double = 5)`
  - `let lockedRole: Role?`
  - `private(set) var role: Role` — starts at `lockedRole ?? .person`
  - `private(set) var result: SignResult?`
  - `private(set) var roleHoldProgress: Double`
  - `mutating func tick(hands: [HandLandmarks], quality: TrackingQuality, phrases: PhraseBook, now: Double) -> Role?` — returns the new role on the tick a hold-switch completes
  - `mutating func setRole(_ next: Role) -> Bool` — manual toggle. Returns false when locked or unchanged. Clears `result`.
  - `mutating func reset()`

- [ ] **Step 1: Write failing tests.** Each test ticks with `now` advancing by 0.12. `P` is `PhraseBook()`.

- `acceptsAfterTenStableTicksWhenLocked`:
  - Three fingers, `.locked`.
  - After tick 9, `result?.accepted == false`. This is the preview, `display == "الحادث عند الإشارة"`.
  - After tick 10: `accepted == true`, `fingers == 3`, `role == .person`.
- `needsFourteenTicksWhenWeak`: three fingers, `.weak`. Through tick 13, `result == nil` (no preview when weak). At tick 14, accepted.
- `holdOneFingerFiveSecondsSwitchesToLawyer`:
  - One finger, `.locked`.
  - `tick` returns `.lawyer` exactly on the first tick where elapsed hold ≥ 5.0 s.
  - Afterwards `role == .lawyer` and `roleHoldProgress == 0`.
- `noPhraseWhileHolding`: one finger, `.locked`, 20 ticks (2.4 s) → `result?.accepted != true`.
- `acceptsLawyerPhraseAfterSwitch`: continue the hold test for 10 more ticks → accepted `display == "السلام عليكم، أنا محاميك"`.
- `lockedRoleIgnoresHold`: `lockedRole: .lawyer`, one finger for 6 s → `tick` never returns a role. `result` is accepted with lawyer phrase 1 after tick 10.
- `secondHandFlickerNeverAccepts` (Review Focus 2): 30 ticks alternating `[five]` and `[five, five]` → `result?.accepted != true` on every tick.
- `lostResetsState`: after an acceptance, one tick with `.lost` → `result == nil` and `roleHoldProgress == 0`.
- `manualSetRole`:
  - `setRole(.lawyer)` → true. Calling it again → false.
  - A locked machine's `setRole` → false.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.** Port the `useFingerPhrases` hook body, `web/src/hooks/useFingerPhrases.js:105-303`, rule-for-rule:
  - streak counting
  - `roleCandidate` (1 → lawyer, 2 → person), counted only when not locked and quality is `.locked`
  - `roleHolding = 0.08 < progress < 1`
  - `phraseNeed = locked ? stableNeed : stableNeed + 4`
  - accepted confidence `min(0.95, 0.55 + count × 0.03)`
  - preview when locked and `count ≥ 3`, with confidence `0.35 + count × 0.05` and `accepted: false`
  - the `lastAccepted` key `role:fingers:phrase`

  `quality == .lost` → `reset()` and return nil. An empty `hands` → return nil and leave state unchanged.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): port finger phrase state machine with hold-to-switch role" -- "AI LAW/Packages/AILawCore"
```

---

### Task 4: Alphabet classifier and writer

**Files:**
- Create: `Sources/AILawCore/Logic/AlphabetClassifier.swift`, `Logic/AlphabetWriter.swift`
- Test: `Tests/AILawCoreTests/AlphabetTests.swift`

**Interfaces:**
- Consumes: `FingerCounter.flags`, `HandLandmarks`, `planarDistance`, `TrackingQuality`
- Produces:
  - `struct LetterGuess: Equatable, Sendable { let letter: String; let confidence: Double }`
  - `enum AlphabetClassifier { static func classify(_ hand: HandLandmarks?) -> LetterGuess? }`
  - `struct AlphabetWriter: Sendable` with:
    - `static let tickInterval = 0.1`
    - `init(holdSeconds: Double = 3, appendCooldown: Double = 0.5)`
    - `private(set) var text: String`, `current: LetterGuess?`, `holdProgress: Double`
    - `mutating func tick(hand: HandLandmarks?, quality: TrackingQuality, now: Double) -> Bool` — true on the tick a letter is appended
    - `mutating func backspace()`, `mutating func space()`, `mutating func clear()`

- [ ] **Step 1: Write failing tests**

- `classifiesPatternTable` (parameterized `@Test(arguments:)`), fixture extended set → letter. Spacing is 0.08 unless stated.

  | Extended | Letter |
  |---|---|
  | `[.thumb]` | `أ` |
  | `[.index]` | `ب` |
  | `[.index,.middle]` | `ت` |
  | `[.index,.middle,.ring]` | `ث` |
  | `[.middle]` | `د` |
  | `[.ring]` | `ر` |
  | `[.little]` | `ي` (0.72) |
  | `[.thumb,.little]` | `ي` (0.85) |
  | `[.thumb,.index]` | `ل` |
  | `[.index,.middle,.ring,.little]` | `ب` (0.78) |
  | all five | `ش` |
  | all five, `spacing: 0.06` | `س` |
  | `[]` | `م` |
  | `[.index,.little]` | `لا` |
  | `[.thumb,.middle,.ring,.little]` | `ص` |
  | `[.thumb,.index,.middle]` | `ظ` |
  | `[.middle,.ring,.little]` | `ض` |

- `pinchFallthroughs`:
  - `hand(extended: [.middle,.ring], thumbTipNear: .index)` → `ف`
  - `hand(extended: [.index,.ring], thumbTipNear: .index)` → `ق`
- `nilHandIsNil`: `classify(nil) == nil`.
- `writerAppendsAfterThreeSecondHold`:
  - Hold `[.index]` (`.locked`) from `now = 0` in steps of 0.1.
  - The first `true` return comes at `now ≥ 3.0`, giving `text == "ب"`.
  - No further append before `now ≥ 6.0`, then `text == "بب"`.
- `writerResetsHoldOnLetterChange`: hold `ب` for 2 s, then switch to `ت` → `holdProgress` restarts near 0.
- `writerLostClearsCurrent`: `.lost` → `current == nil`, `holdProgress == 0`, and `text` is unchanged.
- `writerEditing`:
  - `space()` twice adds one `" "`.
  - `backspace()` removes the last character.
  - `clear()` empties the text.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.**
  - Port `classifyAlphabetLetter`, `tipSpread` and `thumbIndexPinch` from `web/src/hooks/useAlphabetSign.js:29-139` rule-for-rule. Keep the switch table, then the pinch rules, then the count fallbacks.
  - Port the writer from `useAlphabetSign.js:145-239`, including the "same letter needs 2× cooldown" rule and restarting the hold after an append.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): port alphabet sign classifier and hold-to-write" -- "AI LAW/Packages/AILawCore"
```

---

### Task 5: ArSL word heuristics, voting, and result arbitration

**Files:**
- Create: `Sources/AILawCore/Logic/WordSignClassifier.swift`, `Logic/SignArbiter.swift`
- Test: `Tests/AILawCoreTests/WordSignTests.swift`

**Interfaces:**
- Consumes: `HandLandmarks`, `SignResult`, `TrackingQuality`
- Produces:
  - `struct WordPrediction: Equatable, Sendable { let label: String; let display: String; let confidence: Double }`
  - `enum WordSignClassifier`:
    - `static let labels: [String]`
    - `static let displayNames: [String: String]`
    - `static func classify(_ hand: HandLandmarks) -> WordPrediction`
  - `struct WordSignVoter: Sendable` with:
    - `static let tickInterval = 0.45`
    - `init(threshold: Double = 0.38, voteSize: Int = 6, voteNeed: Int = 3)`
    - `private(set) var result: SignResult?`
    - `mutating func add(_ p: WordPrediction, quality: TrackingQuality) -> SignResult?`
    - `mutating func reset()`
  - `enum SignArbiter { static func pick(finger: SignResult?, word: SignResult?, wordEnabled: Bool) -> SignResult? }`

- [ ] **Step 1: Write failing tests**

- `classifyWords` (parameterized), fixture → `display`:

  | Extended | Display |
  |---|---|
  | all five | `السلام عليكم` (0.72) |
  | `[.thumb]` | `شكراً` |
  | `[.index]` | `هنا` |
  | `[]` | `يسكت` |
  | `[.index,.middle]` | `مساعدة` |
  | `[.index,.middle,.ring]` | `حب` |
  | `[.thumb,.index,.little]` | `قلق` |
  | `[.middle,.ring]` | `مرتبك` |

- `voterAcceptsAfterTwoLockedVotes`: add the `هنا` prediction twice with `.locked` → the second return is `accepted == true`, `display == "هنا"`.
- `voterNeedsFourVotesWhenWeak`: `threshold: 0.45`, `.weak`. Votes 1–3 are not accepted. The 4th is accepted.
- `voterGuessWhenWeakHighConfidence`: one `السلام عليكم` (0.72) with `.weak`, `threshold: 0.45` → `accepted == false`, display set.
- `arbiter`:
  - Accepted finger result beats an accepted word.
  - Unaccepted finger plus accepted word at 0.5 with `wordEnabled` → word.
  - Word at 0.44 → finger.
  - `finger: nil`, `wordEnabled: false` → nil.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.**
  - Labels and display names: `backend/app/services/arsl_service.py:8-32`.
  - Normalization: `normalize_landmarks` (`:43-52`). Wrist-relative, divided by the 3D distance from wrist to `middleMCP`.
  - Rules: `_finger_extended` and `_heuristic_predict` (`:55-99`), in the same branch order.
  - Voting: `web/src/hooks/useArsl.js:41-135`, all four floors:
    - `acceptFloor = locked ? min(threshold, 0.22) : threshold`
    - `tallyFloor = locked ? 0.15 : threshold × 0.85`
    - `need = locked ? min(voteNeed, 2) : voteNeed + 1`
    - `guessFloor = locked ? 0.18 : max(0.55, threshold + 0.12)`
  - Arbiter: `web/src/pages/Home.jsx:128-135`. The callers pass `threshold = max(0.45, settings.confidence)` (`Home.jsx:107`).

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): port ArSL word heuristics, voting and result arbitration" -- "AI LAW/Packages/AILawCore"
```

---

### Task 6: SignLexicon

**Files:**
- Create: `Sources/AILawCore/Lexicon/SignLexicon.swift`
- Test: `Tests/AILawCoreTests/SignLexiconTests.swift`

**Interfaces:**
- Consumes: `PhraseBook.defaultLawyer`
- Produces:
  - `enum SignClipKind: Sendable { case video, letter }`
  - `struct SignClip: Equatable, Sendable { let resource: String; let label: String; let kind: SignClipKind; var fileName: String }` — `fileName` is `resource + ".mp4"` for video and `".jpg"` for letters
  - `enum SignLexicon`:
    - `static let lawyerClips: [Int: [SignClip]]`
    - `static let letterClips: [String: SignClip]`
    - `static func normalize(_ text: String) -> String`
    - `static func fold(_ text: String) -> String`
    - `static func fingerspell(_ text: String, maxLetters: Int = 48) -> [SignClip]`
    - `static func resolve(text: String?, fingers: Int?, spellLetters: Bool) -> [SignClip]?`

- [ ] **Step 1: Write failing tests**

- `resolveByFingers`: `resolve(text: nil, fingers: 3, spellLetters: false)?.map(\.label) == ["أين", "وقع الحادث"]`.
- `resolveExactPhrase`: `"السلام عليكم، أنا محاميك"` → `lawyerClips[1]`.
- `resolveContainedPhrase`: `"قال أين وقع الحادث الآن"` → `lawyerClips[3]`.
- `resolveMatchesWithoutPunctuationOrHamza` (Review Focus 3):
  - `"ماذا حدث بالضبط"` → `lawyerClips[2]`
  - `"اين وقع الحادث"` → `lawyerClips[3]`
  - `"ـسأتابع القضية غدا"` → `lawyerClips[10]`
- `fingerspellWord`: `"مرحبا"` → resources `["meem","ra","ha","ba","alef"]`.
- `fingerspellLamAlefDigraph`: `"لا"` → one clip with resource `"la"`.
- `fingerspellIgnoresTashkeel`: `fingerspell("شُكْرًا") == fingerspell("شكرا")`.
- `fingerspellTaMarbuta`: `"قضية"` ends with resource `"ta_marbuta"`.
- `fingerspellCaps`: a 100-letter string → 48 clips.
- `spellLettersForcesSpelling`: scenario phrase 1 with `spellLetters: true` → every clip has `kind == .letter`.
- `resolveEmpty`: `resolve(text: "", fingers: nil, …) == nil` and `resolve(text: "!!!", fingers: nil, …) == nil`.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.**
  - Clip tables come verbatim from `web/src/data/signLexicon.js:19-71`. `S(file, label)` becomes `.video` with resource `file`, and `L(file, label)` becomes `.letter`.
  - `normalize`, `fingerspell` and `resolve`: `:73-151`, in the same order: fingers 1–10, then exact match, then contained match, then fingerspell.
  - **Extension over the web.** `fold(_:)` is used **only for comparing** against `PhraseBook.defaultLawyer`. It applies `normalize`, then:
    - removes `، ؛ ؟` (U+060C, U+061B, U+061F) and tatweel `ـ` (U+0640)
    - maps `أ إ آ ٱ` to `ا`, `ة` to `ه`, `ى` to `ي`
    - collapses spaces

    `fingerspell` always uses the unfolded `normalize` output.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): port sign lexicon with tolerant phrase matching" -- "AI LAW/Packages/AILawCore"
```

---

### Task 7: Obstacle detector and danger-sound policy

**Files:**
- Create: `Sources/AILawCore/Logic/ObstacleDetector.swift`, `Logic/DangerSoundPolicy.swift`
- Test: `Tests/AILawCoreTests/SafetyTests.swift`

**Interfaces:**
- Produces:
  - `struct ObstacleReading: Equatable, Sendable { let near: Bool; let shouldAlert: Bool; let score: Double }`
  - `struct ObstacleDetector: Sendable` with:
    - `static let width = 80, height = 60, tickInterval = 0.18`
    - `init(cooldown: Double = 4.5)`
    - `mutating func ingest(gray: [Float], now: Double) -> ObstacleReading` — gray is luma 0…255, row-major 80×60
    - `mutating func reset()`
  - `struct SoundGuess: Sendable { let identifier: String; let confidence: Double; init(_ identifier: String, _ confidence: Double) }`
  - `struct DangerAlert: Equatable, Sendable { let identifier: String; let label: String; let score: Double }`
  - `struct DangerSoundPolicy: Sendable` with:
    - `static let labels: [String: String]`
    - `init(threshold: Double = 0.5, windowsNeeded: Int = 2, cooldown: Double = 4)`
    - `mutating func ingest(_ guesses: [SoundGuess], now: Double) -> DangerAlert?`

- [ ] **Step 1: Write failing tests**

- `uniformFrameAlertsOnSixth`: a constant 120-gray frame ingested at 0.18 s steps.
  - Frames 1–5: `near == false`.
  - Frame 6: `near == true`, `shouldAlert == true`.
  - Frame 7: `near == true`, `shouldAlert == false`.
- `alertCooldown`: keep feeding uniform frames → the next `shouldAlert == true` comes at the first frame with `now - firstAlert ≥ 4.5`.
- `checkerboardNeverNear`: pixel = `(x+y)%2==0 ? 0 : 255`, 20 frames → `near` is never true.
- `darkFrameNeverNear`: all pixels 5 → `near` is never true.
- `streakDecays`: 6 uniform frames, then 3 checkerboard frames → `near == false`.
- `sirenNeedsTwoWindows`:
  - `[SoundGuess("siren", 0.8)]` once → nil.
  - Twice in a row → `DangerAlert(identifier: "siren", label: "صفارة إنذار", score: 0.8)`.
- `dangerCooldown`:
  - A third consecutive window → nil.
  - Two more windows at `now ≥ firstAlert + 4` → alert.
- `interruptedWindowsReset`: siren, speech (0.9), siren → nil.
- `lowConfidenceIgnored`: siren at 0.4 twice → nil.
- `nonDangerIgnored`: `dog_bark` 0.9 twice → nil.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.**
  - **Obstacle:** port `meanStd`, `edgeEnergy`, `frameDiff` and the decision block from `web/src/hooks/useObstacleProximity.js:50-165`:
    - `uniformClose = std < 26 && edges < 16 && mean in (20,230)`
    - `softClose = edges < 11 && mean in (28,215)`
    - `looming = softClose && diff in (7,48)`
    - the streak goes `+1` on a hit and `-2` otherwise
    - `near = streak ≥ 6`
    - `score = min(0.99, 0.55 + streak × 0.05)`
  - **Danger labels:**

    | Identifiers | Label |
    |---|---|
    | `siren`, `police_siren`, `ambulance_siren`, `fire_engine_siren`, `civil_defense_siren`, `emergency_vehicle` | `"صفارة إنذار"` |
    | `smoke_detector` | `"إنذار حريق"` |
    | `car_horn`, `air_horn` | `"بوق سيارة"` |
    | `alarm_clock` | `"منبّه"` |
    | `screaming` | `"صراخ"` |
    | `glass_breaking` | `"كسر زجاج"` |

  - **Danger policy:**
    - A window counts when any guess is in `labels` with `confidence ≥ threshold`.
    - Consecutive qualifying windows increment a counter. A non-qualifying window resets it to 0.
    - Alert when `counter ≥ windowsNeeded` and the cooldown has elapsed. The alert reports the best guess of the current window.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): add obstacle detector and danger sound policy" -- "AI LAW/Packages/AILawCore"
```

---

### Task 8: Peer messages, settings data, transcript helpers

**Files:**
- Create: `Sources/AILawCore/Session/SceneMessage.swift`, `Settings/SettingsData.swift`, `Speech/Transcript.swift`
- Test: `Tests/AILawCoreTests/SceneMessageTests.swift`, `SettingsDataTests.swift`, `TranscriptTests.swift`

**Interfaces:**
- Consumes: `Role`, `PhraseBook`
- Produces:
  - `struct ScenePhrase: Codable, Equatable, Sendable { var id: UUID; var role: Role; var text: String; var fingers: Int?; var at: Int64 }` — `at` is in milliseconds
  - `enum SceneMessage: Equatable, Sendable`:
    - `case phrase(ScenePhrase)`
    - `case snapshot(lawyer: ScenePhrase?, person: ScenePhrase?)`
    - `func encoded() -> Data`
    - `static func decode(_ data: Data) -> SceneMessage?`
  - `struct SceneDeduper: Sendable`:
    - `init(capacity: Int = 64)`
    - `mutating func isNew(_ p: ScenePhrase) -> Bool`
  - `struct SettingsData: Codable, Equatable, Sendable` with:
    - `fontScale = 1.0`, `overlayOpacity = 0.55`, `confidence = 0.38`
    - `receiveEnabled = true`, `sendEnabled = true`, `safetyEnabled = true`
    - `arslEnabled = false`, `onboarded = false`
    - `phrasePack = currentPhrasePack`
    - `lawyerPhrases = PhraseBook.defaultLawyer`, `personPhrases = PhraseBook.defaultPerson`
    - `static let currentPhrasePack = "accident-case-v1"`
    - `init()`
    - `static func decode(_ data: Data?) -> SettingsData`
    - `func encoded() -> Data`
    - `var phraseBook: PhraseBook`
  - `enum SpeechSnippet { static func latest(in text: String, maxWords: Int = 12) -> String? }`
  - `struct TranscriptAccumulator: Sendable` with:
    - `init(maxCharacters: Int = 400)`
    - `private(set) var committed: String`, `private(set) var current: String`
    - `var text: String`
    - `mutating func update(partial: String)`, `mutating func commit()`, `mutating func clear()`

- [ ] **Step 1: Write failing tests**

- `phraseRoundTrip`:
  - `decode(SceneMessage.phrase(p).encoded()) == .phrase(p)`.
  - The JSON object has keys `type` (`"phrase"`), `id`, `role` (`"lawyer"`), `text`, `fingers`, `at`.
- `snapshotRoundTripWithNull`: `.snapshot(lawyer: p, person: nil)` round-trips, and its JSON has `"person": null`.
- `decodeRejectsMalformedMessages` (Review Focus 5) → `nil` for each:
  - random bytes
  - `{"type":"hello"}`
  - a phrase with `"text":""`
  - a phrase with 201-character text
  - a phrase with `"fingers":0` or `"fingers":11`
  - a phrase with `"role":"judge"`
- `deduperById`:
  - The same `p` twice → `true` then `false`.
  - A different id with the same `at` and `text` → `false`.
  - A different text → `true`.
- `settingsDefaultsWhenNil`: `SettingsData.decode(nil) == SettingsData()`.
- `settingsPartialJSONKeepsDefaults`: `{"fontScale":1.3}` → `fontScale == 1.3`, everything else at defaults.
- `settingsOldPackResetsPhrases`: `{"phrasePack":"old","lawyerPhrases":{"1":"x"}}` → `lawyerPhrases == PhraseBook.defaultLawyer` and `phrasePack == "accident-case-v1"`.
- `settingsMergesCustomPhrases`: current pack with `{"3":"نص جديد","4":"  "}` → `[3] == "نص جديد"`, `[4]` is the default.
- `settingsRoundTrip`: `decode(s.encoded()) == s`.
- `snippetEdges`: `"  "` → nil; `"ا"` → nil; `"مرحبا"` → `"مرحبا"`.
- `snippetFromVeryLongText` (Review Focus 4): 500 words `w1 … w500` → `"w489 … w500"`, 12 words separated by single spaces.
- `accumulatorJoins`: `update("مرحبا")`, `commit()`, `update("كيف")` → `text == "مرحبا كيف"`.
- `accumulatorCapsAtWordBoundary` (Review Focus 4): 200 commits of `"كلمة طويلة"` → `text.count ≤ 400`, and `text` starts with `"كلمة"`, never a word fragment.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.**
  - **SceneMessage:** custom `Codable` with a flat `type` discriminator. Nested snapshot phrases carry no `type`. `decode` returns nil on any decoding error or validation failure. Validation: text trimmed length 1…200, fingers nil or 1…10.
  - **SettingsData:** `init(from:)` uses `decodeIfPresent` with property defaults. `decode` then resets phrases when `phrasePack != currentPhrasePack`, and otherwise merges them through `PhraseBook.merge`. Its behavior mirrors `web/src/app/SettingsContext.jsx:9-48`.
  - **SpeechSnippet:** the logic from `Home.jsx:321-325`. It returns nil when the trimmed text has fewer than 2 characters.
  - **Transcript cap:** drop whole words from the front until the text fits.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): add peer scene messages, settings data and transcript helpers" -- "AI LAW/Packages/AILawCore"
```

---

### Task 9: ConversationRouter (who speaks, publishes, shows)

**Files:**
- Create: `Sources/AILawCore/Session/ConversationRouter.swift`
- Test: `Tests/AILawCoreTests/ConversationRouterTests.swift`

**Interfaces:**
- Consumes: `SignResult`, `Role`, `ScenePhrase`, `SceneMessage`, `SceneDeduper`
- Produces:
  - `enum LensMode: Equatable, Sendable { case solo; case dedicated(Role) }`
  - `enum LensAction: Equatable, Sendable { case speak(String), publish(ScenePhrase), showLawyerPhrase(ScenePhrase), showRemotePerson(ScenePhrase), pulse }`
  - `struct ConversationRouter` with:
    - `init(mode: LensMode, makeID: @escaping @Sendable () -> UUID = { UUID() })`
    - `let mode: LensMode`
    - `private(set) var lawyerPhrase: ScenePhrase?` — the newest by `at`
    - `private(set) var lastPersonPhrase: ScenePhrase?` — the last person phrase published locally, used for snapshots
    - `mutating func signResult(_ r: SignResult, currentRole: Role, roleHoldProgress: Double, now: Int64) -> [LensAction]`
    - `mutating func speechSnippet(_ snippet: String, currentRole: Role, now: Int64) -> [LensAction]`
    - `mutating func alphabetSend(_ text: String, now: Int64) -> [LensAction]`
    - `mutating func remote(_ message: SceneMessage) -> [LensAction]`
    - `mutating func roleChanged(to role: Role) -> [LensAction]`
    - `mutating func resetSpoken()`
    - `func snapshot() -> SceneMessage`

- [ ] **Step 1: Write failing tests.** Use `makeID: { fixedUUID }` and `now: 1000` unless stated. `p(role, text, fingers, at)` is a helper that builds a `ScenePhrase` with `fixedUUID`.

- `soloLawyerAccepted`: `signResult(SignResult(fingers: 1, display: L1, role: .lawyer, confidence: 0.9, accepted: true), currentRole: .lawyer, roleHoldProgress: 0, now: 1000)` returns `[.showLawyerPhrase(p(.lawyer, L1, 1, 1000)), .publish(same), .speak(L1), .pulse]`.
- `duplicateKeyIgnored`: the identical second call → `[]`.
- `unacceptedIgnored`: `accepted: false` → `[]`.
- `soloRoleHoldSuppressesOneAndTwo`: fingers 2, `roleHoldProgress: 0.5`, `.solo` → `[]`. The same call in `.dedicated(.lawyer)` is not suppressed.
- `dedicatedPersonPublishesSilently`: `.dedicated(.person)`, person result with fingers 3 → `[.publish(p(.person, P3, 3, 1000)), .pulse]`.
- `dedicatedLawyerSpeaksRemotePerson`:
  - `remote(.phrase(personP))` → `[.showRemotePerson(personP), .speak(personP.text)]`.
  - The same message again → `[]`.
- `snapshotPersonShownNotSpoken`: `.dedicated(.lawyer)`, `remote(.snapshot(lawyer: nil, person: personP))` → `[.showRemotePerson(personP)]`.
- `olderRemoteLawyerIgnored`: a local lawyer phrase at 2000, then a remote lawyer phrase at 1500 → `[]`, and `lawyerPhrase?.at == 2000`.
- `speechSnippetDedicatedLawyer`: `.dedicated(.lawyer)`, `speechSnippet("أين وقع الحادث", currentRole: .lawyer, now: 1000)` → `[.showLawyerPhrase(x), .publish(x)]`, where `x` has role `.lawyer` and fingers nil. The same snippet again → `[]`.
- `speechSnippetSoloPerson`: `.solo`, `currentRole: .person` → `[.showLawyerPhrase(x)]` only.
- `alphabetSend`:
  - `.dedicated(.person)` → `[.publish(p(.person, "سلام", nil, 1000))]`.
  - `.solo` → `[.publish(…), .speak("سلام")]`.
  - Whitespace-only text → `[]`.
- `roleChangedAnnouncesAndResets`:
  - In `.solo`, after an accepted result, `roleChanged(to: .lawyer) == [.speak("وضع المحامي")]`.
  - Re-sending the same result is no longer `[]`.
- `dedicatedIgnoresRoleChanged`: → `[]`.
- `snapshotCarriesLatest`: after a local person publish and a remote lawyer phrase, `snapshot() == .snapshot(lawyer: thatLawyer, person: thatPerson)`.

- [ ] **Step 2: Run tests and verify they fail.**

- [ ] **Step 3: Implement.** Mirror `web/src/pages/Home.jsx`:
  - `signResult` follows `:260-306`. The key is `"\(role):\(fingers):\(display)"` when fingers are present, otherwise `display`. `spokenRole = r.role ?? currentRole`. There is no speak when the mode is `.dedicated(.person)`.
  - `speechSnippet` follows `:312-348`, without the debounce. The debounce stays in the view model.
  - `alphabetSend` follows `:137-170`.
  - `remote` follows `:186-200`. Snapshot entries go through the same dedupe, but person phrases from snapshots are never spoken.
  - `lawyerPhrase` keeps the newest by `at` (`:209-215`).

- [ ] **Step 4: Run tests and verify they pass.** Run the full `swift test`. Expected: every core test passes.

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/Packages/AILawCore"
git commit -m "feat(core): add conversation router for solo and two-phone flows" -- "AI LAW/Packages/AILawCore"
```

---

## Phase 2: App target

### Task 10: Project configuration, resources, theme, settings, tab shell

**Files:**
- Modify: `AI LAW/AI LAW.xcodeproj/project.pbxproj`
- Create: `AI LAW/AppInfo.plist`
- Delete: `AI LAW/AI LAW/ContentView.swift`, `AI LAW/AI LAW/Item.swift`, `AI LAW/AI LAW/AI_LAWApp.swift`
- Create: `AI LAW/AI LAW/App/AILawApp.swift`, `App/AppSettings.swift`, `App/Theme.swift`, `App/RootView.swift`
- Create (copied): `AI LAW/AI LAW/Resources/Fonts/` (5 `.otf` from `fonts/`), `Resources/SignVideos/` (all `web/public/signs/videos/*.mp4`), `Resources/Alphabet/` (`web/public/signs/alphabet/*.jpg` except `_*.jpg`), `Resources/Gestures/` (`web/public/gestures/*.png`)
- Modify: `AI LAW/AI LAW/Assets.xcassets/AccentColor.colorset/Contents.json` (#0F766E), `AppIcon.appiconset/` (1024 px icon made from `web/public/pwa-512.png` with `sips -z 1024 1024`)

**Interfaces:**
- Consumes: `SettingsData` (Task 8)
- Produces:
  - `@Observable final class AppSettings`:
    - `var data: SettingsData` — saved to `UserDefaults` key `"sg-settings"` on every set
    - `init(defaults: UserDefaults = .standard)` — applies the `-uiOnboarded` override
    - `func resetAll()`
  - `enum Theme`: static colors `accent, accentSoft, accent2, danger, highlight, ink, bg, surface, muted`. The adaptive ones define light and dark values; dark uses ink `#E8F1F4`, bg `#0B1C24`, surface `#152A33` @0.85, muted `#9DB4BD`.
  - `enum ThemeWeight { case light, regular, medium, bold, black }`
  - `extension View { func appFont(_ size: CGFloat, _ weight: ThemeWeight = .regular) -> some View }` — multiplies by the `\.appFontScale` environment value
  - `enum AppTab: String { case lens, session, lab, more }`
  - `RootView`: shows Onboarding (a placeholder `Text` until Task 18) when `!onboarded`, otherwise a `TabView` with `Tab` items:

    | Tab | Title | SF Symbol |
    |---|---|---|
    | lens | `"عدسة"` | `eyeglasses` |
    | session | `"جلسة"` | `iphone.gen3.radiowaves.left.and.right` |
    | lab | `"معمل"` | `flask` |
    | more | `"المزيد"` | `ellipsis.circle` |

    Each tab shows a placeholder until its task lands.

- [ ] **Step 1: Edit the target build settings** (both target configurations `E24C653D…` and `E24C653E…`).
  - Set:
    - `SDKROOT = iphoneos`
    - `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"`
    - `TARGETED_DEVICE_FAMILY = 1`
    - `SUPPORTS_MACCATALYST = NO`
    - `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO`
    - `SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD = NO`
    - `INFOPLIST_FILE = AppInfo.plist`
    - `INFOPLIST_KEY_CFBundleDisplayName = "النظارة الذكية"`
    - `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = UIInterfaceOrientationPortrait`
  - Remove: `MACOSX_DEPLOYMENT_TARGET`, `XROS_DEPLOYMENT_TARGET`, `ENABLE_APP_SANDBOX`, `ENABLE_HARDENED_RUNTIME`, `ENABLE_USER_SELECTED_FILES`, `REGISTER_APP_GROUPS`, `"LD_RUNPATH_SEARCH_PATHS[sdk=macosx*]"`, `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad`.

- [ ] **Step 2: Link the local package in the pbxproj.**
  - Add `packageReferences = ( E24C66023076BF30004E90F5 );` to the `PBXProject` object.
  - Add `E24C66033076BF30004E90F5` to the target's `packageProductDependencies`.
  - Add `E24C66013076BF30004E90F5` to the Frameworks phase `files`.
  - Add these sections:

```
/* Begin PBXBuildFile section */
		E24C66013076BF30004E90F5 /* AILawCore in Frameworks */ = {isa = PBXBuildFile; productRef = E24C66033076BF30004E90F5 /* AILawCore */; };
/* End PBXBuildFile section */
/* Begin XCLocalSwiftPackageReference section */
		E24C66023076BF30004E90F5 /* XCLocalSwiftPackageReference "Packages/AILawCore" */ = {
			isa = XCLocalSwiftPackageReference;
			relativePath = Packages/AILawCore;
		};
/* End XCLocalSwiftPackageReference section */
/* Begin XCSwiftPackageProductDependency section */
		E24C66033076BF30004E90F5 /* AILawCore */ = {
			isa = XCSwiftPackageProductDependency;
			productName = AILawCore;
		};
/* End XCSwiftPackageProductDependency section */
```

- [ ] **Step 3: Create `AppInfo.plist`** with:
  - `UIAppFonts`: the 5 `.otf` file names
  - `NSBonjourServices`: `_ailaw-scene._tcp` and `_ailaw-scene._udp`
  - `NSCameraUsageDescription`: `"الكاميرا تلتقط إشارات يدك وتنبّهك للحواجز القريبة."`
  - `NSMicrophoneUsageDescription`: `"المايك يحوّل كلام المحامي إلى نص ويرصد أصوات الخطر."`
  - `NSSpeechRecognitionUsageDescription`: `"التعرف على الكلام العربي يتم على جهازك بدون إنترنت."`
  - `NSLocalNetworkUsageDescription`: `"للاتصال المباشر بجوال المحامي أو الشخص القريب."`

- [ ] **Step 4: Copy the resources and delete the template files.** Use `cp` for the resources and plain `rm` for `ContentView.swift`, `Item.swift` and `AI_LAWApp.swift`. Those three were only staged, never committed, so `git rm` would refuse them; the `git add -A` in Step 8 drops them from the index.

- [ ] **Step 5: Write `AILawApp.swift`, `AppSettings.swift`, `Theme.swift`, `RootView.swift`.**
  - Inject `AppSettings` with `.environment(settings)`.
  - The root applies `.environment(\.layoutDirection, .rightToLeft)`, `.environment(\.locale, Locale(identifier: "ar"))`, `.tint(Theme.accent)`, and `\.appFontScale` from `settings.data.fontScale`.
  - In `#if DEBUG`, `assert(UIFont(name: "thmanyahsans-Regular", size: 12) != nil)` at launch.

- [ ] **Step 6: Build.** Run the global build command. Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 7: Run a simulator smoke check.**
  - Launch with `-uiOnboarded YES -uiTab lab`.
  - Screenshot. Expected: the tab bar is on the bottom with Arabic labels ordered right-to-left (عدسة at the right edge), and placeholder text uses the Thmanyah font.

- [ ] **Step 8: Commit**

```bash
git add -A "AI LAW/AppInfo.plist" "AI LAW/AI LAW.xcodeproj/project.pbxproj" "AI LAW/AI LAW"
git commit -m "feat(app): configure iPhone-only target, link AILawCore, add theme, settings and tab shell" -- "AI LAW/AppInfo.plist" "AI LAW/AI LAW.xcodeproj/project.pbxproj" "AI LAW/AI LAW" "AI LAW/AI LAW.xcodeproj/project.xcworkspace/contents.xcworkspacedata"
```

---

### Task 11: Camera, Vision hand tracking, skeleton overlay

**Files:**
- Create: `App/AppEngines.swift`, `Engines/CameraEngine.swift`, `Engines/HandTracker.swift`
- Create: `Components/PermissionCard.swift`, `Components/CameraPreview.swift`, `Components/HandSkeletonView.swift`, `Components/DebugHUD.swift`
- Modify: `App/RootView.swift` (the Lens tab temporarily shows camera + skeleton + HUD)

**Interfaces:**
- Consumes: `HandLandmarks.fromJoints`, `Joint`, `HandSmoother`, `TrackingQualityMeter`, `FingerCounter`, `AlphabetClassifier`
- Produces:
  - `@Observable final class AppEngines` with `let camera: CameraEngine`, `let hands: HandTracker`, injected with `.environment(engines)`
  - `@Observable final class CameraEngine: NSObject`:
    - `enum Status: Equatable { case idle, ready, denied, unavailable, failed(String) }`
    - `enum Facing { case front, back }`
    - `private(set) var status`, `var facing`
    - `let session: AVCaptureSession`
    - `private(set) var bufferSize: CGSize`
    - `func start() async`, `func stop()`
    - `func addConsumer(_ id: String, interval: TimeInterval, _ handler: @escaping @Sendable (CVPixelBuffer, TimeInterval) -> Void)`
    - `func removeConsumer(_ id: String)`
  - `@Observable final class HandTracker`:
    - `private(set) var hands: [HandLandmarks]`, `private(set) var quality: TrackingQuality`, `private(set) var fps: Double`
    - `func attach(to camera: CameraEngine)`, `func detach()`
  - `PermissionCard(title: String, message: String, showsSettingsButton: Bool, retry: (() -> Void)?)`
  - `CameraPreview(session: AVCaptureSession)`
  - `HandSkeletonView(hands: [HandLandmarks], quality: TrackingQuality, bufferSize: CGSize)`
  - `DebugHUD(hands: [HandLandmarks], quality: TrackingQuality, fps: Double, onInject: ((Int) -> Void)? = nil)` — Task 16 fills in `onInject`. The HUD shows the per-hand `FingerCounter.flags(...).pattern` and count, the total count, and the `AlphabetClassifier` guess

- [ ] **Step 1: Implement `CameraEngine`.**
  - Permission through `AVCaptureDevice.requestAccess(for: .video)`. A denial sets `.denied`. No device (the simulator) sets `.unavailable`.
  - Preset `.hd1280x720`.
  - `AVCaptureVideoDataOutput`: pixel format `kCVPixelFormatType_420YpCbCr8BiPlanarFullRange`, `alwaysDiscardsLateVideoFrames = true`, a serial delegate queue.
  - The output connection uses `videoRotationAngle = 90`, and `isVideoMirrored = (facing == .front)`. Buffers therefore arrive upright and look like the preview, with `bufferSize` 720×1280.
  - The delegate is `nonisolated`. Consumers sit in an `OSAllocatedUnfairLock<[String: Consumer]>`, and each is throttled by its `interval` against the frame timestamp.
  - `startRunning` and `stopRunning` run on a dedicated session queue.
  - Changing `facing` reconfigures the input.

- [ ] **Step 2: Implement `HandTracker`.**
  - Consumer id `"hands"`, interval `0.125`.
  - `VNDetectHumanHandPoseRequest` with `maximumHandCount = 2` and `VNImageRequestHandler(cvPixelBuffer:orientation: .up)`.
  - Map Vision joints to `Joint`:

    | Vision | Joint |
    |---|---|
    | `.wrist` | `.wrist` |
    | `.thumbCMC`, `.thumbMP`, `.thumbIP`, `.thumbTip` | `thumbCMC…thumbTip` |
    | `.indexMCP`, `.indexPIP`, `.indexDIP`, `.indexTip` | `indexMCP…indexTip` |
    | middle, ring, little | same pattern (`.littleMCP` → `.littleMCP`) |

  - Point conversion: `Point3(x: loc.x, y: 1 - loc.y)`. This turns Vision's bottom-left origin into the top-left origin of the MediaPipe space.
  - Build hands with `HandLandmarks.fromJoints`, then run `HandSmoother` and `TrackingQualityMeter`. These stay on the capture queue inside a non-isolated helper.
  - Publish `hands`, `quality` and `fps` to the main actor.

- [ ] **Step 3: Implement the views.**
  - `CameraPreview`: a `UIViewRepresentable` hosting a view whose `layerClass` is `AVCaptureVideoPreviewLayer`, with `.resizeAspectFill`.
  - `HandSkeletonView`:
    - A `Canvas` with aspect-fill mapping. `scale = max(w/bufW, h/bufH)`, `off = ((w - bufW·scale)/2, (h - bufH·scale)/2)`, and `pt = (x·bufW·scale + off.x, y·bufH·scale + off.y)`.
    - Bones: `(0,1)(1,2)(2,3)(3,4)(0,5)(5,6)(6,7)(7,8)(5,9)(9,10)(10,11)(11,12)(9,13)(13,14)(14,15)(15,16)(13,17)(17,18)(18,19)(19,20)(0,17)`.
    - Color `#3ECF8E` when locked and `#FBBF24` otherwise. Fingertip dots are larger.
  - `PermissionCard`:
    - The settings button opens `UIApplication.openSettingsURLString`.
    - Copy for each status:

      | Status | Title | Message |
      |---|---|---|
      | `.denied` | `"الكاميرا غير مسموحة"` | `"اسمح بالكاميرا من الإعدادات لتعمل الإشارات والتنبيهات."` |
      | `.unavailable` | `"الكاميرا غير متاحة"` | `"هذا الجهاز لا يحتوي كاميرا (مثل المحاكي). جرّب على iPhone."` |

- [ ] **Step 4: Temporarily wire the Lens tab** to `CameraPreview` + `HandSkeletonView` + `DebugHUD`, or to `PermissionCard` based on `camera.status`. Start the camera and attach the hands in `.task`; detach and stop in `.onDisappear`.

- [ ] **Step 5: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 6: Run a simulator smoke check.** Launch with `-uiOnboarded YES -uiTab lens`. Expected: the "الكاميرا غير متاحة" card, in RTL.

- [ ] **Step 7: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add camera engine, Vision hand tracker and skeleton overlay" -- "AI LAW/AI LAW"
```

---

### Task 12: Shared audio, on-device Arabic speech, speech output, haptics

**Files:**
- Create: `Engines/AudioHub.swift`, `Engines/SpeechEngine.swift`, `Engines/SpeakEngine.swift`, `Engines/Haptics.swift`
- Modify: `App/AppEngines.swift` (add `audio`, `speech`, `speak`)

**Interfaces:**
- Consumes: `TranscriptAccumulator`, `CaseScenario`
- Produces:
  - `@Observable final class AudioHub`:
    - `enum Status: Equatable { case idle, running, denied, failed(String) }`
    - `private(set) var status`, `private(set) var format: AVAudioFormat?`
    - `func start() async`, `func stop()`
    - `func subscribe(_ id: String, _ handler: @escaping @Sendable (AVAudioPCMBuffer, AVAudioTime) -> Void)`, `func unsubscribe(_ id: String)`
    - `func playAlarm(beeps: Int = 5)`
  - `@Observable final class SpeechEngine`:
    - `enum Status: Equatable { case idle, listening, unavailable, denied, error(String) }`
    - `private(set) var status`, `private(set) var text: String`, `private(set) var isPartial: Bool`
    - `static func requestAuthorization() async -> Bool`
    - `static var isArabicOnDeviceAvailable: Bool`
    - `func start(using hub: AudioHub)`, `func stop()`, `func clearText()`
  - `@Observable final class SpeakEngine`:
    - `private(set) var isSpeaking: Bool`
    - `var hasArabicVoice: Bool`
    - `func speak(_ text: String, force: Bool = false)`, `func stop()`
  - `enum Haptics { static func danger(); static func accept(); static func roleChanged() }`

- [ ] **Step 1: Implement `AudioHub`.**
  - Permission via `AVAudioApplication.requestRecordPermission()`.
  - Session: `setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP])`, then `setActive(true)`.
  - One `AVAudioEngine` input tap with buffer size 4096, fanned out to the lock-guarded subscribers.
  - Observers:
    - `AVAudioSession.interruptionNotification`: `.began` stops, `.ended` restarts.
    - `routeChangeNotification`: reinstall the tap.
  - `playAlarm`:
    - An `AVAudioPlayerNode` attached to the same engine (the engine starts if needed) plays one generated buffer.
    - Each beep `i` lasts 0.18 s at 880 Hz when `i` is even and 660 Hz when odd, with beeps 0.28 s apart.
    - It is a square wave with gain 0.22. These values port `useObstacleProximity.js:7-37`.

- [ ] **Step 2: Implement `SpeechEngine`.**
  - `SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))`.
  - If `supportsOnDeviceRecognition` is false → `.unavailable`.
  - Request: `SFSpeechAudioBufferRecognitionRequest` with `shouldReportPartialResults = true`, `requiresOnDeviceRecognition = true`, and `contextualStrings = CaseScenario.lines.map(\.text) + PhraseBook.defaultLawyer.values`.
  - Subscriber id `"speech"`. Each partial result calls `accumulator.update`.
  - On `isFinal` or a non-auth error: `commit()`, then restart the task after 0.3 s and keep listening. Auth errors set `.denied`.
  - `text` mirrors `accumulator.text`.

- [ ] **Step 3: Implement `SpeakEngine`.**
  - Voice: the highest-quality `AVSpeechSynthesisVoice` whose `language` starts with `"ar"` (premium, then enhanced, then default), else `AVSpeechSynthesisVoice(language: "ar-SA")`.
  - `rate = AVSpeechUtteranceDefaultSpeechRate * 0.92`, `pitch = 1`.
  - The same text within 1.6 s is skipped unless `force` is set.
  - A new utterance first stops the current one at a word boundary.
  - `usesApplicationAudioSession = true`.

- [ ] **Step 4: Implement `Haptics`.**
  - `danger()`: `CHHapticEngine` continuous events of 0.2, 0.2 and 0.4 s with 0.1 s gaps (from `useAmbient.js:77`, `[200,100,200,100,400]`). Fall back to `UINotificationFeedbackGenerator().notificationOccurred(.error)`.
  - `accept()`: `UIImpactFeedbackGenerator(style: .medium)`.
  - `roleChanged()`: `.rigid`.

- [ ] **Step 5: Build.** Expected: `** BUILD SUCCEEDED **`. Runtime behavior is verified in Task 15 (Lab) and on the device.

- [ ] **Step 6: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add shared audio hub, on-device Arabic speech, speech output and haptics" -- "AI LAW/AI LAW"
```

---

### Task 13: Danger-sound and obstacle engines

**Files:**
- Create: `Engines/SoundAlertEngine.swift`, `Engines/ObstacleEngine.swift`
- Modify: `App/AppEngines.swift` (add `sound`, `obstacle`)

**Interfaces:**
- Consumes: `AudioHub.subscribe/format/playAlarm`, `CameraEngine.addConsumer`, `DangerSoundPolicy`, `SoundGuess`, `DangerAlert`, `ObstacleDetector`, `ObstacleReading`, `Haptics.danger`
- Produces:
  - `@Observable final class SoundAlertEngine`:
    - `private(set) var alert: DangerAlert?`, `private(set) var isRunning: Bool`
    - `func start(using hub: AudioHub)`, `func stop()`, `func clearAlert()`
  - `@Observable final class ObstacleEngine`:
    - `private(set) var near: Bool`, `private(set) var alertToken: Int` — increments on each `shouldAlert`
    - `func attach(to camera: CameraEngine, hub: AudioHub)`, `func detach()`
    - `static func downsampleLuma(_ buffer: CVPixelBuffer) -> [Float]`

- [ ] **Step 1: Implement `SoundAlertEngine`.**
  - `SNAudioStreamAnalyzer(format: hub.format!)`.
  - `SNClassifySoundRequest(classifierIdentifier: .version1)` with `windowDuration = CMTime(seconds: 1.5, preferredTimescale: 48000)` and `overlapFactor = 0.5`.
  - Subscriber id `"sound"`. Analysis runs on a serial queue (`analyzer.analyze(buffer, atAudioFramePosition:)`).
  - The `SNResultsObserving` observer (`nonisolated`) maps classifications to `[SoundGuess]` and feeds `DangerSoundPolicy`.
  - On an alert, on the main actor: set `alert` and call `Haptics.danger()`.

- [ ] **Step 2: Implement `ObstacleEngine`.**
  - Camera consumer id `"obstacle"`, interval `0.18`.
  - `downsampleLuma` locks plane 0 (Y) and samples nearest-neighbor into an 80×60 `[Float]`, using `bytesPerRowOfPlane`.
  - Feeds `ObstacleDetector`. Publishes `near`.
  - On `shouldAlert`: increment `alertToken`, call `hub.playAlarm(beeps: 5)` and `Haptics.danger()`.

- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add on-device danger sound and obstacle engines" -- "AI LAW/AI LAW"
```

---

### Task 14: Multipeer session and readiness checker

**Files:**
- Create: `Engines/PeerSession.swift`, `Engines/ReadinessChecker.swift`
- Modify: `App/AppEngines.swift` (add `peer`, `readiness`)

**Interfaces:**
- Consumes: `SceneMessage`, `Role`, `SpeechEngine.isArabicOnDeviceAvailable`, `SpeakEngine.hasArabicVoice`
- Produces:
  - `@Observable final class PeerSession: NSObject`:
    - `enum State: Equatable { case idle, searching, connected(peerName: String), disconnected }`
    - `private(set) var state`, `private(set) var role: Role?`
    - `var onMessage: ((SceneMessage) -> Void)?`
    - `var snapshotProvider: (() -> SceneMessage)?`
    - `func start(as role: Role)`, `func stop()`, `func send(_ message: SceneMessage)`
    - `var isConnected: Bool`
  - `struct ReadinessItem: Identifiable { let id: String; let title: String; let ok: Bool; let fix: String }`
  - `@Observable final class ReadinessChecker`:
    - `private(set) var items: [ReadinessItem]`
    - `func refresh(peer: PeerSession, speak: SpeakEngine)`

- [ ] **Step 1: Implement `PeerSession`.**
  - Service type `"ailaw-scene"`.
  - `MCPeerID(displayName: "\(UIDevice.current.name) · \(role.label)")`.
  - `MCSession(peer:securityIdentity: nil, encryptionPreference: .required)`.
  - The advertiser uses `discoveryInfo: ["role": role.rawValue]`. A browser runs at the same time.
  - **Pairing rule:**
    - Only the lawyer invites. It invites found peers whose `role == "person"`, with `context = "lawyer"` as Data and a 10 s timeout.
    - The person accepts invitations whose context is `"lawyer"`.
  - On `.connected`: `state = .connected(peerName)`, then send `snapshotProvider?()`.
  - On `.notConnected`: `state = .disconnected`. The lawyer restarts its browser (stop, then start) so `foundPeer` fires again and it re-invites.
  - `send` encodes with `SceneMessage.encoded()` and uses `.reliable`. It does nothing when no peer is connected.
  - Received data → `SceneMessage.decode` → `onMessage` on the main actor. Undecodable data is dropped.
  - All delegate methods are `nonisolated`.

- [ ] **Step 2: Implement `ReadinessChecker`.** Items, in order:

  | id | Title | Check | Fix |
  |---|---|---|---|
  | camera | `"الكاميرا"` | `AVCaptureDevice.authorizationStatus(for: .video) == .authorized` | `"الإعدادات ← AI LAW ← فعّل الكاميرا"` |
  | microphone | `"المايك"` | `AVAudioApplication.shared.recordPermission == .granted` | `"الإعدادات ← AI LAW ← فعّل الميكروفون"` |
  | speechAuth | `"التعرف على الكلام"` | `SFSpeechRecognizer.authorizationStatus() == .authorized` | `"الإعدادات ← AI LAW ← فعّل التعرف على الكلام"` |
  | arabicOnDevice | `"الكلام العربي بدون إنترنت"` | `SpeechEngine.isArabicOnDeviceAvailable` | `"الإعدادات ← عام ← لوحة المفاتيح: أضف العربية وفعّل الإملاء، ثم انتظر تحميل حزمة اللغة مع الإنترنت مرة واحدة"` |
  | arabicVoice | `"صوت النطق العربي"` | `speak.hasArabicVoice` | `"الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات ← العربية: نزّل صوتاً"` |
  | peer | `"الجوال الثاني"` | `peer.isConnected` | `"افتح تبويب «جلسة» على الجوالين واختر دوراً مختلفاً لكل جوال"` |

- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add Multipeer scene session and readiness checker" -- "AI LAW/AI LAW"
```

---

## Phase 3: Screens

### Task 15: Design components, sign coach player, Lab screen

**Files:**
- Create: `Components/GlassChip.swift`, `Components/HoldRing.swift`, `Components/AppButtonStyle.swift`, `Components/SectionCard.swift`, `Components/PageHeader.swift`, `Components/SignCoachView.swift`
- Create: `Features/Lab/LabView.swift`, `Features/Lab/LabViewModel.swift`
- Modify: `App/RootView.swift` (Lab tab → `LabView`)

**Interfaces:**
- Consumes: `SignLexicon.resolve`, `SignClip`, `CaseScenario`, `ScenePhrase`, `SpeechSnippet`, `PhraseBook`, `AppEngines.audio/speech/speak`, `AppSettings`
- Produces:
  - `GlassChip(_ text: String, systemImage: String? = nil, tint: Color? = nil)` — `.glassEffect(.regular.tint(...), in: .capsule)`
  - `HoldRing(progress: Double, lineWidth: CGFloat = 4, color: Color = Theme.highlight)`
  - `AppButtonStyle(kind: .primary | .secondary | .danger)`, with minimum height 48 and radius 16
  - `SectionCard(title: String?, content)` — surface background, radius 20, padding 16
  - `PageHeader(title: String, subtitle: String?)`
  - `SignCoachView(clips: [SignClip]?, token: AnyHashable, compact: Bool)`
  - `@Observable final class LabViewModel`:
    - `stepIndex: Int` (−1 = none), `autoPlay`, `spellLetters`, `draft`, `listening`
    - `private(set) lawyerPhrase: ScenePhrase?`, `private(set) personLine: ScenarioLine?`
    - `var clips: [SignClip]?`
    - `func next()`, `func reset()`, `func play(_ index: Int)`, `func push(_ text: String, speak: Bool = true, fingers: Int? = nil)`

- [ ] **Step 1: Implement the components.**
  - `SignCoachView` (port of `web/src/components/overlay/SignCoachAvatar.jsx`):
    - Clips play in order and loop.
    - **Video:** `AVPlayer` with `Bundle.main.url(forResource: resource, withExtension: "mp4")`. `AVPlayerItemDidPlayToEndTime` advances to the next clip. A missing URL shows the label text and advances after 2.8 s.
    - **Letter:** `Image(uiImage: UIImage(named: clip.fileName)!)` shown for 0.9 s.
    - The header reads `"مترجم"` for video and `"تهجئة"` for letters, plus the current label and step dots.
    - It restarts from index 0 whenever `token` changes.

- [ ] **Step 2: Implement `LabViewModel`** (port of `web/src/pages/Lab.jsx:61-143`):
  - `play(i)` speaks the line with `force`:
    - A lawyer line sets `lawyerPhrase` (with `fingers`) and clears `personLine`.
    - A person line sets `personLine` and clears `lawyerPhrase`.
  - Autoplay advances after 4.2 s following a lawyer line and 3.2 s following a person line, and stops at the end.
  - `listening` starts `audio`, then `speech`. Each `speech.text` change is debounced 0.6 s, passed through `SpeechSnippet.latest`, then to `push(speak: false)` unless unchanged.
  - `clips` = `SignLexicon.resolve(text: lawyerPhrase?.text, fingers: lawyerPhrase?.fingers, spellLetters: spellLetters)`.

- [ ] **Step 3: Implement `LabView`.**
  - `PageHeader("المعمل", "سيناريو قضية واقعي + مترجم إشارة")`.
  - **Scenario card:**
    - title and subtitle
    - a progress bar `(step+1)/20`
    - the current line with a role badge
    - buttons `"التالي"`, `"تشغيل تلقائي"`, `"إعادة"`
    - the 20 lines as tappable rows, the current one highlighted
  - **Sign translator card:** `SignCoachView` plus a `"حروف"` toggle.
  - **Manual lawyer test card:**
    - A mic button `"استمع"` / `"إيقاف"`.
    - Status label: `"المايك مرفوض"` when audio is denied, `"يستمع…"` when listening, the error text on error, `"جاهز"` when listening is on but idle, otherwise `"متوقف"`. Show `"الكلام العربي غير جاهز — افتح فحص الجاهزية"` when the status is `.unavailable`.
    - A text field with a `"ترجم"` button.
    - Ten quick buttons `1`…`10` that call `push(PhraseBook.defaultLawyer[n], fingers: n)`.
  - Stop audio and speech in `.onDisappear`.

- [ ] **Step 4: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Run a simulator smoke check.**
  - Launch with `-uiOnboarded YES -uiTab lab`, tap `"التالي"`, wait 1 s, take a screenshot.
  - Expected: line 1 is highlighted and the translator shows `"مترجم"` with the `word-hello` video frame.
  - Tap quick button `3` and screenshot. Expected: the label `"أين"`.

- [ ] **Step 6: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add design components, sign coach player and Lab screen" -- "AI LAW/AI LAW"
```

---

### Task 16: Lens screen (single-phone flow)

**Files:**
- Create: `Features/Lens/LensViewModel.swift`, `Features/Lens/LensView.swift`, `Features/Lens/LensOverlays.swift`, `Features/Lens/LensControlsBar.swift`, `Features/Lens/AlphabetPanel.swift`
- Modify: `App/RootView.swift` (Lens tab → `LensView(mode: .solo)`, removing the Task 11 temporary wiring), `Components/DebugHUD.swift` (DEBUG-only inject buttons)

**Interfaces:**
- Consumes:
  - `FingerPhraseMachine`, `AlphabetWriter`, `AlphabetClassifier`, `WordSignClassifier`, `WordSignVoter`, `SignArbiter`, `ConversationRouter`, `LensAction`, `SpeechSnippet`, `SignLexicon`
  - all engines, `AppSettings`
  - the components from Task 15
- Produces: `@Observable final class LensViewModel`:
  - `init(mode: LensMode, engines: AppEngines, settings: AppSettings)`
  - Read state:
    - `role: Role`, `roleHoldProgress: Double`, `sendResult: SignResult?`
    - `lawyerPhrase: ScenePhrase?`, `remotePerson: ScenePhrase?`
    - `safetyAlert: SafetyAlert?`, where `enum SafetyAlert: Equatable { case sound(DangerAlert), obstacle }`
    - `alphabet: AlphabetWriter`, `alphabetSent: Bool`, `pulseToken: Int`
    - `sendOn: Bool`, `title: String`, `subtitle: String`, `signClips: [SignClip]?`, `coachVisible: Bool`
  - Writable flags: `translateVisible = true`, `spellLetters = false`, `showDebug = false`
  - Methods:
    - `onAppear()`, `onDisappear()`
    - `toggleReceive()`, `toggleSend()`, `toggleSafety()`, `toggleTranslate()`, `toggleLetters()`, `flipCamera()`, `clear()`
    - `tapRole()`, `replay()`, `sendAlphabet()`, `dismissAlert()`, `alphabetSpace()`, `alphabetBackspace()`, `alphabetClear()`
    - `injectDebug(fingers: Int)` — DEBUG only
    - `handleRemote(_ m: SceneMessage)` — used in Task 17

- [ ] **Step 1: Implement `LensViewModel`** (port of `web/src/pages/Home.jsx`):

  **Camera facing at init:**
  - front when the mode is dedicated or `sendEnabled`
  - otherwise back when `safetyEnabled`
  - otherwise front

  `toggleSend` sets front when send turns on, and back when it turns off while safety is on.

  **Engine lifecycle** (re-evaluate after every toggle):

  | Engine | Runs when |
  |---|---|
  | camera | always in Lens |
  | hands | `sendOn` |
  | obstacle | `safetyEnabled` |
  | audio | `receiveEnabled` or `safetyEnabled` |
  | speech | `receiveEnabled` |
  | sound | `safetyEnabled` |

  `onDisappear` stops all of them.

  **Tick loop:** a `Task` on the main actor looping with `Task.sleep(for: .milliseconds(100))`. On each tick, with `now` in seconds:
  1. **Tracking lost or send off:** if `hands.quality == .lost` or `!sendOn`, call `router.resetSpoken()` and the machines' `reset()`. This ports `Home.jsx:238-242`.
  2. **Finger machine:** when `now - lastFingerTick ≥ 0.12` and `!spellLetters`:
     - Call `finger.tick(...)` with `settings.data.phraseBook`.
     - If it returns a role: perform `router.roleChanged(to:)` and call `Haptics.roleChanged()`.
  3. **Word voter:** when `arslEnabled`, `!spellLetters`, a primary hand exists and `now - lastWordTick ≥ 0.45`, call `voter.add(WordSignClassifier.classify(hands[0]), quality:)`. The voter threshold is `max(0.45, settings.data.confidence)`.
  4. **Arbitrate:** `sendResult = SignArbiter.pick(finger: finger.result, word: voter.result, wordEnabled: arslEnabled)`. If accepted, perform `router.signResult(sendResult, currentRole: finger.role, roleHoldProgress: finger.roleHoldProgress, now: ms)`.
  5. **Alphabet:** when `spellLetters` and `sendOn`, call `alphabet.tick(hand: hands.first, quality:, now:)`. A `true` return increments `pulseToken`.
  6. **Speech:** when `receiveEnabled` and `speech.text` has changed, restart the 0.8 s debounce. When it fires, pass `SpeechSnippet.latest` to `router.speechSnippet(..., currentRole: finger.role, now:)`.
  7. **Safety:**
     - `sound.alert` → `.sound(alert)`.
     - A changed `obstacle.alertToken` → `.obstacle`, plus `speak("احذر، حاجز قريب", force: true)` at most once every 4 s.

  **`perform(_ actions: [LensAction])`:**

  | Action | Effect |
  |---|---|
  | `.speak(t)` | `speak.speak(t, force: true)` |
  | `.publish(p)` | `peer.send(.phrase(p))` |
  | `.showLawyerPhrase(p)` | `lawyerPhrase = p` |
  | `.showRemotePerson(p)` | `remotePerson = p` |
  | `.pulse` | `pulseToken += 1` and `Haptics.accept()` |

  **Derived state:**
  - `signClips = SignLexicon.resolve(text: lawyerPhrase?.text, fingers: lawyerPhrase?.fingers, spellLetters: spellLetters)`
  - `coachVisible = translateVisible && (mode == .dedicated(.person) || (mode == .solo && (role == .person || lawyerPhrase != nil)))`. This ports `Home.jsx:467-475`.

  **`sendAlphabet`:** `router.alphabetSend(alphabet.text, now:)`, then `alphabetSent = true` for 2.5 s, then `alphabet.clear()`.

  **`title`:**
  - `"النظارة الذكية"` in solo
  - `"شاشة المحامي"` / `"شاشة الشخص"` when dedicated

  **`subtitle`:**
  - solo: `"الكلام: على الجهاز"`, or `"الكلام: غير جاهز"` when the speech status is `.unavailable`
  - dedicated: `role.label`

- [ ] **Step 2: Implement the overlays** (`LensOverlays.swift`). Copy comes from `web/src/components/overlay/Overlay.jsx` and `BottomBar.jsx`.
  - **Tracking chip:** `GlassChip`. Long-press for 1 s toggles `showDebug`.
  - **Role chip:**
    - `HoldRing(progress: roleHoldProgress)`, label `"محامي"` / `"شخص"`.
    - A tap calls `tapRole()` in solo mode.
    - On a role change it pulses with `.symbolEffect(.bounce)`.
  - **Result badge** (centered):
    - shows when `sendResult?.display` is set
    - large `appFont(30, .bold)`
    - the solo format is `"<role label> · <fingers> · <display>"` when fingers are present, matching `Home.jsx:476-482`
    - a confidence bar, dimmed when not accepted
    - a replay button (`speaker.wave.2`)
    - scales on `pulseToken`
  - **Hand guide:** when `sendOn && quality == .lost`, a dashed rounded rectangle and `"ضع راحة يدك هنا"`.
  - **Caption bubble:**
    - `speech.text` (last 3 lines), shown at 70% opacity while `isPartial`
    - background `Theme.ink` at `settings.data.overlayOpacity`
    - placed higher while `sendOn`
  - **Coach panel:** `SignCoachView(compact: false)` as a bottom sheet card, when `coachVisible`.
  - **Remote person card:** shown when `remotePerson` is set, titled `"الشخص بالإشارة"`. It shows `"<fingers> أصابع · <text>"` when fingers are present.
  - **Danger overlay:**
    - full screen, with a pulsing red border (4 pt) and a red tint animated 0.15 ↔ 0.45
    - icon `exclamationmark.triangle.fill`
    - label: the `DangerAlert.label`, or `"حاجز قريب — انتبه!"` for obstacles
    - `"اضغط للإغلاق"`; a tap calls `dismissAlert()`
  - **Near chip:** a red capsule `"اقترب من حاجز…"` when `obstacle.near && safetyAlert == nil`.

- [ ] **Step 3: Implement the controls bar** (`LensControlsBar.swift`).
  - A glass dock of toggle buttons with SF Symbols:

    | Button | Symbol |
    |---|---|
    | `"استقبال"` | `ear` |
    | `"إرسال"` | `hand.raised` |
    | `"أمان"` | `exclamationmark.shield` |
    | `"حروف"` | `character.textbox` |
    | `"ترجمة"` | `person.wave.2` |
    | `"قلب"` | `arrow.triangle.2.circlepath.camera` |
    | `"مسح"` | `eraser` |

  - Active toggles are filled with `Theme.accent`.
  - Above the dock, a speech status line: `"يستمع…"`, `"المايك مرفوض"`, `"الكلام العربي غير جاهز"` or `"متوقف"`.
  - `"مسح"` calls `speech.clearText()`, and also `alphabet.clear()` in letters mode.

- [ ] **Step 4: Implement `AlphabetPanel`.**
  - Big current letter inside a `HoldRing(progress: holdProgress)`.
  - The written text.
  - Buttons `"حذف"`, `"مسافة"`, `"مسح"`, `"إرسال"`. The send button is disabled when the text is empty and shows `"تم الإرسال ✓"` while `alphabetSent`.

- [ ] **Step 5: Implement `LensView`.**
  - Layer order: `ZStack { CameraPreview or PermissionCard; HandSkeletonView; overlays; top bar; dock }`.
  - The top bar shows title and subtitle, plus the chips row.
  - `DebugHUD` shows when `showDebug`. In DEBUG builds it adds buttons `1…10` that call `injectDebug(fingers:)`. That builds an accepted `SignResult` for the current role's phrase and passes it through `router.signResult`.

- [ ] **Step 6: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 7: Run a simulator smoke check.** Launch with `-uiOnboarded YES -uiTab lens`.
  - Expected: the camera-unavailable card, the dock with all seven buttons, and the caption bubble area.
  - Long-press the tracking chip → the debug HUD appears.
  - Tap HUD `1` → the result badge shows `"شخص · 1 · تعرضت لحادث سيارة"`, and speech is audible.

- [ ] **Step 8: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add Lens screen with sign, speech, letters and safety flows" -- "AI LAW/AI LAW"
```

---

### Task 17: Session tab and dedicated two-phone Lens

**Files:**
- Create: `Features/Session/SessionView.swift`
- Modify: `Features/Lens/LensViewModel.swift`, `Features/Lens/LensView.swift`, `App/RootView.swift` (Session tab)

**Interfaces:**
- Consumes: `PeerSession`, `LensViewModel(mode: .dedicated(role))`, `ConversationRouter.snapshot()`, `ConversationRouter.remote`
- Produces: `SessionView()`. Dedicated Lens is presented with `.fullScreenCover`, and `LensView` gains a close button (`xmark`) when the mode is dedicated.

- [ ] **Step 1: Extend `LensViewModel` for dedicated mode.**
  - In `onAppear`, when dedicated:
    - `peer.onMessage = { [weak self] in self?.handleRemote($0) }`
    - `peer.snapshotProvider = { [weak self] in self?.router.snapshot() ?? .snapshot(lawyer: nil, person: nil) }`
  - `handleRemote` performs `router.remote(m)`.
  - `sendOn` is always true when dedicated.
  - The top bar shows a sync chip: `"يبحث…"` (searching), `"متصل"` (connected, `Theme.accentSoft`) or `"منقطع"` (disconnected, `Theme.danger`).
  - In `onDisappear`, clear both closures.

- [ ] **Step 2: Implement `SessionView`** (port of the `web/src/pages/ScreenPick.jsx` intent, with QR removed):
  - `PageHeader("جلسة جوالين", "محامي ↔ شخص بدون إنترنت")`.
  - A `"ثلاث خطوات"` card:
    1. `"افتح التطبيق على الجوالين"`
    2. `"اختر «أنا المحامي» على جوال و«أنا الشخص» على الآخر"`
    3. `"انتظر «متصل» ثم اضغط «ادخل شاشتي»"`
  - Two large role buttons, `"أنا المحامي"` and `"أنا الشخص"`. Each calls `peer.start(as:)`.
  - A status card:

    | State | Display |
    |---|---|
    | searching | `ProgressView` + `"يبحث عن الجوال الآخر…"` |
    | connected | `"متصل بـ \(peerName)"` |
    | disconnected | `"انقطع الاتصال — يعيد المحاولة…"` |

  - Button `"ادخل شاشتي"` opens the cover with `LensView(mode: .dedicated(role))`. It is enabled once a role is chosen, even before connecting.
  - Button `"إنهاء الجلسة"` (danger style) calls `peer.stop()`.

- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Run a simulator smoke check.** Screenshot the session tab, then pick `"أنا المحامي"` → status shows `"يبحث عن الجوال الآخر…"`.
  - **Optional two-simulator check:**
    - Create a second simulator: `xcrun simctl create "iPhone 16 B" "iPhone 16" com.apple.CoreSimulator.SimRuntime.iOS-26-4`.
    - Run the app on both and pick opposite roles. Expect `"متصل"` on both.
    - Enter the screens. On the person simulator, use HUD `3`. The lawyer simulator should show the `"الشخص بالإشارة"` card and speak `"الحادث عند الإشارة"`.
    - Record the result in the task notes.

- [ ] **Step 5: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add two-phone session with dedicated lawyer and person lens" -- "AI LAW/AI LAW"
```

---

### Task 18: Onboarding and More (Guide, Settings, Readiness, About)

**Files:**
- Create: `Features/Onboarding/OnboardingView.swift`
- Create: `Features/More/MoreView.swift`, `GuideView.swift`, `SettingsView.swift`, `ReadinessView.swift`, `AboutView.swift`
- Modify: `App/RootView.swift` (real onboarding and More tab)

**Interfaces:**
- Consumes: `AppSettings`, `SettingsData`, `PhraseBook`, `WordSignClassifier.labels/displayNames`, `ReadinessChecker`, `PeerSession`, `SpeechEngine.requestAuthorization`, components from Task 15
- Produces: the views listed. `OnboardingView` sets `settings.data.onboarded = true` when it finishes.

- [ ] **Step 1: Implement `OnboardingView`** (copy from `web/src/pages/Onboarding.jsx:20-57`).
  - Logo: two stroked circles (`accent2` and `accent`) joined by a short `ink` bar.
  - Eyebrow `"عدسة مساعدة للصم"`, title `"النظارة الذكية"`, body `"كلام المحامي يصبح إشارة مرئية — وإشارتك تُسمَع صوتاً واضحاً."`.
  - Button `"ابدأ الآن"` starts the permission steps. Each step is a card with an icon, an explanation, and `"سماح"` / `"تخطي"`:
    1. camera: `AVCaptureDevice.requestAccess`
    2. microphone: `AVAudioApplication.requestRecordPermission`
    3. speech: `SpeechEngine.requestAuthorization`
    4. local network: `peer.start(as: .person)` for 2 s, then `peer.stop()`, to trigger the system prompt
  - Finish → `onboarded = true`.
  - Footer: `"كل المعالجة على جهازك — بدون إنترنت"`.

- [ ] **Step 2: Implement `MoreView`.**
  - `PageHeader("المزيد", "أدلة وإعدادات التطبيق")`.
  - Navigation rows: `"التعليمات"`, `"الإعدادات"`, `"فحص الجاهزية"`, `"عن المشروع"`, with SF Symbols and subtitles from `web/src/pages/More.jsx`.

- [ ] **Step 3: Implement `GuideView`.**
  - Port `HOW_TO_VOCAB` and `SECTIONS` from `web/src/pages/Guide.jsx:16-98` verbatim.
  - **Exception:** replace the step `"من الإعدادات تأكد أن عنوان الـ Backend صحيح…"` with `"افتح «فحص الجاهزية» من الإعدادات وتأكد أن كل البنود ✓."`.
  - Below, two phrase tables (lawyer and person, from `settings.data.phraseBook`). Each row shows the finger emoji (`web/src/components/guide/GestureArt.jsx:5-16`), the number and the phrase.
  - Last, a `"كلمات ArSL"` section showing the `GestureGrid` view defined in Step 6. This puts the ten gesture images in the guide, as spec §7 requires.

- [ ] **Step 4: Implement `SettingsView`** (port of `web/src/pages/Settings.jsx`, without the server URL or PWA sections).
  - Two phrase editors, titled `"قائمة المحامي"` and `"قائمة الشخص"`. Each has 10 `TextField`s bound into `settings.data` and a `"استرجاع الافتراضي"` button.
  - `"حجم الخط"` slider: 0.85…1.4, step 0.05.
  - `"شفافية العدسة"` slider: 0.3…0.9.
  - `"حساسية التعرف"` slider: 0.2…0.8.
  - Toggle `"تمييز كلمات ArSL (تجريبي)"`, bound to `arslEnabled`.
  - A navigation link to `"فحص الجاهزية"`.
  - `"إعادة الضبط"` with a confirmation dialog → `settings.resetAll()`, which returns to onboarding.

- [ ] **Step 5: Implement `ReadinessView`.**
  - Call `readiness.refresh(peer:speak:)` on appear.
  - A list of items, each with `checkmark.circle.fill` (accent) or `xmark.circle.fill` (danger), its title, and its fix text when not ok.
  - Button `"إعادة الفحص"`.
  - The header summarizes `"جاهز للعرض"` when all items are ok, otherwise `"\(n) بنود تحتاج إصلاح"`.

- [ ] **Step 6: Implement `AboutView`** (copy from `web/src/pages/About.jsx`).
  - The description card and the three directions.
  - A grid of the ten ArSL words, defined as `struct GestureGrid: View` in `AboutView.swift` so the Guide can reuse it. Each cell is `Image(uiImage: UIImage(named: "<file>.png"))` plus its display name. Mapping:

    | Word | File |
    |---|---|
    | ينام | yanam |
    | يسكت | yaskut |
    | حب | hub |
    | يدخن | yudakhin |
    | دعم | musaada |
    | مرتبك | murtabik |
    | قلق | qalaq |
    | هنا | huna |
    | السلام عليكم | salam |
    | شكرا | shukran |

  - The note `"كل المعالجة على الجهاز: Vision وSpeech وSoundAnalysis — بدون سيرفر."`

- [ ] **Step 7: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 8: Run a simulator smoke check.** Screenshot each of these:
  - `-uiOnboarded NO`: the onboarding screen
  - `-uiTab more` with each pushed screen: Guide, Settings, Readiness, About

  Expected: RTL layout, Thmanyah font, no clipped text, and Readiness lists 6 items.

- [ ] **Step 9: Commit**

```bash
git add "AI LAW/AI LAW"
git commit -m "feat(app): add onboarding with permissions, guide, settings, readiness and about" -- "AI LAW/AI LAW"
```

---

### Task 19: Device test checklist and final verification

**Files:**
- Create: `docs/DEVICE_TEST_CHECKLIST.md`

**Interfaces:**
- Consumes: everything above. Produces nothing new.

- [ ] **Step 1: Write `docs/DEVICE_TEST_CHECKLIST.md`** in Arabic, as checkbox sections:
  1. **Before the day:**
     - Choose the signing team in Xcode and install the app on both iPhones.
     - Add the Arabic keyboard, enable dictation, and wait for the language pack to download.
     - Download an Arabic voice.
     - Readiness shows all items ✓ on both phones.
  2. **Airplane mode** with Wi-Fi and Bluetooth turned back on.
  3. **Full scenario** from `DEMO_SCRIPT.md`, 10 exchanges:
     - The lawyer speaks → videos appear on the person's phone.
     - The person shows fingers 1–10 → the lawyer's phone speaks.
  4. **Hold to switch role** on a single phone: 1 finger for 5 s, then 2 fingers for 5 s.
  5. **Letters mode:** write `"سلام"` and send it.
  6. **Safety:**
     - Play a siren from a third device → red flash and vibration.
     - Bring the back camera close to a wall → alarm tone and `"احذر، حاجز قريب"`.
  7. **Threshold tuning:** if counts are off, long-press the tracking chip and use the debug HUD patterns. Record the values.

- [ ] **Step 2: Run all core tests.** Run `cd "AI LAW/Packages/AILawCore" && swift test`. Expected: all tests pass, and the summary line shows 0 failures.

- [ ] **Step 3: Build the app.** Run the global build command. Expected: `** BUILD SUCCEEDED **` with no warnings from `AI LAW/AI LAW/**` files.

- [ ] **Step 4: Run a smoke pass on all four tabs.** Screenshot each tab in the simulator and confirm none crash.

- [ ] **Step 5: Confirm no network APIs are used.** Run `grep -rnE "URLSession|http://|https://" "AI LAW/AI LAW" "AI LAW/Packages/AILawCore/Sources"`. Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add docs/DEVICE_TEST_CHECKLIST.md
git commit -m "docs: add on-device test checklist for the presentation" -- docs/DEVICE_TEST_CHECKLIST.md
```
