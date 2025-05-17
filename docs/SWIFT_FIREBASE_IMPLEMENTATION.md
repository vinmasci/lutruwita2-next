# Swift Firebase Implementation Guide

This document provides a comprehensive guide for implementing Firebase data fetching in the Swift app. It outlines the key files to reference, the Firebase schema, and a step-by-step implementation plan, with a focus on replicating the functionality of the existing lutruwita-mobile app.

## Reference Files

### Mobile App Implementation

1. **Landing Page Implementation**:
   - `mobile/lutruwita-mobile/src/screens/HomeScreen.tsx` - Main landing page with map view and route markers
   - `mobile/lutruwita-mobile/src/hooks/useDynamicRouteFilters.ts` - Hook for filtering routes
   - `mobile/lutruwita-mobile/src/components/map/RoutePreviewDrawer.tsx` - Drawer for route previews
   - `mobile/lutruwita-mobile/src/components/map/RouteListDrawer.tsx` - Drawer for listing routes
   - `mobile/lutruwita-mobile/src/components/filters/FilterDrawer.tsx` - Drawer for filtering routes

2. **Firebase Data Fetching**:
   - `src/features/presentation/components/PresentationMapView/PresentationMapView.js` - Shows how map data is loaded and displayed
   - `src/features/map/context/RouteContext.js` - Contains the logic for loading routes from Firebase
   - `src/services/firebaseGpxAutoSaveService.js` - Shows how data is saved to and loaded from Firebase

3. **Web App Landing Page Implementation**:
   - `src/features/presentation/components/LandingPage/FirebaseLandingPage.js` - Main landing page component
   - `src/features/presentation/components/LandingPage/FirebaseRouteCard.jsx` - Route card component
   - `src/features/presentation/components/LandingPage/FirebaseLazyRouteCardGrid.jsx` - Grid of route cards
   - `src/features/presentation/components/LandingPage/useRouteFilters.jsx` - Hook for filtering routes

4. **Firebase Schema Reference**:
   - `docs/FIREBASE_SCHEMA_REFERENCE.md` - Comprehensive reference for the Firebase data schema

## Firebase Schema Overview

The Firebase implementation uses the following main collections:

1. `routes` - Stores route data in a hierarchical structure
2. `user_saved_routes` - Stores user-saved routes
3. `gpx_auto_saves` - Stores auto-saved GPX data
4. `user_route_index` - Stores an index of routes for each user
5. `type_index` - Maps route types to route IDs for faster filtering

Key data structures include:

- **Route Data**: Contains metadata, GeoJSON coordinates, elevation data, and unpaved sections
- **POIs (Points of Interest)**: Markers placed on the map
- **Lines**: Additional line overlays on the map
- **Photos**: Images associated with specific locations on the route

## Landing Page Design (Based on lutruwita-mobile)

The Swift app's landing page should follow the design and functionality of the existing lutruwita-mobile app, which features:

1. **Map-Centric Interface**:
   - A full-screen MapKit map as the primary interface
   - Route markers displayed on the map with clustering for better performance
   - Different marker styles based on route type (bikepacking, tourism, event, etc.)

2. **Filtering System**:
   - Map type selector at the top (All, Tourism, Bikepacking, Event)
   - Filter button that opens a drawer with additional filters:
     - Location (State and Region)
     - Distance ranges
     - Surface type (Road, Mixed, Unpaved)
     - Route type (Loop or Point-to-Point)
   - Active filter count badge on the filter button

3. **Route Interaction**:
   - Tapping a route marker shows a preview drawer from the bottom
   - Preview drawer shows basic route info and options to:
     - View full route details
     - Navigate to the route on the map
   - Route count indicator at the bottom that can be tapped to show a list of all visible routes

4. **Navigation Controls**:
   - User location button to center the map on the user's current location
   - Map style selector to switch between different map styles

## Implementation Checklist

### 1. Firebase Setup

- [x] Add Firebase iOS SDK to your Swift project
  ```swift
  // In your Swift Package Manager dependencies
  .package(url: "https://github.com/firebase/firebase-ios-sdk.git", .upToNextMajor(from: "10.0.0"))
  ```

- [x] Initialize Firebase in your app
  ```swift
  // In AppDelegate.swift or App.swift for SwiftUI
  import FirebaseCore
  
  class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
      FirebaseApp.configure()
      return true
    }
  }
  ```

- [x] Add Firebase configuration file (GoogleService-Info.plist) to your project
  ```
  // Place the GoogleService-Info.plist file in the main app directory:
  // mobile/CyaTrails/CyaTrails/GoogleService-Info.plist
  
  // In Xcode:
  // 1. Right-click on the "CyaTrails" group in the Project Navigator
  // 2. Select "Add Files to 'CyaTrails'..."
  // 3. Navigate to and select the GoogleService-Info.plist file
  // 4. Ensure "Copy items if needed" is checked
  // 5. Make sure your app target is selected
  // 6. Click "Add"
  ```

### 2. Create Swift Models

- [x] Create Route model
  ```swift
  struct Route: Identifiable, Codable {
      var id: String
      var routeId: String
      var name: String
      var color: String
      var statistics: RouteStatistics
      var geojson: GeoJSON?
      var unpavedSections: [UnpavedSection]?
      var metadata: RouteMetadata?
  }
  
  struct RouteStatistics: Codable {
      var totalDistance: Double
      var elevationGain: Double
      var elevationLoss: Double
      var maxElevation: Double
      var minElevation: Double
  }
  
  struct RouteMetadata: Codable {
      var country: String?
      var state: String?
      var lga: String?
      var isLoop: Bool?
  }
  
  struct GeoJSON: Codable {
      var type: String
      var features: [Feature]
  }
  
  struct Feature: Codable {
      var type: String
      var geometry: Geometry
      var properties: Properties?
  }
  
  struct Geometry: Codable {
      var type: String
      var coordinates: [[Double]]
  }
  
  struct Properties: Codable {
      var coordinateProperties: CoordinateProperties?
  }
  
  struct CoordinateProperties: Codable {
      var elevation: [Double]?
  }
  
  struct UnpavedSection: Codable {
      var startIndex: Int?
      var endIndex: Int?
      var surfaceType: String
      var coordinates: [[Double]]?
  }
  ```

