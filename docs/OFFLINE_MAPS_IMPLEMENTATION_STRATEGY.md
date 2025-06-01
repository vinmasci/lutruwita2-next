# CyaTrails Offline Maps Implementation Strategy

## Executive Summary

Implementation of production-ready offline maps functionality using cache-first architecture, modeled after industry leaders like RideWithGPS. This strategy prioritizes user experience, performance, and data efficiency while leveraging existing Firebase infrastructure.

---

## Architecture Overview

### Cache-First Philosophy 🚀
- **Primary**: Load from offline cache (instant, 0.01s)
- **Fallback**: Load from Firebase when cache unavailable (1-3s)
- **Background**: Smart sync to keep cache fresh
- **Result**: Best performance online AND offline

### Data Sources Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   MapBox API    │    │   Firebase DB   │
│  (Map Tiles)    │    │  (Route Data)   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
    ┌─────────────────────────────────┐
    │      Local Storage Cache        │
    │  tiles/ + route_data.json      │
    └─────────┬───────────────────────┘
              │
              ▼
    ┌─────────────────────────────────┐
    │     Cache-First Loader          │
    │   (Instant route access)        │
    └─────────────────────────────────┘
```

---

## Phase 1: Core Infrastructure (Week 1-2)

### 1.1 Offline Route Manager Service

```swift
class OfflineRouteManager: ObservableObject {
    static let shared = OfflineRouteManager()
    
    // Core functionality
    func isRouteDownloaded(_ routeId: String) -> Bool
    func downloadRoute(_ routeId: String, options: DownloadOptions) async throws
    func loadOfflineRoute(_ routeId: String) -> Route?
    func deleteOfflineRoute(_ routeId: String) async throws
    
    // Smart caching
    func getRouteWithCache(_ routeId: String) async throws -> Route
    func backgroundSyncIfStale(_ routeId: String) async
    
    // Storage management
    func getTotalStorageUsed() -> Int64
    func cleanup() async
}
```

### 1.2 Local Storage Architecture

```
Documents/OfflineRoutes/
├── index.json                     // Master index
├── {routeId}/
│   ├── metadata.json             // Download info, timestamps
│   ├── route_data.json           // Complete Route object from Firebase
│   └── tiles/
│       ├── 8/                    // Zoom level directories
│       │   ├── 120/              // X coordinate
│       │   │   ├── 80.png        // Y coordinate tile
│       │   │   └── 81.png
│       │   └── 121/
│       ├── 9/
│       ├── ...
│       └── 16/                   // Max zoom level
└── cache_metadata.json           // Global cache info
```

### 1.3 Download Options Model

```swift
struct DownloadOptions {
    let includePhotos: Bool = false        // Photos optional due to size
    let tileQuality: TileQuality = .standard
    let maxZoomLevel: Int = 16
    let bufferKilometers: Double = 2.0     // 2km buffer around route
    let compressTiles: Bool = true
}

enum TileQuality {
    case standard    // @1x resolution
    case retina     // @2x resolution (2x file size)
}
```

---

## Phase 2: Cache-First Data Loading (Week 2-3)

### 2.1 Smart Firebase Service Extension

```swift
extension FirebaseService {
    /// Cache-first route loading - RideWithGPS style
    func loadRouteWithCache(persistentId: String) async throws -> Route {
        // 1. INSTANT: Try offline cache first
        if let cachedRoute = OfflineRouteManager.shared.loadOfflineRoute(persistentId) {
            print("✅ Loaded from cache instantly: \(cachedRoute.name)")
            
            // Background sync if stale (>24 hours)
            Task {
                await OfflineRouteManager.shared.backgroundSyncIfStale(persistentId)
            }
            
            return cachedRoute
        }
        
        // 2. FALLBACK: Load from Firebase
        print("🌐 Loading from Firebase...")
        let route = try await loadRoute(persistentId: persistentId)
        
        // 3. CACHE: Save for next time
        Task {
            await OfflineRouteManager.shared.cacheRoute(route, routeId: persistentId)
        }
        
        return route
    }
}
```

### 2.2 Route Detail View Model Update

```swift
extension RouteDetailViewModel {
    func loadRoute(persistentId: String) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Use cache-first loading
                let loadedRoute = try await FirebaseService.shared.loadRouteWithCache(persistentId: persistentId)
                
                await MainActor.run {
                    self.route = loadedRoute
                    self.processLoadedRoute()
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}
```

---

## Phase 3: MapBox Offline Tile Integration (Week 3-4)

### 3.1 Tile Download Manager

```swift
class TileDownloadManager {
    private let session = URLSession.shared
    
