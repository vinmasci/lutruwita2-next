# Lutruwita Swift

This is the Swift implementation of the Lutruwita mobile app, migrated from React Native.

## Project Status

This project is in the early stages of migration from React Native to Swift. The current implementation includes:

- ✅ Basic project structure
- ✅ Authentication flow (mock implementation)
- ✅ Main navigation structure
- ✅ Map view (placeholder implementation)
- ✅ Route management (mock implementation)
- ✅ Offline capabilities (mock implementation)
- ✅ Search and filtering UI
- ✅ Loading indicators and UI components
- ✅ Firebase service (mock implementation)
- ✅ Project configuration files
- ❌ Mapbox integration (not yet implemented)
- ❌ Real Firebase integration (not yet implemented)
- ❌ Real API integration (not yet implemented)

## Project Structure

The project follows the MVVM (Model-View-ViewModel) architecture pattern:

```
LutruwitaSwift/
├── App/                    # App entry point
│   ├── LutruwitaApp.swift  # SwiftUI app entry point
│   ├── AppDelegate.swift   # UIKit app delegate
│   └── SceneDelegate.swift # UIKit scene delegate
├── Models/                 # Data models
│   ├── User.swift          # User model
│   └── Route.swift         # Route model
├── Views/                  # UI components
│   ├── Screens/            # Main screens
│   │   ├── AuthView.swift  # Authentication screen
│   │   ├── HomeView.swift  # Home screen with map
│   │   ├── SavedRoutesView.swift # Saved routes screen
│   │   ├── DownloadsView.swift # Downloads screen
│   │   ├── ProfileView.swift # Profile screen
│   │   └── MainTabView.swift # Main tab navigation
│   ├── Components/         # Reusable components
│   │   ├── MapView.swift   # Map component
│   │   ├── RouteCard.swift # Route card component
│   │   └── LoadingView.swift # Loading indicator
│   └── Modifiers/          # SwiftUI modifiers
├── ViewModels/             # Business logic
│   ├── AuthViewModel.swift # Authentication logic
│   ├── RouteViewModel.swift # Route management logic
│   ├── MapViewModel.swift  # Map interaction logic
│   └── OfflineViewModel.swift # Offline functionality
├── Services/               # API and data services
│   ├── AuthService.swift   # Authentication service
│   ├── RouteService.swift  # Route data service
│   └── FirebaseService.swift # Firebase service
├── Utils/                  # Helper functions
├── Resources/              # Assets, configs
│   ├── Info.plist          # App configuration
│   ├── GoogleService-Info.plist # Firebase configuration
│   ├── Auth0.plist         # Auth0 configuration
│   └── Mapbox-Info.plist   # Mapbox configuration
├── Package.swift           # Swift Package Manager config
├── Podfile                 # CocoaPods dependencies
└── .gitignore              # Git ignore file
```

## Setup Instructions

### Prerequisites

- Xcode 15.0+
- iOS 16.0+
- Swift 5.9+
- CocoaPods 1.12.0+

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/lutruwita-swift.git
   cd lutruwita-swift
   ```

2. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your API keys and credentials.

3. Generate configuration files
   ```bash
   ./generate-config.sh
   ```
   This script will generate the necessary configuration files from your environment variables.

4. Install dependencies and set up the project
   ```bash
   ./setup.sh
   ```
   This script will install CocoaPods dependencies and open the workspace.

5. Build and run the project in Xcode

### Scripts

The project includes several utility scripts to help with setup and configuration:

- **setup.sh**: Sets up the project and installs dependencies
  ```bash
  ./setup.sh
  ```

- **generate-config.sh**: Generates configuration files from environment variables
  ```bash
  ./generate-config.sh
  ```

These scripts automate the setup process and make it easier to get started with the project.

### Configuration Files

The project includes several configuration files:

- **Info.plist**: Main app configuration
- **GoogleService-Info.plist**: Firebase configuration
- **Auth0.plist**: Auth0 configuration
- **Mapbox-Info.plist**: Mapbox configuration

You'll need to replace the placeholder values in these files with your actual API keys and credentials.

## Key Components

### Models

- `User`: Represents a user in the system
- `Route`: Represents a trail route with coordinates, distance, elevation, etc.

### ViewModels

- `AuthViewModel`: Manages authentication state and operations
- `RouteViewModel`: Manages route data and operations
- `MapViewModel`: Handles map interactions and location services
- `OfflineViewModel`: Manages offline content and downloads

### Services

- `AuthService`: Handles authentication operations (currently a mock implementation)
- `RouteService`: Handles route data operations (currently a mock implementation)
- `FirebaseService`: Provides Firebase functionality (currently a mock implementation)

### Views

- `MainTabView`: Main tab navigation
- `HomeView`: Map browsing screen
- `SavedRoutesView`: Saved routes list
- `DownloadsView`: Offline content management
- `ProfileView`: User profile and settings
- `AuthView`: Login screen

## Implementation Notes

### Authentication

The current implementation uses a mock authentication service. In the final implementation, this will be replaced with Auth0 and Firebase integration.

### Map Integration

The current implementation uses a placeholder map view. In the final implementation, this will be replaced with Mapbox Maps SDK integration.

### Data Storage

The current implementation uses in-memory storage. In the final implementation, this will be replaced with Firebase Firestore for cloud storage and Core Data for local storage.

## Next Steps

1. Configure Xcode project with the provided configuration files
2. Integrate Mapbox Maps SDK using the provided configuration
3. Implement Firebase authentication and Firestore using the provided configuration
4. Implement real offline capabilities with Mapbox offline API
5. Add real API integration
6. Implement route creation and editing
7. Add user profile management
8. Implement settings and preferences

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Mapbox Maps SDK for iOS](https://docs.mapbox.com/ios/maps/guides/)
- [Firebase iOS SDK](https://firebase.google.com/docs/ios/setup)
- [Auth0 Swift SDK](https://auth0.com/docs/quickstart/native/ios-swift)
- [Combine Framework](https://developer.apple.com/documentation/combine)
- [Core Data](https://developer.apple.com/documentation/coredata)