- [x] Create POI model
  ```swift
  struct POI: Identifiable, Codable {
      var id: String
      var name: String
      var description: String?
      var coordinates: Coordinates
      var category: String?
      var icon: String?
      var type: String
      var googlePlaceId: String?
      var googlePlaceUrl: String?
  }
  
  struct Coordinates: Codable {
      var lng: Double
      var lat: Double
  }
  ```

- [x] Create Line model
  ```swift
  struct Line: Identifiable, Codable {
      var id: String
      var name: String
      var description: String?
      var coordinates: [Coordinates]
      var type: String
  }
  ```

- [x] Create Photo model
  ```swift
  struct Photo: Identifiable, Codable {
      var id: String
      var name: String
      var url: String
      var thumbnailUrl: String?
      var dateAdded: String
      var caption: String?
      var coordinates: Coordinates
  }
  ```

### 3. Implement Firebase Service

- [x] Create a FirebaseService class
  ```swift
  import FirebaseFirestore
  import FirebaseAuth
  
  class FirebaseService {
      static let shared = FirebaseService()
      private let db = Firestore.firestore()
      
      // MARK: - Route Loading
      
      func loadRoute(persistentId: String) async throws -> Route {
          // First try to load from optimized route data
          if let optimizedRoute = try? await getOptimizedRouteData(persistentId: persistentId) {
              return optimizedRoute
          }
          
          // Fall back to loading from user_saved_routes
          let routeDoc = try await db.collection("user_saved_routes").document(persistentId).getDocument()
          guard let routeData = routeDoc.data() else {
              throw NSError(domain: "FirebaseService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Route not found"])
          }
          
          // Load route segments
          let routesRef = db.collection("user_saved_routes").document(persistentId).collection("data").document("routes")
          let routesDoc = try await routesRef.getDocument()
          guard let routesData = routesDoc.data(), let routesArray = routesData["data"] as? [[String: Any]] else {
              throw NSError(domain: "FirebaseService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Route segments not found"])
          }
          
          // Process route segments
          var routeSegments: [Route] = []
          for segmentData in routesArray {
              guard let routeId = segmentData["routeId"] as? String else { continue }
              
              // Load coordinates for this segment
              let coordsRef = db.collection("user_saved_routes").document(persistentId).collection("routes").document(routeId).collection("data").document("coords")
              let coordsDoc = try await coordsRef.getDocument()
              guard let coordsData = coordsDoc.data(), let coordsArray = coordsData["data"] as? [[String: Any]] else { continue }
              
              // Convert coordinates to GeoJSON format
              let coordinates = coordsArray.map { coord -> [Double] in
                  let lng = coord["lng"] as? Double ?? 0
                  let lat = coord["lat"] as? Double ?? 0
                  let elevation = coord["elevation"] as? Double ?? 0
                  return [lng, lat, elevation]
              }
              
              // Load unpaved sections
              let unpavedRef = db.collection("user_saved_routes").document(persistentId).collection("routes").document(routeId).collection("data").document("unpaved")
              let unpavedDoc = try await unpavedRef.getDocument()
              var unpavedSections: [UnpavedSection] = []
              if let unpavedData = unpavedDoc.data(), let unpavedArray = unpavedData["data"] as? [[String: Any]] {
                  unpavedSections = unpavedArray.compactMap { section -> UnpavedSection? in
                      guard let surfaceType = section["surfaceType"] as? String else { return nil }
                      
                      var sectionCoordinates: [[Double]] = []
                      if let coords = section["coordinates"] as? [[String: Any]] {
                          sectionCoordinates = coords.map { coord -> [Double] in
                              let lng = coord["lng"] as? Double ?? 0
                              let lat = coord["lat"] as? Double ?? 0
                              return [lng, lat]
                          }
                      }
                      
                      return UnpavedSection(
                          startIndex: section["startIndex"] as? Int,
                          endIndex: section["endIndex"] as? Int,
                          surfaceType: surfaceType,
                          coordinates: sectionCoordinates
                      )
                  }
              }
              
              // Create GeoJSON structure
              let geojson = GeoJSON(
                  type: "FeatureCollection",
                  features: [
                      Feature(
                          type: "Feature",
                          geometry: Geometry(
                              type: "LineString",
                              coordinates: coordinates
                          ),
                          properties: Properties(
                              coordinateProperties: CoordinateProperties(
                                  elevation: coordinates.map { $0.count > 2 ? $0[2] : 0 }
                              )
                          )
                      )
                  ]
              )
              
              // Create route segment
              let segment = Route(
                  id: routeId,
                  routeId: routeId,
                  name: segmentData["name"] as? String ?? "Unnamed Route",
                  color: segmentData["color"] as? String ?? "#ff4d4d",
                  statistics: RouteStatistics(
                      totalDistance: (segmentData["statistics"] as? [String: Any])?["totalDistance"] as? Double ?? 0,
                      elevationGain: (segmentData["statistics"] as? [String: Any])?["elevationGain"] as? Double ?? 0,
                      elevationLoss: (segmentData["statistics"] as? [String: Any])?["elevationLoss"] as? Double ?? 0,
                      maxElevation: (segmentData["statistics"] as? [String: Any])?["maxElevation"] as? Double ?? 0,
                      minElevation: (segmentData["statistics"] as? [String: Any])?["minElevation"] as? Double ?? 0
                  ),
                  geojson: geojson,
                  unpavedSections: unpavedSections,
                  metadata: RouteMetadata(
                      country: "Australia",
                      state: (routeData["metadata"] as? [String: Any])?["state"] as? String,
                      lga: (routeData["metadata"] as? [String: Any])?["lga"] as? String,
                      isLoop: (routeData["metadata"] as? [String: Any])?["isLoop"] as? Bool
                  )
              )
              
              routeSegments.append(segment)
          }
          
          // Load POIs
          let poisRef = db.collection("user_saved_routes").document(persistentId).collection("data").document("pois")
          let poisDoc = try await poisRef.getDocument()
          var pois: [POI] = []
          if let poisData = poisDoc.data(), let poisDict = poisData["data"] as? [String: Any] {
              // Process draggable POIs
              if let draggablePOIs = poisDict["draggable"] as? [[String: Any]] {
                  for poiData in draggablePOIs {
                      guard let id = poiData["id"] as? String,
                            let name = poiData["name"] as? String,
                            let coordsData = poiData["coordinates"] as? [String: Any],
                            let lng = coordsData["lng"] as? Double,
                            let lat = coordsData["lat"] as? Double else { continue }
                      
                      let poi = POI(
                          id: id,
                          name: name,
                          description: poiData["description"] as? String,
                          coordinates: Coordinates(lng: lng, lat: lat),
                          category: poiData["category"] as? String,
                          icon: poiData["icon"] as? String,
                          type: "draggable",
                          googlePlaceId: poiData["googlePlaceId"] as? String,
                          googlePlaceUrl: poiData["googlePlaceUrl"] as? String
                      )
                      
                      pois.append(poi)
                  }
              }
              
              // Process place POIs
              if let placePOIs = poisDict["places"] as? [[String: Any]] {
                  for poiData in placePOIs {
                      guard let id = poiData["id"] as? String,
                            let name = poiData["name"] as? String,
                            let coordsData = poiData["coordinates"] as? [String: Any],
                            let lng = coordsData["lng"] as? Double,
                            let lat = coordsData["lat"] as? Double else { continue }
                      
                      let poi = POI(
                          id: id,
                          name: name,
                          description: nil,
                          coordinates: Coordinates(lng: lng, lat: lat),
                          category: poiData["category"] as? String,
                          icon: poiData["icon"] as? String,
                          type: "place",
                          googlePlaceId: poiData["placeId"] as? String,
                          googlePlaceUrl: nil
                      )
                      
                      pois.append(poi)
                  }
              }
          }
          
          // Load lines
          let linesRef = db.collection("user_saved_routes").document(persistentId).collection("data").document("lines")
          let linesDoc = try await linesRef.getDocument()
          var lines: [Line] = []
          if let linesData = linesDoc.data(), let linesArray = linesData["data"] as? [[String: Any]] {
              for lineData in linesArray {
                  guard let id = lineData["id"] as? String,
                        let name = lineData["name"] as? String,
                        let coordsArray = lineData["coordinates"] as? [[String: Any]] else { continue }
                  
                  let coordinates = coordsArray.compactMap { coord -> Coordinates? in
                      guard let lng = coord["lng"] as? Double,
                            let lat = coord["lat"] as? Double else { return nil }
                      return Coordinates(lng: lng, lat: lat)
                  }
                  
                  let line = Line(
                      id: id,
                      name: name,
                      description: lineData["description"] as? String,
                      coordinates: coordinates,
                      type: lineData["type"] as? String ?? "line"
                  )
                  
                  lines.append(line)
              }
          }
          
          // Load photos
          let photosRef = db.collection("user_saved_routes").document(persistentId).collection("data").document("photos")
          let photosDoc = try await photosRef.getDocument()
          var photos: [Photo] = []
          if let photosData = photosDoc.data(), let photosArray = photosData["data"] as? [[String: Any]] {
              for photoData in photosArray {
                  guard let name = photoData["name"] as? String,
                        let url = photoData["url"] as? String,
                        let dateAdded = photoData["dateAdded"] as? String,
                        let coordsData = photoData["coordinates"] as? [String: Any],
                        let lat = coordsData["lat"] as? Double,
                        let lng = coordsData["lng"] as? Double else { continue }
                  
                  let photo = Photo(
                      id: photoData["id"] as? String ?? UUID().uuidString,
                      name: name,
                      url: url,
                      thumbnailUrl: photoData["thumbnailUrl"] as? String,
                      dateAdded: dateAdded,
                      caption: photoData["caption"] as? String,
                      coordinates: Coordinates(lng: lng, lat: lat)
                  )
                  
                  photos.append(photo)
              }
          }
          
          // Create the main route object with all data
          let mainRoute = Route(
              id: persistentId,
              routeId: persistentId,
              name: routeData["name"] as? String ?? "Unnamed Route",
              color: "#ff4d4d", // Default color
              statistics: RouteStatistics(
                  totalDistance: (routeData["statistics"] as? [String: Any])?["totalDistance"] as? Double ?? 0,
                  elevationGain: (routeData["statistics"] as? [String: Any])?["totalAscent"] as? Double ?? 0,
                  elevationLoss: 0, // Not typically stored at top level
                  maxElevation: 0, // Not typically stored at top level
                  minElevation: 0  // Not typically stored at top level
              ),
              geojson: routeSegments.first?.geojson,
              unpavedSections: routeSegments.first?.unpavedSections,
              metadata: RouteMetadata(
                  country: (routeData["metadata"] as? [String: Any])?["country"] as? String ?? "Australia",
                  state: (routeData["metadata"] as? [String: Any])?["state"] as? String,
                  lga: (routeData["metadata"] as? [String: Any])?["lga"] as? String,
                  isLoop: (routeData["metadata"] as? [String: Any])?["isLoop"] as? Bool
              )
          )
          
          return mainRoute
      }
      
      // MARK: - Optimized Route Data
      
      func getOptimizedRouteData(persistentId: String) async throws -> Route? {
          // Check if optimized data exists in Firebase
          let optimizedRef = db.collection("optimized_routes").document(persistentId)
          let optimizedDoc = try await optimizedRef.getDocument()
          
          guard let optimizedData = optimizedDoc.data() else {
              return nil
          }
          
          // Process optimized data
          // This would be a simplified version of the route with pre-processed data
          // The exact structure would depend on how you've optimized the data
          
          return nil // Implement based on your optimized data structure
      }
      
      // MARK: - Route Listing
      
      func listRoutes(filters: [String: Any]? = nil) async throws -> [RouteListItem] {
          var query: Query = db.collection("user_saved_routes")
          
          // Apply filters if provided
          if let filters = filters {
              if let isPublic = filters["isPublic"] as? Bool {
                  query = query.whereField("isPublic", isEqualTo: isPublic)
              }
              
              if let type = filters["type"] as? String {
                  query = query.whereField("type", isEqualTo: type)
              }
              
              if let state = filters["state"] as? String {
                  query = query.whereField("metadata.state", isEqualTo: state)
              }
              
              if let minDistance = filters["minDistance"] as? Double {
                  query = query.whereField("statistics.totalDistance", isGreaterThanOrEqualTo: minDistance)
              }
              
              if let maxDistance = filters["maxDistance"] as? Double {
                  query = query.whereField("statistics.totalDistance", isLessThanOrEqualTo: maxDistance)
              }
              
              if let isLoop = filters["isLoop"] as? Bool {
                  query = query.whereField("metadata.isLoop", isEqualTo: isLoop)
              }
          }
          
          // Order by updated timestamp
          query = query.order(by: "updatedAt", descending: true)
          
          // Execute query
          let snapshot = try await query.getDocuments()
          
          // Process results
          var routes: [RouteListItem] = []
          for document in snapshot.documents {
              let data = document.data()
              
              let route = RouteListItem(
                  id: document.documentID,
                  name: data["name"] as? String ?? "Unnamed Route",
                  thumbnailUrl: data["thumbnailUrl"] as? String,
                  statistics: RouteStatistics(
                      totalDistance: (data["statistics"] as? [String: Any])?["totalDistance"] as? Double ?? 0,
                      elevationGain: (data["statistics"] as? [String: Any])?["totalAscent"] as? Double ?? 0,
                      elevationLoss: 0,
                      maxElevation: 0,
                      minElevation: 0
                  ),
                  type: data["type"] as? String ?? "single",
                  isPublic: data["isPublic"] as? Bool ?? false,
                  metadata: RouteMetadata(
                      country: (data["metadata"] as? [String: Any])?["country"] as? String ?? "Australia",
                      state: (data["metadata"] as? [String: Any])?["state"] as? String,
                      lga: (data["metadata"] as? [String: Any])?["lga"] as? String,
                      isLoop: (data["metadata"] as? [String: Any])?["isLoop"] as? Bool
                  )
              )
              
              routes.append(route)
          }
          
          return routes
      }
  }
  
  // Simple model for route listing
  struct RouteListItem: Identifiable, Codable {
      var id: String
      var name: String
      var thumbnailUrl: String?
      var statistics: RouteStatistics
      var type: String
      var isPublic: Bool
      var metadata: RouteMetadata?
  }
  ```

