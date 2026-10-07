// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AILawCore",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "AILawCore", targets: ["AILawCore"]),
    ],
    targets: [
        .target(name: "AILawCore"),
        .testTarget(name: "AILawCoreTests", dependencies: ["AILawCore"]),
    ]
)
