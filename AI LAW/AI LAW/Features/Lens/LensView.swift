import AILawCore
import SwiftUI

/// Creates the Lens view model once from the environment.
struct LensScreen: View {
    let mode: LensMode
    var onClose: (() -> Void)?
    @Environment(AppEngines.self) private var engines
    @Environment(AppSettings.self) private var settings
    @State private var model: LensViewModel?

    var body: some View {
        Group {
            if let model {
                LensView(model: model, onClose: onClose)
            } else {
                Color.black.ignoresSafeArea()
                    .onAppear { model = LensViewModel(mode: mode, engines: engines, settings: settings) }
            }
        }
    }
}

/// The "glasses" screen: full camera with Liquid Glass overlays.
struct LensView: View {
    @Bindable var model: LensViewModel
    var onClose: (() -> Void)?
    @Environment(AppEngines.self) private var engines
    @Environment(AppSettings.self) private var settings

    var body: some View {
        ZStack {
            camera
            legibilityGradients

            VStack(spacing: 10) {
                topBar
                if model.coachVisible {
                    HStack {
                        Spacer()
                        SignCoachView(clips: model.signClips, token: model.signToken, compact: true)
                            .frame(width: 190)
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
                Spacer(minLength: 0)
                if model.showDebug {
                    DebugHUD(hands: engines.hands.hands, quality: engines.hands.quality, fps: engines.hands.fps,
                             onInject: { model.injectDebug(fingers: $0) })
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                bottomStack
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)
            .padding(.bottom, 8)

            center

            if safetyNear {
                VStack {
                    Spacer().frame(height: 150)
                    Text("اقترب من حاجز…")
                        .appFont(14, .bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(Theme.danger, in: .capsule)
                    Spacer()
                }
                .allowsHitTesting(false)
            }

            if let alert = model.safetyAlert {
                DangerOverlay(alert: alert, onDismiss: model.dismissAlert)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: model.coachVisible)
        .animation(.easeInOut(duration: 0.2), value: model.safetyAlert)
        .onAppear { model.onAppear() }
        .onDisappear { model.onDisappear() }
    }

    private var safetyNear: Bool { model.safetyOn && engines.obstacle.near && model.safetyAlert == nil }

    // MARK: Layers

    @ViewBuilder private var camera: some View {
        Color.black.ignoresSafeArea()
        if let card = PermissionCard.camera(engines.camera.status, retry: { Task { await engines.camera.start() } }) {
            VStack {
                Spacer()
                card
                Spacer().frame(height: 230)
            }
            .padding(.horizontal, 24)
        } else {
            CameraPreview(session: engines.camera.session)
                .ignoresSafeArea()
                .environment(\.layoutDirection, .leftToRight)
            if model.sendOn {
                HandSkeletonView(hands: engines.hands.hands, quality: engines.hands.quality,
                                 bufferSize: engines.camera.bufferSize)
                    .ignoresSafeArea()
            }
        }
    }

    private var legibilityGradients: some View {
        VStack {
            LinearGradient(colors: [.black.opacity(0.55), .clear], startPoint: .top, endPoint: .bottom).frame(height: 200)
            Spacer()
            LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .top, endPoint: .bottom).frame(height: 280)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    private var topBar: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.title).appFont(22, .black).foregroundStyle(.white)
                    Text(model.subtitle).appFont(12, .medium).foregroundStyle(.white.opacity(0.75))
                }
                Spacer()
                if let onClose {
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .accessibilityLabel("إغلاق")
                }
            }
            HStack(spacing: 8) {
                if model.sendOn {
                    GlassChip(model.trackingText, systemImage: "hand.raised.fill", tint: trackingTint)
                        .onLongPressGesture(minimumDuration: 1) { model.showDebug.toggle() }
                    RoleChip(role: model.role, holdProgress: model.roleHoldProgress, pulse: model.rolePulse,
                             onTap: model.isDedicated ? nil : { model.tapRole() })
                }
                if model.isDedicated {
                    syncChip
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var trackingTint: Color {
        switch engines.hands.quality {
        case .lost: .white.opacity(0.3)
        case .weak: Theme.weak
        case .locked: Theme.accent
        }
    }

    @ViewBuilder private var syncChip: some View {
        switch engines.peer.state {
        case .connected:
            GlassChip("متصل", systemImage: "link", tint: Theme.accentSoft)
        case .disconnected:
            GlassChip("منقطع", systemImage: "link.badge.plus", tint: Theme.danger)
        case .searching, .idle:
            GlassChip("يبحث…", systemImage: "antenna.radiowaves.left.and.right")
        }
    }

    @ViewBuilder private var center: some View {
        if model.sendOn && !model.spellLetters {
            if let result = model.sendResult {
                ResultBadge(result: result, caption: model.resultCaption, pulse: model.pulseToken, onReplay: model.replay)
                    .transition(.scale.combined(with: .opacity))
            } else if engines.camera.status == .ready && engines.hands.quality == .lost {
                HandGuide()
            }
        }
    }

    private var bottomStack: some View {
        VStack(spacing: 10) {
            if let remote = model.remotePerson, model.mode == .dedicated(.lawyer) {
                RemotePersonCard(phrase: remote)
            }
            if model.spellLetters && model.sendOn {
                AlphabetPanel(model: model)
            } else if model.receiveOn && !engines.speech.text.isEmpty {
                CaptionBubble(text: engines.speech.text, partial: engines.speech.isPartial,
                              opacity: settings.data.overlayOpacity)
            }
            LensControlsBar(model: model)
        }
    }
}
