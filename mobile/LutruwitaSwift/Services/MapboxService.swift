import Foundation
import MapboxMaps
import Combine
import CoreLocation

class MapboxService {
    // Singleton instance
    static let shared = MapboxService()
    
    // Access token
    private var accessToken: String
    
    // Publishers
    private let downloadProgressSubject = PassthroughSubject<DownloadProgress, Error>()
    private let offlineRegionsSubject = CurrentValueSubject<[OfflineRegion], Error>([])
    
    // Offline manager
    private var offlineManager: OfflineManager?
    
    private init() {
        // Get the Mapbox access token from the Info.plist
        self.accessToken = Bundle.main.object(forInfoDictionaryKey: "MGLMapboxAccessToken") as? String ?? "placeholder_mapbox_access_token"
        
        // Initialize the offline manager
        setupOfflineManager()
    }
    
    private func setupOfflineManager() {
        do {
            offlineManager = try OfflineManager(resourceOptions: ResourceOptions(accessToken: accessToken))
        } catch {
            print("Error initializing OfflineManager: \(error)")
        }
    }
    
    // MARK: - Route Display
    
    /// Creates a route line layer on the map
    func addRouteLineLayer(to mapView: MapboxMaps.MapView, for route: Route, id: String) {
        // Convert the route coordinates to a LineString
        var lineCoordinates: [CLLocationCoordinate2D] = []
        for coordinate in route.coordinates {
            lineCoordinates.append(coordinate)
        }
        
        guard !lineCoordinates.isEmpty else { return }
        
        let lineString = LineString(lineCoordinates)
        var feature = Feature(geometry: .lineString(lineString))
        
        // Add metadata to the feature
        feature.properties = [
            "id": .string(id),
            "name": .string(route.name)
        ]
        
        // Create a GeoJSON source with the route feature
        var source = GeoJSONSource()
        source.data = .feature(feature)
        
        // Add the source to the map
        try? mapView.mapboxMap.addSource(source, id: "route-source-\(id)")
        
        // Create a line layer for the route
        var lineLayer = LineLayer(id: "route-layer-\(id)")
        lineLayer.source = "route-source-\(id)"
        lineLayer.lineColor = .constant(.init(UIColor.blue))
        lineLayer.lineWidth = .constant(4)
        lineLayer.lineCap = .constant(.round)
        lineLayer.lineJoin = .constant(.round)
        
        // Add the layer to the map
        try? mapView.mapboxMap.addLayer(lineLayer)
    }
    
    /// Removes a route line layer from the map
    func removeRouteLineLayer(from mapView: MapboxMaps.MapView, id: String) {
        if mapView.mapboxMap.layerExists(withId: "route-layer-\(id)") {
            try? mapView.mapboxMap.removeLayer(withId: "route-layer-\(id)")
        }
        
        if mapView.mapboxMap.sourceExists(withId: "route-source-\(id)") {
            try? mapView.mapboxMap.removeSource(withId: "route-source-\(id)")
        }
    }
    
    // MARK: - Offline Maps
    
    /// Downloads a map region for offline use
    func downloadRegion(name: String, boundingBox: [[Double]]) -> AnyPublisher<DownloadProgress, Error> {
        guard let offlineManager = offlineManager else {
            return Fail(error: NSError(domain: "MapboxService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Offline manager not initialized"])).eraseToAnyPublisher()
        }
        
        // Create a tile region
        let minLng = boundingBox[0][0]
        let minLat = boundingBox[0][1]
        let maxLng = boundingBox[1][0]
        let maxLat = boundingBox[1][1]
        
        let southwest = CLLocationCoordinate2D(latitude: minLat, longitude: minLng)
        let northeast = CLLocationCoordinate2D(latitude: maxLat, longitude: maxLng)
        
        let options = TileRegionLoadOptions(
            geometry: .boundingBox(CoordinateBounds(southwest: southwest, northeast: northeast)),
            descriptors: [TilesetDescriptor(styleURI: .streets)],
            metadata: ["name": name],
            acceptExpired: false
        )
        
        // Start the download
        do {
            let tileRegion = try offlineManager.createTileRegion(for: name, loadOptions: options)
            
            // Observe the download progress
            tileRegion.progress.observe { [weak self] progress in
                let downloadProgress = DownloadProgress(
                    completedResourceCount: progress.completedResourceCount,
                    completedResourceSize: progress.completedResourceSize,
                    requiredResourceCount: progress.requiredResourceCount,
                    percentComplete: progress.completedResourceCount > 0 ? Double(progress.completedResourceCount) / Double(progress.requiredResourceCount) : 0
                )
                
                self?.downloadProgressSubject.send(downloadProgress)
            }
            
            return downloadProgressSubject.eraseToAnyPublisher()
        } catch {
            return Fail(error: error).eraseToAnyPublisher()
        }
    }
    
    /// Lists all downloaded offline regions
    func listDownloadedRegions() -> AnyPublisher<[OfflineRegion], Error> {
        guard let offlineManager = offlineManager else {
            return Fail(error: NSError(domain: "MapboxService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Offline manager not initialized"])).eraseToAnyPublisher()
        }
        
        do {
            let tileRegions = try offlineManager.allTileRegions()
            
            var regions: [OfflineRegion] = []
            
            for tileRegion in tileRegions {
                if let name = tileRegion.metadata?["name"] as? String {
                    let region = OfflineRegion(
                        id: tileRegion.id,
                        name: name,
                        size: tileRegion.completedResourceSize
                    )
                    regions.append(region)
                }
            }
            
            offlineRegionsSubject.send(regions)
            return offlineRegionsSubject.eraseToAnyPublisher()
        } catch {
            return Fail(error: error).eraseToAnyPublisher()
        }
    }
    
    /// Deletes an offline region
    func deleteRegion(id: String) -> AnyPublisher<Void, Error> {
        guard let offlineManager = offlineManager else {
            return Fail(error: NSError(domain: "MapboxService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Offline manager not initialized"])).eraseToAnyPublisher()
        }
        
        return Future<Void, Error> { promise in
            do {
                try offlineManager.removeTileRegion(forId: id)
                promise(.success(()))
            } catch {
                promise(.failure(error))
            }
        }.eraseToAnyPublisher()
    }
}

// MARK: - Models

struct DownloadProgress {
    let completedResourceCount: UInt64
    let completedResourceSize: UInt64
    let requiredResourceCount: UInt64
    let percentComplete: Double
}

struct OfflineRegion: Identifiable {
    let id: String
    let name: String
    let size: UInt64
}
