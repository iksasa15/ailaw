import SwiftUI

struct HomeView: View {
    @Environment(AppSettings.self) private var settings
    var lockedRole: UserRole? = nil

    @State private var model: HomeViewModel?
    @State private var receiveOn = true
    @State private var sendOn = true
    @State private var safetyOn = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let model {
                CameraPreviewView(session: model.camera.session)
                    .ignoresSafeArea()

                // Hand skeleton (dots + bones) — same idea as web HandLandmarkCanvas
                if settings.sendEnabled || lockedRole != nil {
                    HandSkeletonOverlay(
                        hands: model.hands.hands,
                        quality: model.hands.quality,
                        mirrored: model.camera.currentFacing == .front
                    )
                    .ignoresSafeArea()
                }

                VStack(spacing: 0) {
                    topBar(model)
                    Spacer()
                    midOverlays(model)
                    Spacer()
                    bottomArea(model)
                }

                if let title = model.alertTitle, let kind = model.alertKind {
                    AlertToast(title: title, kind: kind) {
                        model.dismissAlert()
                    }
                }
            } else {
                ProgressView()
                    .tint(AppTheme.accent)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .onAppear {
            if model == nil {
                let vm = HomeViewModel(settings: settings, lockedRole: lockedRole)
                model = vm
                receiveOn = settings.receiveEnabled
                sendOn = lockedRole != nil ? true : settings.sendEnabled
                safetyOn = settings.safetyEnabled
            }
            model?.onAppear()
        }
        .onDisappear {
            model?.onDisappear()
        }
        .onChange(of: receiveOn) { _, v in
            settings.receiveEnabled = v
            model?.syncToggles()
        }
        .onChange(of: sendOn) { _, v in
            settings.sendEnabled = v
            model?.syncToggles()
        }
        .onChange(of: safetyOn) { _, v in
            settings.safetyEnabled = v
            model?.syncToggles()
        }
    }

    @ViewBuilder
    private func topBar(_ model: HomeViewModel) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("النظارة الذكية")
                    .font(AppTheme.brandFont(12, weight: .semibold))
                    .foregroundStyle(AppTheme.accent)
                Text(lockedRole == nil ? "العدسة" : "شاشة \(lockedRole!.label)")
                    .font(AppTheme.brandFont(20, weight: .bold))
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Button {
                    model.toggleCameraFacing()
                } label: {
                    Text(model.camera.currentFacing == .front ? "📷 خلفية" : "🤳 أمامية")
                        .font(AppTheme.brandFont(13, weight: .semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.45))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                if lockedRole != nil {
                    SyncBadge(state: model.syncBadgeState)
                }
                if let banner = model.phrases.roleChangedBanner {
                    Text(banner)
                        .font(AppTheme.brandFont(12, weight: .semibold))
                        .padding(8)
                        .background(AppTheme.accent.opacity(0.2))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    @ViewBuilder
    private func midOverlays(_ model: HomeViewModel) -> some View {
        VStack(spacing: 12) {
            if settings.sendEnabled {
                TrackingBadge(quality: model.hands.quality, fingers: model.hands.fingerCount)
                RoleBadge(
                    role: model.phrases.role,
                    holdProgress: model.phrases.roleHoldProgress,
                    canToggle: lockedRole == nil,
                    onToggle: { model.phrases.toggleRole() }
                )
            }
            if let result = model.phrases.result {
                SignBadge(text: result.text, role: result.role)
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func bottomArea(_ model: HomeViewModel) -> some View {
        VStack(spacing: 12) {
            CaptionBubble(
                text: model.stt.caption,
                opacity: settings.overlayOpacity,
                fontScale: settings.fontScale
            )

            if lockedRole == .person || (lockedRole == nil && model.phrases.role == .person) {
                SignCoachAvatar(text: model.coachText ?? model.phrases.result?.text)
            }

            if lockedRole == nil {
                LensBottomBar(
                    receiveOn: $receiveOn,
                    sendOn: $sendOn,
                    safetyOn: $safetyOn,
                    isBackCamera: model.camera.currentFacing == .back,
                    onFlipCamera: { model.toggleCameraFacing() },
                    onClear: { model.clearCaption() }
                )
            } else {
                HStack {
                    Button {
                        model.toggleCameraFacing()
                    } label: {
                        Text(model.camera.currentFacing == .front ? "كاميرا خلفية" : "كاميرا أمامية")
                            .font(AppTheme.brandFont(14, weight: .semibold))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(Color.white.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    Button("مسح النص") { model.clearCaption() }
                        .font(AppTheme.brandFont(14, weight: .semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color.white.opacity(0.12))
                        .clipShape(Capsule())
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
        }
        .padding(.bottom, 8)
    }
}