    func downloadTilesForRoute(_ route: Route, options: DownloadOptions) async throws -> DownloadProgress {
        let bounds = calculateBufferedBounds(route, buffer: options.bufferKilometers)
        let tiles = calculateRequiredTiles(bounds, minZoom: 8, maxZoom: options.maxZoomLevel)
        
        var progress = DownloadProgress(totalTiles: tiles.count)
        
        for tile in tiles {
            let tileData = try await downloadSingleTile(tile, quality: options.tileQuality)
            try saveTileLocally(tileData, tile: tile, routeId: route.id)
            
            progress.completedTiles += 1
            await notifyProgress(progress)
        }
        
        return progress
    }
    
    private func downloadSingleTile(_ tile: Tile, quality: TileQuality) async throws -> Data {
        let resolution = quality == .retina ? "@2x" : ""
        let url = "https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/256/\(tile.z)/\(tile.x)/\(tile.y)\(resolution)?access_token=\(mapboxToken)"
        
        let (data, _) = try await session.data(from: URL(string: url)!)
        return data
    }
}

struct Tile {
    let x: Int
    let y: Int 
    let z: Int
}

struct DownloadProgress {
    let totalTiles: Int
    var completedTiles: Int = 0
    
    var percentage: Double {
        Double(completedTiles) / Double(totalTiles) * 100
    }
}
```

### 3.2 Tile Calculation Logic

```swift
extension TileDownloadManager {
    func calculateRequiredTiles(_ bounds: CoordinateBounds, minZoom: Int, maxZoom: Int) -> [Tile] {
        var tiles: [Tile] = []
        
        for zoom in minZoom...maxZoom {
            let minTileX = Int(floor((bounds.southwest.longitude + 180.0) / 360.0 * pow(2.0, Double(zoom))))
            let maxTileX = Int(floor((bounds.northeast.longitude + 180.0) / 360.0 * pow(2.0, Double(zoom))))
            
            let minTileY = Int(floor((1.0 - log(tan(bounds.northeast.latitude * .pi / 180.0) + 1.0 / cos(bounds.northeast.latitude * .pi / 180.0)) / .pi) / 2.0 * pow(2.0, Double(zoom))))
            let maxTileY = Int(floor((1.0 - log(tan(bounds.southwest.latitude * .pi / 180.0) + 1.0 / cos(bounds.southwest.latitude * .pi / 180.0)) / .pi) / 2.0 * pow(2.0, Double(zoom))))
            
            for x in minTileX...maxTileX {
                for y in minTileY...maxTileY {
                    tiles.append(Tile(x: x, y: y, z: zoom))
                }
            }
        }
        
        return tiles
    }
}
```

---

## Phase 4: Enhanced Downloads UI (Week 4-5)

### 4.1 Download Button in Route Detail

```swift
// Add to CustomTabBarView in RouteDetailView
private var downloadButton: some View {
    Button(action: {
        viewModel.toggleDownload()
    }) {
        VStack(spacing: 1) {
            ZStack {
                if viewModel.isDownloading {
                    // Progress ring
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 2)
                    Circle()
                        .trim(from: 0, to: CGFloat(viewModel.downloadProgress))
                        .stroke(Color.blue, lineWidth: 2)
                        .rotationEffect(.degrees(-90))
                    
                    Text("\(Int(viewModel.downloadProgress * 100))%")
                        .font(.system(size: 8, weight: .medium))
                } else if viewModel.isRouteDownloaded {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 23, weight: .medium))
                        .foregroundColor(.green)
                } else {
                    Image(systemName: "icloud.and.arrow.down")
                        .font(.system(size: 23, weight: .medium))
                        .foregroundColor(.blue)
                }
            }
            .frame(width: 23, height: 23)
            
            Text(downloadButtonText)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(downloadButtonColor)
        }
    }
    .disabled(!authManager.isAuthenticated)
}

private var downloadButtonText: String {
    if viewModel.isDownloading { return "Downloading" }
    if viewModel.isRouteDownloaded { return "Downloaded" }
    return "Download"
}
```

### 4.2 Enhanced Downloads View

```swift
struct DownloadsView: View {
    @StateObject private var offlineManager = OfflineRouteManager.shared
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var appNavigationManager: AppNavigationManager
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Storage usage header
                storageUsageHeader
                
                if offlineManager.downloadedRoutes.isEmpty {
                    emptyStateView
                } else {
                    downloadedRoutesList
                }
            }
            .navigationTitle("Downloads")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cleanup") {
                        showingCleanupOptions = true
                    }
                }
            }
        }
    }
    
    private var storageUsageHeader: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "internaldrive")
                    .foregroundColor(.blue)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Storage Used")
                        .font(.headline)
                    Text("\(offlineManager.totalStorageUsed.formatted(.byteCount(style: .file))) of device storage")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text("\(offlineManager.downloadedRoutes.count) routes")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            .padding()
            
            Divider()
        }
        .background(Color(UIColor.systemGray6))
    }
}
```

---

## Phase 5: Offline Detection & Seamless Switching (Week 5-6)

### 5.1 Network Monitor

```swift
import Network