### 4. Create View Models

- [x] Create RouteListViewModel
  ```swift
  import Foundation
  import Combine
  
  class RouteListViewModel: ObservableObject {
      @Published var routes: [RouteListItem] = []
      @Published var isLoading = false
      @Published var errorMessage: String?
      
      // Filter properties
      @Published var selectedType: String?
      @Published var selectedState: String?
      @Published var isLoopOnly = false
      @Published var distanceRange: ClosedRange<Double> = 0...200
      
      private let firebaseService = FirebaseService.shared
      private var cancellables = Set<AnyCancellable>()
      
      init() {
          // Set up filter publishers
          Publishers.CombineLatest4($selectedType, $selectedState, $isLoopOnly, $distanceRange)
              .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
              .sink { [weak self] type, state, isLoop, distanceRange in
                  self?.loadRoutes()
              }
              .store(in: &cancellables)
      }
      
      func loadRoutes() {
          isLoading = true
          errorMessage = nil
          
          // Build filters
          var filters: [String: Any] = ["isPublic": true]
          
          if let type = selectedType {
              filters["type"] = type
          }
          
          if let state = selectedState {
              filters["state"] = state
          }
          
          if isLoopOnly {
              filters["isLoop"] = true
          }
          
          filters["minDistance"] = distanceRange.lowerBound
          filters["maxDistance"] = distanceRange.upperBound
          
          // Fetch routes
          Task {
              do {
                  let fetchedRoutes = try await firebaseService.listRoutes(filters: filters)
                  
                  DispatchQueue.main.async {
                      self.routes = fetchedRoutes
                      self.isLoading = false
                  }
              } catch {
                  DispatchQueue.main.async {
                      self.errorMessage = error.localizedDescription
                      self.isLoading = false
                  }
              }
          }
      }
  }
  ```

