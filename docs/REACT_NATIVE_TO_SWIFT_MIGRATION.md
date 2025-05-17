# React Native to Swift Migration Plan

This document outlines the strategy for migrating the Lutruwita mobile app from React Native to a native Swift implementation for iOS.

## Current Status

- ✅ Migration plan created
- ✅ Swift project structure initialized
- ✅ Basic UI components implemented
- ✅ Mock services implemented
- ✅ Navigation structure implemented
- ✅ Authentication flow implemented (mock)
- ✅ Route management implemented (mock)
- ✅ Offline capabilities implemented (mock)
- ✅ Search and filtering UI implemented
- ✅ Loading indicators and UI components implemented
- ✅ Firebase service implemented (mock)
- ✅ Project configuration files created
- ✅ Xcode project and workspace set up
- ✅ Dependencies installed via CocoaPods
- ✅ Mapbox integration implemented
- ✅ Offline maps functionality implemented
- ❌ Real Firebase integration not yet implemented
- ❌ Real API integration not yet implemented
- ❌ Testing not yet started
- ❌ Build issues need to be resolved

## Current Build Issues

We have made progress on resolving the build issues, but are still facing some challenges:

1. **Missing File References**: The primary issue we've identified is that the Xcode project is looking for hundreds of Swift files in the wrong location. As shown in the [SWIFTLOG.md](./SWIFTLOG.md) file, the build is failing because it's looking for files like:
   ```
   Build input files cannot be found: '/Users/vincentmasci/Desktop/lutruwita2-next/mobile/LutruwitaSwift/AppCheckAPITests.swift', '/Users/vincentmasci/Desktop/lutruwita2-next/mobile/LutruwitaSwift/Auth0.swift', ...
   ```
   
   These files are part of the Auth0, Firebase, and other SDK dependencies, but the project is looking for them directly in the project directory instead of in the Pods directory.

2. **App Architecture Issues**: We've identified and addressed conflicts between UIKit and SwiftUI lifecycle approaches:
   - Removed multiple `@main` entry points (in both AppDelegate.swift and LutruwitaApp.swift)
   - Consolidated to SwiftUI's App lifecycle and removed UIKit's AppDelegate/SceneDelegate
   - Updated Info.plist configuration to match the SwiftUI lifecycle

3. **Dependency Configuration**: We've made progress on Firebase and Mapbox configuration:
   - Moved Firebase initialization to the SwiftUI app's init method
   - Configured Mapbox access token in the SwiftUI app's init method
   - Removed UIApplicationSceneManifest from Info.plist

### Resolution Progress

1. **App Lifecycle Consolidation** ✅:
   - Successfully migrated to SwiftUI app lifecycle with a single `@main` entry point
   - Removed UIKit-specific scene delegate configuration from Info.plist
   - Properly initialized Firebase and Mapbox in the SwiftUI app's init method
   - Removed AppDelegate.swift and SceneDelegate.swift from the project

2. **Project File Cleanup** 🔄:
   - Created scripts to remove incorrect file references from the project file
   - Removed references to AppDelegate.swift and SceneDelegate.swift
   - Updated main entry point in the project file to use the SwiftUI app lifecycle
   - Fixed project paths to ensure files are found in the correct locations

3. **Next Steps** 📋:
   - Continue cleaning up the project file to remove references to missing files
   - Ensure all dependencies are correctly linked through CocoaPods
   - Update the project configuration to target iOS Simulator specifically
   - Verify all view models and services are properly imported and in the correct scope

## Current App Overview

The Lutruwita mobile app currently has:
- Map viewing and interaction capabilities using Mapbox
- Route saving for offline access via Firebase
- Offline map downloads using Mapbox/MapTiler
- Authentication system using Auth0 and Firebase
- Multiple screens:
  - Home (map browsing)
  - Saved Routes
  - Downloads (offline maps and routes)
  - Profile
  - Map detail view
- Context providers for state management:
  - AuthContext
  - MapContext
  - RouteContext
  - SavedRoutesContext
  - OfflineMapsContext
  - RouteSpecificOfflineMapsContext

## UIKit vs SwiftUI Comparison

**SwiftUI:**
- Newer, declarative UI framework (introduced in 2019)
- Similar to React's component-based approach
- Less code, faster development
- Great for new projects
- Still maturing, some complex UI may require UIKit fallbacks
- Better for simple to moderately complex UIs

**UIKit:**
- Traditional, imperative UI framework
- More mature, stable, and feature-complete
- More control over UI elements and animations
- Better for complex UIs with custom interactions
- Steeper learning curve
- More verbose code

**Recommendation:** Start with SwiftUI for faster development and familiar declarative approach (similar to React), with UIKit fallbacks for complex components if needed. This hybrid approach gives you the best of both worlds.