class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    @Published var isConnected = true
    @Published var connectionType: ConnectionType = .wifi
    
    enum ConnectionType {
        case wifi
        case cellular
        case offline
    }
    
    init() {
        startMonitoring()
    }
    
    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = self?.getConnectionType(path) ?? .offline
            }
        }
        monitor.start(queue: queue)
    }
}
```

### 5.2 Enhanced Route Map View for Offline

```swift
extension EnhancedRouteMapView {
    func updateUIView(_ mapView: MapView, context: Context) {
        // Existing code...
        
        // Handle offline tile loading
        if !NetworkMonitor.shared.isConnected {
            setupOfflineTileSource(mapView)
        } else {
            setupOnlineTileSource(mapView)
        }
    }
    
    private func setupOfflineTileSource(_ mapView: MapView) {
        // Configure MapBox to use local tiles when offline
        if let routeId = route?.id,
           OfflineRouteManager.shared.isRouteDownloaded(routeId) {
            // Use offline tiles
            let offlineTileSource = OfflineTileSource(routeId: routeId)
            // MapBox configuration for offline tiles
        }
    }
}
```

---

## Phase 6: Storage Management & Optimization (Week 6-7)

### 6.1 Intelligent Cleanup

```swift
extension OfflineRouteManager {
    func intelligentCleanup() async {
        let routes = getDownloadedRoutes()
        let sortedByLastAccess = routes.sorted { $0.lastAccessDate < $1.lastAccessDate }
        
        // Remove routes not accessed in 30+ days if storage > 2GB
        if getTotalStorageUsed() > 2_000_000_000 {
            let oldRoutes = sortedByLastAccess.filter { 
                Date().timeIntervalSince($0.lastAccessDate) > 30 * 24 * 60 * 60 
            }
            
            for route in oldRoutes {
                await deleteOfflineRoute(route.id)
            }
        }
    }
    
    func getStorageBreakdown() -> [StorageItem] {
        return getDownloadedRoutes().map { route in
            StorageItem(
                routeId: route.id,
                routeName: route.name,
                size: getRouteStorageSize(route.id),
                lastAccessed: route.lastAccessDate,
                downloadDate: route.downloadDate
            )
        }
    }
}

struct StorageItem {
    let routeId: String
    let routeName: String
    let size: Int64
    let lastAccessed: Date
    let downloadDate: Date
}
```

### 6.2 Compression Strategy

```swift
class TileCompressionManager {
    static func compressTile(_ data: Data) -> Data {
        // Use iOS built-in compression
        return try! (data as NSData).compressed(using: .lzfse) as Data
    }
    