- [x] Create RouteDetailViewModel
  ```swift
  import Foundation
  import Combine
  import MapKit
  
  class RouteDetailViewModel: ObservableObject {
      @Published var route: Route?
      @Published var pois: [POI] = []
      @Published var lines: [Line] = []
      @Published var photos: [Photo] = []
      @Published var isLoading = false
      @Published var errorMessage: String?
      @Published var mapRegion = MKCoordinateRegion()
      
      private let firebaseService = FirebaseService.shared
      
      func loadRoute(persistentId: String) {
          isLoading = true
          errorMessage = nil
          
          Task {
              do {
                  let loadedRoute = try await firebaseService.loadRoute(persistentId: persistentId)
                  
                  DispatchQueue.main.async {
                      self.route = loadedRoute
                      
                      // Set map region based on route bounds
                      if let coordinates = loadedRoute.geojson?.features.first?.geometry.coordinates, !coordinates.isEmpty {
                          let bounds = self.calculateBounds(from: coordinates)
                          self.mapRegion = MKCoordinateRegion(
                              center: CLLocationCoordinate2D(
                                  latitude: (bounds.minLat + bounds.maxLat) / 2,
                                  longitude: (bounds.minLng + bounds.maxLng) / 2
                              ),
                              span: MKCoordinateSpan(
                                  latitudeDelta: (bounds.maxLat - bounds.minLat) * 1.5,
                                  longitudeDelta: (bounds.maxLng - bounds.minLng) * 1.5
                              )
                          )
                      }
                      
                      self.isLoading = false
                  }
              } catch {
                  DispatchQueue.main.async {
                      self.errorMessage = error.localizedDescription
                      self.isLoading = false
                  }
              }
          }
      }
      
      private func calculateBounds(from coordinates: [[Double]]) -> (minLat: Double, maxLat: Double, minLng: Double, maxLng: Double) {
          var minLat = 90.0
          var maxLat = -90.0
          var minLng = 180.0
          var maxLng = -180.0
          
          for coordinate in coordinates {
              if coordinate.count >= 2 {
                  let lng = coordinate[0]
                  let lat = coordinate[1]
                  
                  minLat = min(minLat, lat)
                  maxLat = max(maxLat, lat)
                  minLng = min(minLng, lng)
                  maxLng = max(maxLng, lng)
              }
          }
          
          return (minLat, maxLat, minLng, maxLng)
      }
  }
  ```

