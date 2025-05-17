# Firebase Swift Setup Steps

This document provides detailed steps for setting up Firebase in a Swift app, with a focus on the CyaTrails app implementation.

## 1. Add Firebase SDK to Your Project

### Using Swift Package Manager (SPM)

1. Open your Xcode project
2. Go to File > Add Packages...
3. Enter the Firebase iOS SDK URL: `https://github.com/firebase/firebase-ios-sdk.git`
4. Select the desired version (recommended: `.upToNextMajor(from: "10.0.0")`)
5. Select the Firebase products you need:
   - FirebaseFirestore
   - FirebaseAuth
   - FirebaseStorage (if you need to store files)
   - FirebaseAnalytics (optional, for analytics)
6. Click "Add Package"

## 2. Add GoogleService-Info.plist

1. Download the GoogleService-Info.plist file from the Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Click on the iOS app (or add a new iOS app if needed)
   - Download the GoogleService-Info.plist file

2. Add the file to your Xcode project:
   - Place the file in your project's main directory: `mobile/CyaTrails/CyaTrails/GoogleService-Info.plist`
   - In Xcode, right-click on the "CyaTrails" group in the Project Navigator
   - Select "Add Files to 'CyaTrails'..."
   - Navigate to and select the GoogleService-Info.plist file
   - Ensure "Copy items if needed" is checked
   - Make sure your app target is selected
   - Click "Add"

## 3. Initialize Firebase

Add Firebase initialization code to your app's entry point:

```swift
// In CyaTrailsApp.swift
import SwiftUI
import FirebaseCore

// Firebase initialization delegate
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        return true
    }
}

@main
struct CyaTrailsApp: App {
    // Register app delegate for Firebase setup
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    // Rest of your app code...
}
```

## 4. Configure Firestore Settings

For optimal performance, configure Firestore settings in your FirebaseService class:

```swift
// In FirebaseService.swift
private init() {
    // Configure Firestore settings
    let settings = FirestoreSettings()
    // Enable offline persistence
    settings.isPersistenceEnabled = true
    // Set cache size to unlimited
    settings.cacheSizeBytes = FirestoreCacheSizeUnlimited
    db.settings = settings
}
```

## 5. Test Firebase Connection

To verify your Firebase setup is working correctly:

```swift
import FirebaseFirestore

// Test Firestore connection
let db = Firestore.firestore()
db.collection("test").document("test").getDocument { (document, error) in
    if let error = error {
        print("Error getting document: \(error)")
    } else {
        print("Firebase connection successful!")
    }
}
```

## 6. Common Issues and Solutions

### Issue: "FirebaseApp.configure() may not work correctly"
- Make sure GoogleService-Info.plist is added to the correct target
- Verify the file is included in the "Copy Bundle Resources" build phase

### Issue: "No Firebase app '[DEFAULT]' has been created"
- Ensure FirebaseApp.configure() is called before any Firebase API usage
- Check that the AppDelegate is properly registered with @UIApplicationDelegateAdaptor

### Issue: "Missing GoogleService-Info.plist"
- Verify the file is in the correct location and added to the project
- Check that the file is included in the target's bundle resources

## 7. Security Rules

Remember to update your Firebase Security Rules in the Firebase Console to allow your app to read and write data. For development, you can use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production, implement more restrictive rules based on your app's authentication and authorization requirements.

## 8. Implementing Route Display on Map

After setting up Firebase, you can implement route display on the map with the following steps:

### 8.1 Add Mapbox SDK

1. Add the Mapbox Maps SDK for iOS using Swift Package Manager:
   - Go to File > Add Packages...
   - Enter the Mapbox Maps SDK URL: `https://github.com/mapbox/mapbox-maps-ios.git`
   - Select the desired version
   - Click "Add Package"

2. Add your Mapbox access token to Info.plist:
   ```xml
   <key>MBXAccessToken</key>
   <string>YOUR_MAPBOX_ACCESS_TOKEN</string>
   ```

### 8.2 Create Route Models with Coordinate Support

Enhance your route models to include coordinate data:

```swift
// Add to RouteListItem model
extension RouteListItem {
    // Convert Firebase coordinates to CLLocationCoordinate2D
    var clCoordinate: CLLocationCoordinate2D? {
        guard let lat = startCoordinate?.lat,
              let lng = startCoordinate?.lng else {
            return nil
        }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
    
    // Store route coordinates for polyline display
    var routeCoordinates: [[[CLLocationCoordinate2D]]]?
}

// Create RouteMarker struct for map display
struct RouteMarker: Identifiable {
    var id: String
    var name: String
    var coordinate: CLLocationCoordinate2D
    var type: String
    var distance: Double
    var elevationGain: Double
    var routeCoordinates: [[CLLocationCoordinate2D]]?
    var geojson: GeoJSON?
}
```

### 8.3 Update Firebase Service to Fetch Route Coordinates

Enhance your Firebase service to fetch route coordinates:

```swift
func listRoutes(filters: [String: Any]? = nil) async throws -> [RouteListItem] {
    // Existing query code...
    
    // Process results
    var routes: [RouteListItem] = []
    for document in snapshot.documents {
        let data = document.data()
        
        // Create route item
        let route = RouteListItem(
            // Existing properties...
        )
        
        // Fetch route coordinates if needed
        if let routeId = data["routeId"] as? String {
            let coordsRef = db.collection("user_saved_routes")
                .document(document.documentID)
                .collection("routes")
                .document(routeId)
                .collection("data")
                .document("coords")
                
            let coordsDoc = try? await coordsRef.getDocument()
            if let coordsData = coordsDoc?.data(),
               let coordsArray = coordsData["data"] as? [[String: Any]] {
                
                // Process coordinates
                let coordinates = coordsArray.map { coord -> Coordinates in
                    let lng = coord["lng"] as? Double ?? 0
                    let lat = coord["lat"] as? Double ?? 0
                    return Coordinates(lng: lng, lat: lat)
                }
                
                // Store coordinates in route
                route.startCoordinate = coordinates.first
                route.routeCoordinates = [[coordinates.map { coord in
                    CLLocationCoordinate2D(latitude: coord.lat, longitude: coord.lng)
                }]]
            }
        }
        
        routes.append(route)
    }
    
    return routes
}
```

### 8.4 Create MapViewRepresentable for Mapbox Integration

Create a UIViewRepresentable for Mapbox integration:

```swift
struct MapViewRepresentable: UIViewRepresentable {
    @Binding var cameraPosition: CameraOptions
    @Binding var mapView: MapView?
    var routeMarkers: [RouteMarker] = []
    
    func makeUIView(context: Context) -> MapView {
        // Create MapView with Mapbox
        let mapInitOptions = MapInitOptions(styleURI: StyleURI.outdoors)
        let mapView = MapView(frame: .zero, mapInitOptions: mapInitOptions)
        
        // Configure map
        mapView.mapboxMap.setCamera(to: cameraPosition)
        let locationOptions = LocationOptions()
        mapView.location.options = locationOptions
        
        self.mapView = mapView
        return mapView
    }
    
    func updateUIView(_ mapView: MapView, context: Context) {
        // Add route markers and polylines
        if !routeMarkers.isEmpty {
            // Create annotation managers
            let circleAnnotationManager = mapView.annotations.makeCircleAnnotationManager()
            let polylineManager = mapView.annotations.makePolylineAnnotationManager()
            
            // Clear existing annotations
            circleAnnotationManager.annotations = []
            polylineManager.annotations = []
            
            // Create annotations for each route
            var circleAnnotations: [CircleAnnotation] = []
            var polylineAnnotations: [PolylineAnnotation] = []
            
            for marker in routeMarkers {
                // Create marker annotation
                var circleAnnotation = CircleAnnotation(centerCoordinate: marker.coordinate)
                circleAnnotation.circleRadius = 8.0
                circleAnnotation.circleStrokeWidth = 2.0
                circleAnnotation.circleStrokeColor = StyleColor(.white)
                
                // Set color based on route type
                let markerColor: UIColor
                switch marker.type {
                case "tourism": markerColor = .systemBlue
                case "bikepacking": markerColor = .systemGreen
                case "event": markerColor = .systemOrange
                default: markerColor = .systemRed
                }
                
                circleAnnotation.circleColor = StyleColor(markerColor)
                circleAnnotation.customData = ["routeId": JSONValue.string(marker.id)]
                circleAnnotations.append(circleAnnotation)
                
                // Add route polylines if available
                if let routeCoordinates = marker.routeCoordinates {
                    for coordinates in routeCoordinates {
                        var polylineAnnotation = PolylineAnnotation(lineCoordinates: coordinates)
                        polylineAnnotation.lineWidth = 3.0
                        polylineAnnotation.lineColor = StyleColor(markerColor.withAlphaComponent(0.7))
                        polylineAnnotations.append(polylineAnnotation)
                    }
                }
            }
            
            // Add annotations to map
            circleAnnotationManager.annotations = circleAnnotations
            polylineManager.annotations = polylineAnnotations
            
            // Set up tap handler
            let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(context.coordinator.handleMapTap(_:)))
            mapView.addGestureRecognizer(tapGesture)
            context.coordinator.circleAnnotations = circleAnnotations
            context.coordinator.mapView = mapView
            
            // Adjust camera to fit all markers
            if routeMarkers.count > 0 {
                let coordinates = routeMarkers.map { $0.coordinate }
                adjustCameraToFitCoordinates(mapView: mapView, coordinates: coordinates)
            }
        }
    }
    
    // Helper methods and Coordinator implementation...
}
```

