import AILawCore
import AVFoundation
import SwiftUI
import UIKit

/// Plays a phrase as sign videos or alphabet letters, in order, looping
/// (port of web SignCoachAvatar: letters 0.9 s, missing video 2.8 s).
struct SignCoachView: View {
    let clips: [SignClip]?
    /// Restart from the first clip whenever this changes (new phrase or letters mode).
    let token: AnyHashable
    var compact = false

    @State private var index = 0
    @State private var player = AVPlayer()
    @State private var missing = false

    private struct StepKey: Hashable {
        let token: AnyHashable
        let index: Int
    }

    private var current: SignClip? {
        guard let clips, !clips.isEmpty else { return nil }
        return clips[index % clips.count]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(current?.kind == .letter ? "تهجئة" : "مترجم")
                    .appFont(12, .bold)
                    .foregroundStyle(Theme.highlight)
                Spacer()
                if let current {
                    Text(current.label).appFont(compact ? 13 : 15, .bold).foregroundStyle(.white)
                }
            }
            stage
                .frame(height: compact ? 120 : 210)
                .frame(maxWidth: .infinity)
                .background(.black.opacity(0.35), in: .rect(cornerRadius: 14))
                .clipShape(.rect(cornerRadius: 14))
            if let clips, clips.count > 1 {
                dots(count: clips.count)
            }
        }
        .padding(compact ? 8 : 12)
        .background(Theme.panel.opacity(0.92), in: .rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.accent.opacity(0.4)))
        .onChange(of: token) { index = 0 }
        .task(id: StepKey(token: token, index: index)) { await playCurrent() }
    }

    @ViewBuilder private var stage: some View {
        if let current {
            switch current.kind {
            case .video where !missing:
                PlayerLayerView(player: player)
            case .letter:
                if let image = UIImage(named: current.fileName) {
                    Image(uiImage: image).resizable().scaledToFit().padding(8)
                } else {
                    labelStage(current.label)
                }
            default:
                labelStage(current.label)
            }
        } else {
            Text("ستظهر هنا ترجمة كلام المحامي بالإشارة")
                .appFont(14)
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding()
        }
    }

    private func labelStage(_ text: String) -> some View {
        Text(text).appFont(compact ? 26 : 40, .black).foregroundStyle(.white)
    }

    private func dots(count: Int) -> some View {
        HStack(spacing: 4) {
            ForEach(0..<min(count, 16), id: \.self) { i in
                Capsule()
                    .fill(i == index % count ? Theme.highlight : .white.opacity(0.25))
                    .frame(width: i == index % count ? 16 : 6, height: 6)
            }
            if count > 16 {
                Text("\(index % count + 1)/\(count)").appFont(11).foregroundStyle(.white.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity)
        .animation(.easeOut(duration: 0.2), value: index)
    }

    private func playCurrent() async {
        missing = false
        guard let clip = current else {
            player.pause()
            return
        }
        switch clip.kind {
        case .letter:
            player.pause()
            try? await Task.sleep(for: .milliseconds(900))
        case .video:
            guard let url = Bundle.main.url(forResource: clip.resource, withExtension: "mp4") else {
                missing = true
                try? await Task.sleep(for: .milliseconds(2800))
                break
            }
            let item = AVPlayerItem(url: url)
            player.replaceCurrentItem(with: item)
            player.isMuted = true
            player.play()
            let started = Date()
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(100))
                if item.status == .failed {
                    missing = true
                    try? await Task.sleep(for: .milliseconds(2800))
                    break
                }
                let duration = item.duration.seconds
                if duration.isFinite, duration > 0, item.currentTime().seconds >= duration - 0.05 { break }
                if Date().timeIntervalSince(started) > 12 { break }
            }
        }
        guard !Task.isCancelled else { return }
        index += 1
    }
}

/// AVPlayerLayer host without playback controls.
private struct PlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerUIView {
        let view = PlayerUIView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        return view
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.playerLayer.player = player
    }

    final class PlayerUIView: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    }
}