### 5. Create UI Views

- [x] Create HomeView with MapView
  ```swift
  import SwiftUI
  import MapboxMaps
  import Combine

  struct HomeView: View {
      // View model for route data
      @StateObject private var viewModel = RouteListViewModel()
      
      // State for tracking map camera position
      @State private var cameraPosition = CameraOptions(
          center: CLLocationCoordinate2D(latitude: -41.4419, longitude: 146.8087), // Tasmania
          zoom: 6.0
      )
      
      // State for selected country filter
      @State private var selectedCountry: String? = nil
      
      // Reference to the MapView
      @State private var mapView: MapView?
      
      // State for showing filter sheet
      @State private var showingFilterSheet = false
      
      var body: some View {
          ZStack {
              // Mapbox MapView using UIViewRepresentable
              MapViewRepresentable(
                  cameraPosition: $cameraPosition,
                  mapView: $mapView,
                  routeMarkers: viewModel.getRouteMarkers()
              )
              .edgesIgnoringSafeArea([.top, .horizontal])
              
              // Overlay UI elements
              VStack {
                  // Top controls
                  HStack {
                      // Filter button
                      Button(action: {
                          showingFilterSheet = true
                      }) {
                          HStack {
                              Image(systemName: "line.horizontal.3.decrease.circle")
                              Text("Filter")
                          }
                          .padding(8)
                          .background(Color.white.opacity(0.9))
                          .cornerRadius(8)
                      }
                      .padding(.leading)
                      
                      Spacer()
                      
                      // Map type and country selector
                      VStack(spacing: 8) {
                          Picker("Map Type", selection: $viewModel.selectedType) {
                              Text("All").tag(nil as String?)
                              Text("Tourism").tag("tourism")
                              Text("Bikepacking").tag("bikepacking")
                              Text("Event").tag("event")
                          }
                          .pickerStyle(SegmentedPickerStyle())
                          .padding(8)
                          .background(Color.white.opacity(0.9))
                          .cornerRadius(8)
                          
                          // Country selector
                          Picker("Country", selection: $selectedCountry) {
                              Text("All").tag(nil as String?)
                              Text("Australia").tag("Australia")
                              Text("New Zealand").tag("New Zealand")
                          }
                          .pickerStyle(SegmentedPickerStyle())
                          .padding(8)
                          .background(Color.white.opacity(0.9))
                          .cornerRadius(8)
                          .onChange(of: selectedCountry) { newValue in
                              viewModel.selectedCountry = newValue
                          }
                      }
                      .padding(.trailing)
                  }
                  .padding(.top, 50)
                  
                  Spacer()
                  
                  // Route count indicator
                  Button(action: {
                      // Show route list drawer (to be implemented)
                  }) {
                      Text("\(viewModel.routeCount) trails")
                          .font(.headline)
                          .padding()
                          .background(Color.white.opacity(0.9))
                          .cornerRadius(10)
                          .padding(.bottom, 20)
                  }
              }
              .padding(.bottom, 50) // Add extra padding for tab bar
              
              // Loading indicator
              if viewModel.isLoading {
                  ProgressView()
                      .scaleEffect(1.5)
                      .frame(width: 100, height: 100)
                      .background(Color.white.opacity(0.8))
                      .cornerRadius(16)
              }
          }
          .navigationTitle("Home")
          .navigationBarHidden(true)
          .onAppear {
              // Load routes when view appears
              viewModel.loadRoutes()
              
              // Set initial camera position based on selected country
              if viewModel.selectedCountry == "New Zealand" {
                  cameraPosition = CameraOptions(
                      center: CLLocationCoordinate2D(latitude: -41.2865, longitude: 174.7762), // Wellington, NZ
                      zoom: 5.5
                  )
              } else {
                  cameraPosition = CameraOptions(
                      center: CLLocationCoordinate2D(latitude: -41.4419, longitude: 146.8087), // Tasmania
                      zoom: 6.0
                  )
              }
          }
          .sheet(isPresented: $showingFilterSheet) {
              FilterView(viewModel: viewModel)
          }
      }
  }
  ```