### 8.5 Implement in HomeView

Integrate the map view into your HomeView:

```swift
struct HomeView: View {
    @StateObject private var viewModel = RouteListViewModel()
    @State private var cameraPosition = CameraOptions(center: CLLocationCoordinate2D(latitude: -41.4419, longitude: 146.8087), zoom: 6.0)
    @State private var mapView: MapView?
    
    var body: some View {
        ZStack {
            // Mapbox MapView
            MapViewRepresentable(
                cameraPosition: $cameraPosition,
                mapView: $mapView,
                routeMarkers: viewModel.getRouteMarkers()
            )
            .edgesIgnoringSafeArea([.top, .horizontal])
            
            // UI overlays
            VStack {
                // Filter controls
                HStack {
                    // Filter button
                    Button(action: { /* Show filter sheet */ }) {
                        HStack {
                            Image(systemName: "line.horizontal.3.decrease.circle")
                            Text("Filter")
                        }
                        .padding(8)
                        .background(Color.white.opacity(0.9))
                        .cornerRadius(8)
                    }
                    
                    Spacer()
                    
                    // Type selector
                    Picker("Map Type", selection: $viewModel.selectedType) {
                        Text("All").tag(nil as String?)
                        Text("Tourism").tag("tourism")
                        Text("Bikepacking").tag("bikepacking")
                        Text("Event").tag("event")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .background(Color.white.opacity(0.9))
                    .cornerRadius(8)
                }
                .padding(.top, 50)
                
                Spacer()
                
                // Route count indicator
                Text("\(viewModel.routeCount) trails")
                    .padding()
                    .background(Color.white.opacity(0.9))
                    .cornerRadius(10)
            }
            
            // Loading indicator
            if viewModel.isLoading {
                ProgressView()
            }
        }
        .onAppear {
            viewModel.loadRoutes()
        }
    }
}
```

### 8.6 Debugging Tips

When implementing route display, consider these debugging tips:

1. Add debug logging to track data flow:
   ```swift
   print("🗺️ Creating marker for route: \(route.id), name: \(route.name)")
   print("📍 Route has \(routeCoords.count) coordinate segments")
   ```

2. Use explicit type annotations to avoid Swift type inference issues:
   ```swift
   let markers = routes.compactMap { (route: RouteListItem) -> RouteMarker? in
       // Implementation
   }
   ```

3. Check for nil coordinates before creating annotations:
   ```swift
   guard let coordinate = route.clCoordinate else {
       print("❌ No coordinates for route: \(route.id)")
       return nil
   }
   ```

4. Use .seconds() instead of .milliseconds() for Combine debounce:
   ```swift
   $selectedType
       .debounce(for: .seconds(0.3), scheduler: RunLoop.main)
       .sink { [weak self] _ in
           self?.loadRoutes()
       }
       .store(in: &cancellables)
   ```
