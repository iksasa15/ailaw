import SwiftUI

/// «النظارة الذكية» mark: a pair of glasses. The right lens holds a voice (equalizer bars),
/// the left lens a raised signing hand — speech comes in, sign language goes out.
/// Drawn in a 1024-unit space so the app icon and the in-app logo are the same drawing.
/// Pure SwiftUI (no UIKit/AppKit): `design/IconRenderer.swift` renders it to the app icon PNGs.
struct BrandGlyph: View {
    var ring: Color
    var hand: Color
    var wave: Color
    /// Region of the 1024 space to show. `.tight` hugs the glasses; `.full` is the icon square.
    var box: CGRect = BrandGlyph.tight
    var shadow: Bool = false

    static let tight = CGRect(x: 92, y: 380, width: 840, height: 270)
    static let full = CGRect(x: 0, y: 0, width: 1024, height: 1024)
    /// The icon square zoomed 10% around the glasses.
    static let icon = CGRect(x: 512 - 931 / 2, y: 518 - 931 / 2, width: 931, height: 931)

    // Geometry (1024 space).
    static let leftLens = CGPoint(x: 319, y: 520)
    static let rightLens = CGPoint(x: 705, y: 520)
    static let lensRadius: CGFloat = 150
    static let lensStroke: CGFloat = 46

    var body: some View {
        Canvas { context, size in
            let scale = min(size.width / box.width, size.height / box.height)
            let dx = (size.width - box.width * scale) / 2 - box.minX * scale
            let dy = (size.height - box.height * scale) / 2 - box.minY * scale
            context.translateBy(x: dx, y: dy)
            context.scaleBy(x: scale, y: scale)
            if shadow {
                context.addFilter(.shadow(color: .black.opacity(0.22), radius: 18, x: 0, y: 10))
            }
            context.drawLayer { layer in
                Self.drawFrame(in: &layer, color: ring)
                Self.drawWave(in: &layer, color: wave)
                Self.drawHand(in: &layer, color: hand)
            }
        }
        .environment(\.layoutDirection, .leftToRight)
    }

    private static func drawFrame(in context: inout GraphicsContext, color: Color) {
        let stroke = StrokeStyle(lineWidth: lensStroke, lineCap: .round, lineJoin: .round)
        for center in [leftLens, rightLens] {
            let r = lensRadius
            let inner = r - lensStroke / 2
            // A faint glass tint inside each lens.
            context.fill(Path(ellipseIn: CGRect(x: center.x - inner, y: center.y - inner, width: 2 * inner, height: 2 * inner)),
                         with: .color(color.opacity(0.10)))
            context.stroke(Path(ellipseIn: CGRect(x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r)),
                           with: .color(color), style: stroke)
        }
        var bridge = Path()
        bridge.move(to: CGPoint(x: 478, y: 492))
        bridge.addCurve(to: CGPoint(x: 546, y: 492), control1: CGPoint(x: 494, y: 452), control2: CGPoint(x: 530, y: 452))
        context.stroke(bridge, with: .color(color), style: StrokeStyle(lineWidth: 40, lineCap: .round))

        var temples = Path()
        temples.move(to: CGPoint(x: 156, y: 470))
        temples.addLine(to: CGPoint(x: 112, y: 438))
        temples.move(to: CGPoint(x: 868, y: 470))
        temples.addLine(to: CGPoint(x: 912, y: 438))
        context.stroke(temples, with: .color(color), style: StrokeStyle(lineWidth: 40, lineCap: .round))
    }

    /// Voice: three rounded equalizer bars in the right lens.
    private static func drawWave(in context: inout GraphicsContext, color: Color) {
        let c = rightLens
        let bars: [(dx: CGFloat, height: CGFloat)] = [(-58, 108), (0, 188), (58, 128)]
        for bar in bars {
            let rect = CGRect(x: c.x + bar.dx - 19, y: c.y - bar.height / 2, width: 38, height: bar.height)
            context.fill(Path(roundedRect: rect, cornerRadius: 19), with: .color(color))
        }
    }

    /// Sign: an open raised hand (palm facing the viewer, thumb out) in the left lens.
    private static func drawHand(in context: inout GraphicsContext, color: Color) {
        let c = leftLens
        let palmTop = c.y - 2
        var hand = Path()
        // Palm.
        hand.addRoundedRect(in: CGRect(x: c.x - 60, y: palmTop - 6, width: 120, height: 100),
                            cornerSize: CGSize(width: 42, height: 42))
        // Fingers: index, middle, ring, little (left → right), slightly fanned, with small gaps.
        let fingers: [(dx: CGFloat, length: CGFloat, tilt: CGFloat)] = [
            (-45, 84, -0.10), (-15, 98, -0.03), (15, 92, 0.03), (45, 72, 0.12),
        ]
        for finger in fingers {
            let shape = Path(roundedRect: CGRect(x: -12, y: -finger.length, width: 24, height: finger.length + 24),
                             cornerSize: CGSize(width: 12, height: 12))
            hand.addPath(shape, transform: CGAffineTransform(translationX: c.x + finger.dx, y: palmTop + 6).rotated(by: finger.tilt))
        }
        // Thumb, leaning out to the left from the base of the palm.
        let thumb = Path(roundedRect: CGRect(x: -13, y: -70, width: 26, height: 84), cornerSize: CGSize(width: 13, height: 13))
        hand.addPath(thumb, transform: CGAffineTransform(translationX: c.x - 52, y: c.y + 56).rotated(by: -.pi / 4.2))
        context.fill(hand, with: .color(color))
    }
}

/// The full app icon (square, no mask — iOS applies the rounded shape).
struct BrandIcon: View {
    enum Variant { case light, dark, tinted }
    var variant: Variant = .light

    var body: some View {
        ZStack {
            background
            BrandGlyph(ring: ringColor, hand: handColor, wave: waveColor, box: BrandGlyph.icon, shadow: variant == .light)
        }
    }

    @ViewBuilder private var background: some View {
        switch variant {
        case .light:
            ZStack {
                LinearGradient(colors: [Color(brandHex: 0x13897F), Color(brandHex: 0x0B4F4A)],
                               startPoint: .top, endPoint: .bottom)
                RadialGradient(colors: [Color.white.opacity(0.16), .clear], center: UnitPoint(x: 0.25, y: 0.12),
                               startRadius: 0, endRadius: 620)
            }
        case .dark:
            LinearGradient(colors: [Color(brandHex: 0x0C2826), Color(brandHex: 0x040D0E)],
                           startPoint: .top, endPoint: .bottom)
        case .tinted:
            Color.black
        }
    }

    private var ringColor: Color {
        switch variant {
        case .light, .tinted: .white
        case .dark: Color(brandHex: 0x5EEAD4)
        }
    }

    private var handColor: Color {
        switch variant {
        case .light: .white
        case .dark: Color(brandHex: 0xF0FDFA)
        case .tinted: Color.white.opacity(0.92)
        }
    }

    private var waveColor: Color {
        switch variant {
        case .light: Color(brandHex: 0x5EEAD4)
        case .dark: Color(brandHex: 0x2DD4BF)
        case .tinted: Color.white.opacity(0.62)
        }
    }
}

extension Color {
    /// 0xRRGGBB (brand drawing only; kept separate so BrandMark compiles on its own).
    init(brandHex hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
}