## Migration Strategy

### 1. Project Setup
- Create a new Swift iOS project with SwiftUI
- Set up project structure:
  ```
  LutruwitaSwift/
  ├── App/                    # App entry point
  ├── Models/                 # Data models
  ├── Views/                  # UI components
  │   ├── Screens/            # Main screens
  │   │   ├── HomeView        # Home screen with map browsing
  │   │   ├── SavedRoutesView # Saved routes screen
  │   │   ├── DownloadsView   # Downloads management screen
  │   │   ├── ProfileView     # User profile screen
  │   │   ├── MapDetailView   # Map detail view
  │   │   ├── AuthView        # Authentication screen
  │   ├── Components/         # Reusable components
  │   │   ├── MapView         # Mapbox map component
  │   │   ├── RouteCard       # Route card component
  │   │   ├── DownloadItem    # Download item component
  │   │   ├── LoadingView     # Loading indicator
  │   └── Modifiers/          # SwiftUI modifiers
  ├── ViewModels/             # Business logic
  │   ├── AuthViewModel       # Authentication logic
  │   ├── MapViewModel        # Map interaction logic
  │   ├── RouteViewModel      # Route management logic
  │   ├── OfflineViewModel    # Offline functionality logic
  ├── Services/               # API and data services
  │   ├── FirebaseService     # Firebase integration
  │   ├── MapboxService       # Mapbox integration
  │   ├── AuthService         # Auth0 integration
  │   ├── RouteService        # Route data handling
  │   ├── OfflineService      # Offline data management
  ├── Utils/                  # Helper functions
  └── Resources/              # Assets, configs
  ```

### 2. Core Dependencies
- Mapbox Maps SDK for iOS (via SPM)
- Firebase iOS SDK (Authentication, Firestore)
- Auth0 SDK for iOS
- Kingfisher for image loading/caching
- Combine framework for reactive programming

### 3. SDK Integration (Addressing the wrapper issues)
- Direct integration with native SDKs:
  - Mapbox Maps SDK for iOS (via SPM)
  - Firebase iOS SDK (Authentication, Firestore)
  - Auth0 SDK for iOS
  - CoreLocation for location services
  - No more JS-to-native bridge issues

### 4. Architecture
- MVVM (Model-View-ViewModel) architecture
- SwiftUI for the UI layer
- Combine for state management (replacing Context providers)
- Service layers for API interactions

### 5. Core Features Implementation

#### 5.1 Navigation System
- TabView for main navigation (replacing bottom tab navigator)
  ```swift
  TabView(selection: $selectedTab) {
      HomeView()
          .tabItem {
              Label("Map", systemImage: "map")
          }
          .tag(Tab.home)
      
      SavedRoutesView()
          .tabItem {
              Label("Saved", systemImage: "bookmark")
          }
          .tag(Tab.savedRoutes)
      
      DownloadsView()
          .tabItem {
              Label("Downloads", systemImage: "arrow.down.circle")
          }
          .tag(Tab.downloads)
      
      ProfileView()
          .tabItem {
              Label("Profile", systemImage: "person")
          }
          .tag(Tab.profile)
  }
  ```
- NavigationView for screen stacks (replacing stack navigator)

#### 5.2 Map Implementation
- Direct Mapbox Maps SDK integration
  ```swift
  import MapboxMaps
  
  struct MapView: UIViewRepresentable {
      @Binding var centerCoordinate: CLLocationCoordinate2D
      var onMapTap: (CLLocationCoordinate2D) -> Void
      
      func makeUIView(context: Context) -> MapboxMaps.MapView {
          let options = MapInitOptions(resourceOptions: ResourceOptions(accessToken: "YOUR_MAPBOX_ACCESS_TOKEN"))
          let mapView = MapboxMaps.MapView(frame: .zero, mapInitOptions: options)
          mapView.gestures.delegate = context.coordinator
          return mapView
      }
      
      func updateUIView(_ mapView: MapboxMaps.MapView, context: Context) {
          mapView.mapboxMap.setCamera(to: CameraOptions(center: centerCoordinate, zoom: 12.0))
      }
      
      func makeCoordinator() -> Coordinator {
          Coordinator(self)
      }
      
      class Coordinator: NSObject, GestureManagerDelegate {
          var parent: MapView
          
          init(_ parent: MapView) {
              self.parent = parent
          }
          
          func gestureManager(_ gestureManager: MapboxMaps.GestureManager, didEndMapTapGesture tapGesture: UITapGestureRecognizer) {
              let point = tapGesture.location(in: gestureManager.view)
              if let coordinate = gestureManager.mapView?.mapboxMap.coordinate(for: point) {
                  parent.onMapTap(coordinate)
              }
          }
      }
  }
  ```