- [x] Create MapViewRepresentable for Mapbox integration
  ```swift
  // UIViewRepresentable for Mapbox MapView
  struct MapViewRepresentable: UIViewRepresentable {
      @Binding var cameraPosition: CameraOptions
      @Binding var mapView: MapView?
      var routeMarkers: [RouteMarker] = []
      
      func makeUIView(context: Context) -> MapView {
          // Create a MapView with default options
          let mapInitOptions = MapInitOptions(
              styleURI: StyleURI.outdoors
          )
          
          let mapView = MapView(frame: .zero, mapInitOptions: mapInitOptions)
          
          // Set the camera position
          mapView.mapboxMap.setCamera(to: cameraPosition)
          
          // Add location puck (user's location)
          let locationOptions = LocationOptions()
          mapView.location.options = locationOptions
          
          // Store reference to the map view
          self.mapView = mapView
          
          return mapView
      }
      
      func updateUIView(_ mapView: MapView, context: Context) {
          // Add route markers and polylines to the map
          if !routeMarkers.isEmpty {
              // Create annotation managers
              let circleAnnotationManager = mapView.annotations.makeCircleAnnotationManager()
              let polylineManager = mapView.annotations.makePolylineAnnotationManager()
              
              // Clear existing annotations
              circleAnnotationManager.annotations = []
              polylineManager.annotations = []
              
              // Create annotations for each route marker
              var circleAnnotations: [CircleAnnotation] = []
              var polylineAnnotations: [PolylineAnnotation] = []
              
              for marker in routeMarkers {
                  // Create a circle annotation for the marker
                  var circleAnnotation = CircleAnnotation(centerCoordinate: marker.coordinate)
                  
                  // Set circle properties
                  circleAnnotation.circleRadius = 8.0
                  circleAnnotation.circleStrokeWidth = 2.0
                  circleAnnotation.circleStrokeColor = StyleColor(.white)
                  
                  // Set the marker color based on route type
                  let markerColor: UIColor
                  switch marker.type {
                  case "tourism":
                      markerColor = .systemBlue
                  case "bikepacking":
                      markerColor = .systemGreen
                  case "event":
                      markerColor = .systemOrange
                  default:
                      markerColor = .systemRed
                  }
                  
                  circleAnnotation.circleColor = StyleColor(markerColor)
                  
                  // Add custom data for tap handling
                  circleAnnotation.customData = ["routeId": JSONValue.string(marker.id), "name": JSONValue.string(marker.name)]
                  
                  // Add to the collection
                  circleAnnotations.append(circleAnnotation)
                  
                  // Add route polylines if available
                  if let routeCoordinates = marker.routeCoordinates, !routeCoordinates.isEmpty {
                      // Create a polyline annotation for each segment
                      for (index, coordinates) in routeCoordinates.enumerated() {
                          guard coordinates.count >= 2 else { continue }
                          
                          // Create a polyline annotation
                          var polylineAnnotation = PolylineAnnotation(lineCoordinates: coordinates)
                          polylineAnnotation.lineWidth = 3.0
                          polylineAnnotation.lineColor = StyleColor(markerColor.withAlphaComponent(0.7))
                          
                          // Add custom data for tap handling
                          polylineAnnotation.customData = [
                              "routeId": JSONValue.string(marker.id),
                              "name": JSONValue.string(marker.name),
                              "segmentIndex": JSONValue.number(Double(index))
                          ]
                          
                          polylineAnnotations.append(polylineAnnotation)
                      }
                  }
              }
              
              // Add all annotations to the map
              circleAnnotationManager.annotations = circleAnnotations
              polylineManager.annotations = polylineAnnotations
              
              // Set up tap handler for annotations
              let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(context.coordinator.handleMapTap(_:)))
              mapView.addGestureRecognizer(tapGesture)
              
              // Store annotations in coordinator for tap handling
              context.coordinator.circleAnnotations = circleAnnotations
              context.coordinator.mapView = mapView
              
              // Adjust camera to fit all markers
              if routeMarkers.count > 0 {
                  let coordinates = routeMarkers.map { $0.coordinate }
                  adjustCameraToFitCoordinates(mapView: mapView, coordinates: coordinates)
              }
          }
      }
      
      // Helper function to adjust camera to fit all coordinates
      private func adjustCameraToFitCoordinates(mapView: MapView, coordinates: [CLLocationCoordinate2D]) {
          guard !coordinates.isEmpty else { return }
          
          // Calculate bounds
          var minLat = coordinates[0].latitude
          var maxLat = coordinates[0].latitude
          var minLng = coordinates[0].longitude
          var maxLng = coordinates[0].longitude
          
          for coordinate in coordinates {
              minLat = min(minLat, coordinate.latitude)
              maxLat = max(maxLat, coordinate.latitude)
              minLng = min(minLng, coordinate.longitude)
              maxLng = max(maxLng, coordinate.longitude)
          }
          
          // Add padding
          let latPadding = (maxLat - minLat) * 0.2
          let lngPadding = (maxLng - minLng) * 0.2
          
          // Create camera options
          let centerLat = (minLat + maxLat) / 2
          let centerLng = (minLng + maxLng) / 2
          
          // Set zoom level to fit the coordinates
          let latDelta = maxLat - minLat
          let lngDelta = maxLng - minLng
          let zoomLevel = min(
              log2(360 / (lngDelta * 1.5)) - 1,
              log2(180 / (latDelta * 1.5)) - 1
          )
          
          let camera = CameraOptions(
              center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng),
              zoom: zoomLevel,
              bearing: 0,
              pitch: 0
          )
          
          // Set camera with animation
          mapView.mapboxMap.setCamera(to: camera)
      }
      
      func makeCoordinator() -> Coordinator {
          Coordinator()
      }
      
      class Coordinator: NSObject {
          var circleAnnotations: [CircleAnnotation] = []
          var mapView: MapView?
          
          @objc func handleMapTap(_ gesture: UITapGestureRecognizer) {
              guard let mapView = mapView else { return }
              
              let point = gesture.location(in: mapView)
              let coordinate = mapView.mapboxMap.coordinate(for: point)
              
              // Find the closest annotation
              let hitDistance: CGFloat = 20.0 // Tap radius in points
              for annotation in circleAnnotations {
                  let annotationPoint = mapView.mapboxMap.point(for: annotation.point.coordinates)
                  let distance = sqrt(pow(point.x - annotationPoint.x, 2) + pow(point.y - annotationPoint.y, 2))
                  
                  if distance <= hitDistance {
                      if let routeIdValue = annotation.customData["routeId"],
                         case .string(let routeId) = routeIdValue {
                          print("Tapped route: \(routeId)")
                          // Here you would show a route preview or navigate to route details
                          break
                      }
                  }
              }
          }
      }
  }
  ```