    static func decompressTile(_ data: Data) -> Data {
        return try! (data as NSData).decompressed(using: .lzfse) as Data
    }
}
```

---

## Phase 7: User Experience Polish (Week 7-8)

### 7.1 Download Size Estimation

```swift
extension DownloadOptions {
    func estimateDownloadSize(for route: Route) -> Int64 {
        let bounds = calculateBufferedBounds(route, buffer: bufferKilometers)
        let tiles = calculateRequiredTiles(bounds, minZoom: 8, maxZoom: maxZoomLevel)
        
        let avgTileSize: Int64 = tileQuality == .retina ? 40_000 : 20_000 // bytes
        let tilesSize = Int64(tiles.count) * avgTileSize
        
        let routeDataSize: Int64 = 150_000 // ~150KB for route data
        let photosSize: Int64 = includePhotos ? estimatePhotosSize(route) : 0
        
        return tilesSize + routeDataSize + photosSize
    }
}
```

### 7.2 Download Confirmation Dialog

```swift
struct DownloadConfirmationView: View {
    let route: Route
    let estimatedSize: Int64
    let onConfirm: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "icloud.and.arrow.down")
                .font(.system(size: 50))
                .foregroundColor(.blue)
            
            Text("Download \(route.name)?")
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
            
            VStack(spacing: 8) {
                HStack {
                    Text("Download size:")
                    Spacer()
                    Text(estimatedSize.formatted(.byteCount(style: .file)))
                        .fontWeight(.semibold)
                }
                
                HStack {
                    Text("Available offline:")
                    Spacer()
                    Text("Map + Route + POIs")
                        .fontWeight(.semibold)
                }
            }
            .padding()
            .background(Color(UIColor.systemGray6))
            .cornerRadius(8)
            
            HStack(spacing: 12) {
                Button("Cancel") {
                    onCancel()
                }
                .buttonStyle(.bordered)
                
                Button("Download") {
                    onConfirm()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

---

## Technical Implementation Details

### MapBox Offline Integration

```swift
// Using MapBox's built-in offline capabilities
import MapboxMaps

class MapBoxOfflineManager {
    func downloadOfflineRegion(bounds: CoordinateBounds, styleURL: URL, routeId: String) async throws {
        let tileStore = TileStore.default
        let tilesetDescriptor = mapView.mapboxMap.tileset(for: sourceId)
        
        let downloadOptions = TilesetDescriptorOptions(
            styleURI: StyleURI(url: styleURL)!,
            zoomRange: 8...16,
            pixelRatio: UIScreen.main.scale
        )
        
        let loadOptions = TileRegionLoadOptions(
            geometry: Geometry.polygon(Polygon(bounds.toPolygon())),
            descriptors: [tilesetDescriptor],
            metadata: ["routeId": routeId],
            acceptExpired: true
        )
        
        let tileRegion = try await tileStore.loadTileRegion(for: routeId, loadOptions: loadOptions)
    }
}
```

### Data Models

```swift
struct OfflineRoute: Codable, Identifiable {
    let id: String
    let name: String
    let downloadDate: Date
    let lastAccessDate: Date
    let fileSize: Int64
    let tileCount: Int
    let boundingBox: CoordinateBounds
    let downloadOptions: DownloadOptions
    let route: Route // Complete route data
}

struct OfflineIndex: Codable {
    var routes: [String: OfflineRoute] = [:]
    var totalStorageUsed: Int64 = 0
    var lastCleanup: Date = Date()
    
    mutating func addRoute(_ route: OfflineRoute) {
        routes[route.id] = route
        totalStorageUsed += route.fileSize
    }
    
    mutating func removeRoute(_ routeId: String) {
        if let route = routes[routeId] {
            totalStorageUsed -= route.fileSize
            routes.removeValue(forKey: routeId)
        }
    }
}
```

---

## Performance Optimizations

### 1. Tile Loading Strategy
- **Progressive loading**: Show low-res tiles immediately, upgrade to high-res
- **Intelligent caching**: Keep frequently accessed tiles in memory
- **Background preparation**: Pre-load tiles for likely zoom levels

### 2. Route Data Optimization
- **Differential sync**: Only update changed route data
- **Compression**: Compress route data JSON (20-30% size reduction)
- **Lazy loading**: Load route segments on demand

### 3. Memory Management
- **Tile pool**: Reuse tile image objects
- **Memory warnings**: Clear non-essential caches
- **Background processing**: Use background queues for file operations

---

## Testing Strategy

### Unit Tests
- Tile calculation accuracy
- Cache-first loading logic
- Storage management functions
- Network detection reliability

### Integration Tests
- Complete download/offline usage flow
- MapBox offline integration
- Firebase data consistency
- Storage cleanup effectiveness

### User Acceptance Testing
- Download speed and reliability
- Offline usage experience
- Storage management usability
- Error handling and recovery

---

## Deployment Plan

### Beta Release (Internal)
- Core offline functionality
- Basic downloads UI
- Limited route set for testing

### Public Beta
- Full feature set
- Performance optimizations
- User feedback integration

### Production Release
- Polish and bug fixes
- Comprehensive documentation
- Support for legacy devices

---

## Success Metrics

### Performance Targets
- **Route loading**: <0.1s from cache, <3s from network
- **Download speed**: 5MB/min average on cellular
- **Storage efficiency**: <200MB per typical route
- **Battery impact**: <5% additional drain during downloads

### User Experience Goals
- **Seamless offline transition**: No user-visible interruptions
- **Intuitive downloads**: Clear progress and size information
- **Reliable operation**: 99%+ success rate for downloads
- **Storage management**: Automatic cleanup maintains <2GB usage

---

## Risk Mitigation

### Technical Risks
- **MapBox API changes**: Regular SDK updates and testing
- **iOS storage limitations**: Intelligent cleanup and user warnings
- **Network reliability**: Robust retry mechanisms
- **Large download sizes**: Compression and progressive downloading

### User Experience Risks
- **Download confusion**: Clear size estimates and progress
- **Storage surprises**: Proactive storage monitoring
- **Offline limitations**: Clear offline capability indicators
- **Data costs**: WiFi-only download options

---

## Future Enhancements

### Phase 2 Features
- **Smart route recommendations**: Suggest downloads based on location
- **Shared offline routes**: Family/group route sharing
- **Advanced compression**: Machine learning-based tile optimization
- **Offline editing**: Allow POI additions while offline

### Integration Opportunities
- **Apple CarPlay**: Offline route access in vehicles
- **Apple Watch**: Basic offline route info on wrist
- **Shortcuts app**: Siri voice commands for downloads
- **Background App Refresh**: Automatic route updates

---

This implementation strategy provides a comprehensive roadmap for building world-class offline maps functionality that rivals industry leaders like RideWithGPS while leveraging CyaTrails' existing Firebase infrastructure and MapBox integration.