- Custom annotations for routes and POIs
- MapView wrapper component

#### 5.3 Data Management
- Combine framework for reactive state
  ```swift
  class RouteViewModel: ObservableObject {
      @Published var routes: [Route] = []
      @Published var isLoading: Bool = false
      @Published var error: Error? = nil
      
      private var cancellables = Set<AnyCancellable>()
      private let routeService: RouteService
      
      init(routeService: RouteService) {
          self.routeService = routeService
          loadRoutes()
      }
      
      func loadRoutes() {
          isLoading = true
          
          routeService.fetchRoutes()
              .receive(on: DispatchQueue.main)
              .sink(receiveCompletion: { [weak self] completion in
                  self?.isLoading = false
                  if case .failure(let error) = completion {
                      self?.error = error
                  }
              }, receiveValue: { [weak self] routes in
                  self?.routes = routes
              })
              .store(in: &cancellables)
      }
  }
  ```
- ObservableObject for view models
- UserDefaults and FileManager for local storage
- Core Data for structured data storage

#### 5.4 Authentication
- Firebase Auth or Auth0 integration
  ```swift
  class AuthService {
      private let auth0: Auth0.Authentication
      private let credentials: Auth0.Credentials?
      
      init() {
          auth0 = Auth0.Authentication(clientId: "YOUR_AUTH0_CLIENT_ID", domain: "YOUR_AUTH0_DOMAIN")
      }
      
      func login() -> AnyPublisher<User, Error> {
          // Implementation using Auth0 SDK
      }
      
      func logout() -> AnyPublisher<Void, Error> {
          // Implementation using Auth0 SDK
      }
  }
  ```
- Secure credential storage with Keychain

#### 5.5 Offline Capabilities
- Mapbox offline maps API
  ```swift
  class OfflineService {
      private let offlineManager: OfflineManager
      
      init() {
          offlineManager = OfflineManager()
      }
      
      func downloadRegion(for route: Route) -> AnyPublisher<DownloadProgress, Error> {
          // Implementation using Mapbox offline API
      }
      
      func listDownloadedRegions() -> AnyPublisher<[OfflineRegion], Error> {
          // Implementation using Mapbox offline API
      }
  }
  ```
- Core Data for structured data storage
- FileManager for GPX/route data

### 6. Feature Migration Priority
1. Core navigation and UI structure
2. Map integration with Mapbox
3. Route loading and display
4. Authentication
5. Offline capabilities
6. Filtering system
7. Theme support

### 7. Data Models
- Create Swift structs/classes to match TypeScript interfaces
  ```swift
  struct Route: Identifiable, Codable {
      let id: String
      let name: String
      let description: String?
      let distance: Double
      let elevation: Double
      let coordinates: [CLLocationCoordinate2D]
      let boundingBox: [[Double]]?
      
      // Additional properties
  }
  
  struct User: Identifiable, Codable {
      let id: String
      let email: String
      let name: String?
      let profileImage: URL?
  }
  ```
- Implement Codable for JSON parsing

### 8. API Integration
- Create Swift services to replace current service layer
  ```swift
  class RouteService {
      private let firebaseService: FirebaseService
      
      init(firebaseService: FirebaseService) {
          self.firebaseService = firebaseService
      }
      
      func fetchRoutes() -> AnyPublisher<[Route], Error> {
          // Implementation using Firebase SDK
      }
      
      func fetchRoute(id: String) -> AnyPublisher<Route, Error> {
          // Implementation using Firebase SDK
      }
      
      func saveRoute(route: Route) -> AnyPublisher<Void, Error> {
          // Implementation using Firebase SDK
      }
  }
  ```
- Use URLSession or Alamofire for network requests

## Detailed Implementation Plan

### Phase 1: Project Setup and Core Navigation (2 weeks)

#### Week 1: Project Initialization
- [x] Create new Swift project with SwiftUI
- [x] Set up project structure
- [ ] Configure basic dependencies (SPM)
- [x] Implement basic app navigation structure
- [x] Create placeholder screens

#### Week 2: Authentication and User Management
- [ ] Implement Auth0 integration
- [x] Create login/logout functionality (mock implementation)
- [x] Set up user profile management (basic implementation)
- [ ] Implement secure credential storage
- [x] Create authentication flow (mock implementation)

### Phase 2: Map Integration and Route Display (3 weeks)

#### Week 3: Basic Map Integration
- [ ] Integrate Mapbox SDK
- [x] Create basic map view component (placeholder implementation)
- [x] Implement map controls (zoom, pan, etc.) (placeholder implementation)
- [ ] Set up location services

#### Week 4: Route Display
- [x] Implement route data models
- [ ] Create route display on map
- [x] Implement route details view
- [x] Add route selection functionality

