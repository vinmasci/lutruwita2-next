// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LutruwitaSwift",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "LutruwitaSwift",
            targets: ["LutruwitaSwift"]),
    ],
    dependencies: [
        // Mapbox Maps SDK
        .package(url: "https://github.com/mapbox/mapbox-maps-ios.git", from: "11.0.0"),
        
        // Firebase
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.0.0"),
        
        // Auth0
        .package(url: "https://github.com/auth0/Auth0.swift.git", from: "2.0.0"),
        
        // Kingfisher for image loading/caching
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.0.0"),
    ],
    targets: [
        .target(
            name: "LutruwitaSwift",
            dependencies: [
                .product(name: "MapboxMaps", package: "mapbox-maps-ios"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseStorage", package: "firebase-ios-sdk"),
                .product(name: "Auth0", package: "Auth0.swift"),
                .product(name: "Kingfisher", package: "Kingfisher"),
            ],
            path: ".",
            exclude: ["Resources/Info.plist", "README.md"]
        ),
        .testTarget(
            name: "LutruwitaSwiftTests",
            dependencies: ["LutruwitaSwift"],
            path: "Tests"
        ),
    ]
)
