import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

enum QRCodeImage {
    static func make(from string: String, size: CGFloat = 220) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scale = size / output.extent.width
        let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let cg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

struct QRCodeView: View {
    let string: String
    var size: CGFloat = 200

    var body: some View {
        Group {
            if let img = QRCodeImage.make(from: string, size: size) {
                Image(uiImage: img)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: size, height: size)
                    .padding(12)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            } else {
                Text("تعذر إنشاء رمز QR")
                    .foregroundStyle(AppTheme.muted)
            }
        }
    }
}