- [x] Create RouteListView
  ```swift
  import SwiftUI
  
  struct RouteListView: View {
      @StateObject private var viewModel = RouteListViewModel()
      
      var body: some View {
          NavigationView {
              VStack {
                  // Filter controls
                  ScrollView(.horizontal, showsIndicators: false) {
                      HStack(spacing: 10) {
                          FilterButton(title: "All", isSelected: viewModel.selectedType == nil) {
                              viewModel.selectedType = nil
                          }
                          
                          FilterButton(title: "Tourism", isSelected: viewModel.selectedType == "tourism") {
                              viewModel.selectedType = "tourism"
                          }
                          
                          FilterButton(title: "Event", isSelected: viewModel.selectedType == "event") {
                              viewModel.selectedType = "event"
                          }
                          
                          FilterButton(title: "Bikepacking", isSelected: viewModel.selectedType == "bikepacking") {
                              viewModel.selectedType = "bikepacking"
                          }
                          
                          FilterButton(title: "Loop Only", isSelected: viewModel.isLoopOnly) {
                              viewModel.isLoopOnly.toggle()
                          }
                      }
                      .padding(.horizontal)
                  }
                  .padding(.vertical, 8)
                  
                  // Route list
                  if viewModel.isLoading {
                      ProgressView()
                          .frame(maxWidth: .infinity, maxHeight: .infinity)
                  } else if let error = viewModel.errorMessage {
                      Text("Error: \(error)")
                          .foregroundColor(.red)
                          .padding()
                  } else if viewModel.routes.isEmpty {
                      Text("No routes found")
                          .foregroundColor(.secondary)
                          .frame(maxWidth: .infinity, maxHeight: .infinity)
                  } else {
                      List {
                          ForEach(viewModel.routes) { route in
                              NavigationLink(destination: RouteDetailView(routeId: route.id)) {
                                  RouteListItemView(route: route)
                              }
                          }
                      }
                      .listStyle(PlainListStyle())
                  }
              }
              .navigationTitle("Routes")
              .onAppear {
                  viewModel.loadRoutes()
              }
          }
      }
  }
  
  struct FilterButton: View {
      let title: String
      let isSelected: Bool
      let action: () -> Void
      
      var body: some View {
          Button(action: action) {
              Text(title)
                  .padding(.horizontal, 16)
                  .padding(.vertical, 8)
                  .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                  .foregroundColor(isSelected ? .white : .primary)
                  .cornerRadius(16)
          }
      }
  }
  
  struct RouteListItemView: View {
      let route: RouteListItem
      
      var body: some View {
          HStack(spacing: 12) {
              // Thumbnail
              if let thumbnailUrl = route.thumbnailUrl {
                  AsyncImage(url: URL(string: thumbnailUrl)) { image in
                      image
                          .resizable()
                          .aspectRatio(contentMode: .fill)
                  } placeholder: {
                      Color.gray.opacity(0.3)
                  }
                  .frame(width: 80, height: 80)
                  .cornerRadius(8)
              } else {
                  Color.gray.opacity(0.3)
                      .frame(width: 80, height: 80)
                      .cornerRadius(8)
              }
              
              // Route info
              VStack(alignment: .leading, spacing: 4) {
                  Text(route.name)
                      .font(.headline)
                  
                  HStack {
                      Text("\(Int(route.statistics.totalDistance)) km")
                          .font(.subheadline)
                          .foregroundColor(.secondary)
                      
                      Text("•")
                          .foregroundColor(.secondary)
                      
                      Text("\(Int(route.statistics.elevationGain)) m gain")
                          .font(.subheadline)
                          .foregroundColor(.secondary)
                  }
                  
                  if let state = route.metadata?.state, !state.isEmpty {
                      Text(state)
                          .font(.caption)
                          .foregroundColor(.secondary)
                  }
              }
              
              Spacer()
              
              // Route type badge
              Text(route.type.capitalized)
                  .font(.caption)
                  .padding(.horizontal, 8)
                  .padding(.vertical, 4)
                  .background(Color.blue.opacity(0.2))
                  .foregroundColor(.blue)
                  .cornerRadius(12)
          }
          .padding(.vertical, 8)
      }
  }
  ```

