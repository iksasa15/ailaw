// Renders the app icon PNGs from the same SwiftUI drawing the app uses (BrandMark.swift).
//
//   swiftc -parse-as-library design/IconRenderer.swift "AI LAW/AI LAW/Components/BrandMark.swift" -o /tmp/icon-renderer
//   /tmp/icon-renderer "AI LAW/AI LAW/Assets.xcassets/AppIcon.appiconset"
import AppKit
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

@main
struct IconRenderer {
    @MainActor
    static func main() throws {
        let out = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? ".")
        let variants: [(BrandIcon.Variant, String)] = [(.light, "AppIcon-light.png"), (.dark, "AppIcon-dark.png"), (.tinted, "AppIcon-tinted.png")]
        for (variant, name) in variants {
            let renderer = ImageRenderer(content: BrandIcon(variant: variant).frame(width: 1024, height: 1024))
            renderer.scale = 1
            guard let image = renderer.cgImage else { throw CocoaError(.fileWriteUnknown) }
            // App Store icons must not have an alpha channel: redraw into an opaque sRGB bitmap.
            guard let ctx = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { throw CocoaError(.fileWriteUnknown) }
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: 1024, height: 1024))
            guard let opaque = ctx.makeImage() else { throw CocoaError(.fileWriteUnknown) }
            let url = out.appendingPathComponent(name)
            guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
                throw CocoaError(.fileWriteUnknown)
            }
            CGImageDestinationAddImage(dest, opaque, nil)
            guard CGImageDestinationFinalize(dest) else { throw CocoaError(.fileWriteUnknown) }
            print("wrote \(url.path) \(image.width)x\(image.height)")
        }
    }
}
