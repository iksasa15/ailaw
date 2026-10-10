import SwiftUI

/// «المحامون العرب» app logo: the three figures (blue, orange, purple) on a white rounded tile.
/// The artwork lives in the asset catalog (`BrandMark` = figures, `BrandLogo` = figures + name).
struct BrandIcon: View {
    var body: some View {
        ZStack {
            Color.white
            Image("BrandMark")
                .resizable()
                .scaledToFit()
                .padding(6)
        }
        .accessibilityLabel("المحامون العرب")
    }
}