- [ ] Create RouteDetailView
  ```swift
  import SwiftUI
  import MapKit
  
  struct RouteDetailView: View {
      let routeId: String
      @StateObject private var viewModel = RouteDetailViewModel()
      
      var body: some View {
          ZStack {
              // Map view
              MapView(
                  route: viewModel.route,
                  pois: viewModel.pois,
                  lines: viewModel.lines,
                  photos: viewModel.photos,
                  region: $viewModel.mapRegion
              )
              .edgesIgnoringSafeArea(.all)
              
              // Loading indicator
              if viewModel.isLoading {
                  ProgressView()
                      .scaleEffect(1.5)
                      .frame(width: 100, height: 100)
                      .background(Color.white.opacity(0.8))
                      .cornerRadius(16)
              }
              
              // Error message
              if let error = viewModel.errorMessage {
                  Text("Error: \(error)")
                      .foregroundColor(.white)
                      .padding()
                      .background(Color.red.opacity(0.8))
                      .cornerRadius(8)
              }
              
              // Route info panel
              VStack {
                  Spacer()
                  
                  if let route = viewModel.route {
                      RouteInfoPanel(route: route)
                          .transition(.move(edge: .bottom))
                  }
              }
          }
          .navigationTitle(viewModel.route?.name ?? "Route Details")
          .navigationBarTitleDisplayMode(.inline)
          .onAppear {
              viewModel.loadRoute(persistentId: routeId)
          }
      }
  }
  
  struct RouteInfoPanel: View {
      let route: Route
      
      var body: some View {
          VStack(alignment: .leading, spacing: 12) {
              Text(route.name)
                  .font(.title2)
                  .fontWeight(.bold)
              
              HStack(spacing: 16) {
                  StatItem(
                      value: String(format: "%.1f", route.statistics.totalDistance),
                      unit: "km",
                      label: "Distance"
                  )
                  
                  StatItem(
                      value: String(format: "%d", Int(route.statistics.elevationGain)),
                      unit: "m",
                      label: "Elevation Gain"
                  )
                  
                  if let isLoop = route.metadata?.isLoop {
                      Text(isLoop ? "Loop" : "Point to Point")
                          .font(.subheadline)
                          .foregroundColor(.secondary)
                  }
              }
              
              if let state = route.metadata?.state, !state.isEmpty {
                  Text("Location: \(state)")
                      .font(.subheadline)
                      .foregroundColor(.secondary)
              }
          }
          .padding()
          .background(Color.white)
          .cornerRadius(16)
          .shadow(radius: 4)
          .padding()
      }
  }
  
  struct StatItem: View {
      let value: String
      let unit: String
      let label: String
      
      var body: some View {
          VStack(alignment: .leading, spacing: 4) {
              HStack(alignment: .firstTextBaseline, spacing: 2) {
                  Text(value)
                      .font(.headline)
                  
                  Text(unit)
                      .font(.caption)
                      .foregroundColor(.secondary)
              }
              
              Text(label)
                  .font(.caption)
                  .foregroundColor(.secondary)
          }
      }
  }
  
  struct MapView: UIViewRepresentable {
      let route: Route?
      let pois: [POI]
      let lines: [Line]
      let photos: [Photo]
      @Binding var region: MKCoordinateRegion
      
      func makeUIView(context: Context) -> MKMapView {
          let mapView = MKMapView()
          mapView.delegate = context.coordinator
          mapView.showsUserLocation = true
          mapView.mapType = .standard
          
          return mapView
      }
      
      func updateUIView(_ mapView: MKMapView, context: Context) {
          // Update region
          mapView.setRegion(region, animated: true)
          
          // Clear existing overlays and annotations
          mapView.removeOverlays(mapView.overlays)
          mapView.removeAnnotations(mapView.annotations)
          
          // Add route polyline
          if let route = route, let coordinates = route.geojson?.features.first?.geometry.coordinates {
              let routeCoordinates = coordinates.compactMap { coord -> CLLocationCoordinate2D? in
                  guard coord.count >= 2 else { return nil }
                  return CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
              }
              
              if !routeCoordinates.isEmpty {
                  let polyline = MKPolyline(coordinates: routeCoordinates, count: routeCoordinates.count)
                  mapView.addOverlay(polyline)
                  
                  // Add unpaved sections
                  if let unpavedSections = route.unpavedSections {
                      for section in unpavedSections {
                          if let sectionCoordinates = section.coordinates {
                              let unpavedCoordinates = sectionCoordinates.compactMap { coord -> CLLocationCoordinate2D? in
                                  guard coord.count >= 2 else { return nil }
                                  return CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
                              }
                              
                              if !unpavedCoordinates.isEmpty {
                                  let unpavedPolyline = MKPolyline(coordinates: unpavedCoordinates, count: unpavedCoordinates.count)
                                  mapView.addOverlay(unpavedPolyline)
                              }
                          }
                      }
                  }
              }
          }
          
          // Add POIs
          for poi in pois {
              let annotation = MKPointAnnotation()
              annotation.coordinate = CLLocationCoordinate2D(latitude: poi.coordinates.lat, longitude: poi.coordinates.lng)
              annotation.title = poi.name
              annotation.subtitle = poi.description
              mapView.addAnnotation(annotation)
          }
          
          // Add photos
          for photo in photos {
              let annotation = MKPointAnnotation()
              annotation.coordinate = CLLocationCoordinate2D(latitude: photo.coordinates.lat, longitude: photo.coordinates.lng)
              annotation.title = photo.name
              annotation.subtitle = photo.caption
              mapView.addAnnotation(annotation)
          }
          
          // Add lines
          for line in lines {
              let lineCoordinates = line.coordinates.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) }
              let polyline = MKPolyline(coordinates: lineCoordinates, count: lineCoordinates.count)
              mapView.addOverlay(polyline)
          }
      }
      
      func makeCoordinator() -> Coordinator {
          Coordinator(self)
      }
      
      class Coordinator: NSObject, MKMapViewDelegate {
          var parent: MapView
          
          init(_ parent: MapView) {
              self.parent = parent
          }
          
          func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
              if let polyline = overlay as? MKPolyline {
                  let renderer = MKPolylineRenderer(polyline: polyline)
                  
                  // Check if this is an unpaved section
                  if parent.route?.unpavedSections?.contains(where: { section in
                      guard let sectionCoordinates = section.coordinates else { return false }
                      let sectionPolyline = MKPolyline(coordinates: sectionCoordinates.compactMap {
                          CLLocationCoordinate2D(latitude: $0[1], longitude: $0[0])
                      }, count: sectionCoordinates.count)
                      return sectionPolyline == polyline
                  }) ?? false {
                      // Unpaved section styling
                      renderer.strokeColor = UIColor.orange
                      renderer.lineWidth = 4
                      renderer.lineDashPattern = [4, 4] // Dashed line for unpaved
                  } else {
                      // Main route styling
                      renderer.strokeColor = UIColor(hex: parent.route?.color ?? "#ff4d4d")
                      renderer.lineWidth = 4
                  }
                  
                  return renderer
              }
              
              return MKOverlayRenderer(overlay: overlay)
          }
      }
  }
  
  // Helper extension to create UIColor from hex string
  extension UIColor {
      convenience init(hex: String) {
          var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
          hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
          
          var rgb: UInt64 = 0
          
          Scanner(string: hexSanitized).scanHexInt64(&rgb)
          
          let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
          let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
          let blue = CGFloat(rgb & 0x0000FF) / 255.0
          
          self.init(red: red, green: green, blue: blue, alpha: 1.0)
      }
  }
  ```

### 6. Implementation Steps

1. **Set up Firebase in your Swift project**
   - Add Firebase SDK via Swift Package Manager
   - Add GoogleService-Info.plist to your project
   - Initialize Firebase in AppDelegate or App

2. **Create Swift models**
   - Route model
   - POI model
   - Line model
   - Photo model
   - Enhanced RouteListItem model with route coordinates

3. **Implement Firebase service**
   - Create FirebaseService class
   - Implement route loading functionality
   - Implement route listing with filters
   - Add route coordinate fetching for map display

4. **Create view models**
   - RouteListViewModel for the landing page
   - RouteDetailViewModel for route details
   - Add route marker generation with polyline support

5. **Create UI views**
   - HomeView with MapView integration
   - FilterView for filtering routes
   - MapViewRepresentable for displaying routes on the map
   - RouteListView for browsing routes
   - RouteDetailView for viewing route details

6. **Test and debug**
   - Test route listing
   - Test route loading
   - Test map display with markers and polylines
   - Debug any Firebase connectivity issues
   - Fix type inference issues in Swift code

7. **Optimize performance**
   - Implement caching for route data
   - Optimize map rendering for large routes
   - Add loading indicators for better user experience
   - Add debug logging for troubleshooting

### 7. Implemented Features

- [x] Firebase integration with Swift
- [x] Route data fetching and filtering
- [x] Map display with Mapbox
- [x] Route markers with type-based styling
- [x] Route polylines showing the actual route paths
- [x] Country filtering (Australia/New Zealand)
- [x] Type filtering (All, Tourism, Bikepacking, Event)
- [x] Camera positioning to show all visible routes
- [x] Tap handling for route markers

## Conclusion

This implementation guide provides a comprehensive approach to integrating Firebase with your Swift app for route data fetching. By following the steps outlined in this document, you can create a robust and performant app that displays routes, POIs, and photos on a map.

The implementation is based on the existing web app's architecture, with adaptations for Swift and iOS. The Firebase schema is used as a reference for creating the Swift models and implementing the data fetching logic.

For any questions or issues, refer to the reference files listed at the beginning of this document.