#### Week 5: Route Management
- [ ] Implement Firebase integration
- [x] Create route fetching service (mock implementation)
- [x] Implement saved routes list
- [ ] Add route filtering functionality

### Phase 3: Offline Capabilities (2 weeks)

#### Week 6: Offline Maps
- [ ] Implement Mapbox offline maps functionality
- [ ] Create UI for managing offline maps
- [ ] Implement download progress tracking
- [ ] Add offline region management

#### Week 7: Offline Routes
- [ ] Implement local storage for routes
- [ ] Create offline route management
- [ ] Implement sync mechanism for offline changes
- [ ] Add offline usage detection and handling

### Phase 4: Refinement and Testing (3 weeks)

#### Week 8: UI Polish
- [ ] Implement theme support (light/dark mode)
- [ ] Refine animations and transitions
- [ ] Improve accessibility
- [ ] Optimize UI for different device sizes

#### Week 9: Performance Optimization
- [ ] Optimize map rendering
- [ ] Improve data loading and caching
- [ ] Reduce memory usage
- [ ] Optimize battery consumption

#### Week 10: Testing and Bug Fixing
- [ ] Implement unit tests
- [ ] Conduct UI testing
- [ ] Fix identified bugs
- [ ] Perform final optimizations

## Migration Approach

1. Start with a functioning skeleton app with navigation
2. Implement the map screen first (core functionality)
3. Add authentication
4. Build route listing and filtering
5. Implement offline capabilities
6. Add user profile and settings
7. Polish UI and add themes

## Testing Strategy
- Create unit tests for business logic
- UI tests for critical flows
- Manual testing on different iOS versions
- Performance testing for map interactions
- Offline functionality testing

## Key Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| Complex map interactions | Use Mapbox native SDK directly |
| State management | Combine + ObservableObject pattern |
| Offline data | Core Data + FileManager |
| Authentication | Native Auth0 SDK + Firebase SDK |
| UI consistency | Design system with SwiftUI components |
| Performance | Native code, optimized rendering |
| Data migration | Export/import functionality for user data |

## Next Steps

1. ✅ Set up the initial Swift project structure
   - Project structure has been created with the MVVM architecture pattern
   - Basic files and directories have been set up

2. ✅ Create the basic navigation structure
   - TabView for main navigation has been implemented
   - NavigationView for screen stacks has been implemented
   - Authentication flow has been implemented (mock)

3. ✅ Implement placeholder screens
   - HomeView with map placeholder has been implemented
   - SavedRoutesView with route list has been implemented
   - DownloadsView with offline content management has been implemented
   - ProfileView with user settings has been implemented
   - AuthView with login screen has been implemented

4. ✅ Implement core functionality
   - Route data models have been implemented
   - Route service (mock) has been implemented
   - Route view model has been implemented
   - Route detail view has been implemented
   - Route creation functionality has been implemented
   - Map view model has been implemented
   - Offline view model has been implemented (mock)
   - Firebase service has been implemented (mock)
   - Search and filtering UI has been implemented
   - Loading indicators and UI components have been implemented

5. ✅ Prepare for SDK integration
   - Created Info.plist with required permissions
   - Created configuration files for Firebase, Auth0, and Mapbox
   - Created Package.swift for Swift Package Manager dependencies
   - Created Podfile for CocoaPods dependencies
   - Created AppDelegate and SceneDelegate for app initialization
   - Created .gitignore file for version control

6. ✅ Finalize project configuration
   - Created setup.sh script for project setup and dependency installation
   - Created generate-config.sh script for generating configuration files from environment variables
   - Created .env.example file for environment variable configuration
   - Added detailed README with setup instructions

7. ✅ Set up Xcode project and dependencies
   - Created Xcode project file
   - Configured build settings
   - Installed dependencies using CocoaPods
   - Created workspace for development

8. ✅ Implement real SDK integrations
   - Implemented real map integration with Mapbox
   - Configured Mapbox with the provided access token
   - Set up map view with basic functionality
   - Implemented offline map capabilities with Mapbox

9. 🔄 Current focus: Implement real authentication
   - Implement real authentication with Auth0
   - Connect to Firebase backend for user data
   - Set up secure credential storage

10. 📋 Next priorities:
    - Implement route display on map
    - Connect Firebase service to real Firebase backend
    - Add unit tests for core functionality

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Mapbox Maps SDK for iOS](https://docs.mapbox.com/ios/maps/guides/)
- [Firebase iOS SDK](https://firebase.google.com/docs/ios/setup)
- [Auth0 Swift SDK](https://auth0.com/docs/quickstart/native/ios-swift)
- [Combine Framework](https://developer.apple.com/documentation/combine)
- [Core Data](https://developer.apple.com/documentation/coredata)
