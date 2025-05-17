import SwiftUI
import Combine
import CoreLocation

class MapViewModel: ObservableObject {
    @Published var centerCoordinate: CLLocationCoordinate2D
    @Published var zoomLevel: Double
    @Published var isShowingUserLocation: Bool = false
    @Published var selectedRouteId: String? = nil
    @Published var isLoading: Bool = false
    @Published var error: Error? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let locationManager = CLLocationManager()
    
    init(centerCoordinate: CLLocationCoordinate2D = CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0), zoomLevel: Double = 10.0) {
        self.centerCoordinate = centerCoordinate
        self.zoomLevel = zoomLevel
        
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10
        locationManager.pausesLocationUpdatesAutomatically = true
        locationManager.allowsBackgroundLocationUpdates = false
    }
    
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startLocationUpdates() {
        locationManager.startUpdatingLocation()
    }
    
    func stopLocationUpdates() {
        locationManager.stopUpdatingLocation()
    }
    
    func centerOnUserLocation() {
        if let userLocation = locationManager.location?.coordinate {
            centerCoordinate = userLocation
            isShowingUserLocation = true
        } else {
            requestLocationPermission()
        }
    }
    
    func zoomIn() {
        zoomLevel = min(zoomLevel + 1, 18)
    }
    
    func zoomOut() {
        zoomLevel = max(zoomLevel - 1, 5)
    }
    
    func selectRoute(id: String) {
        selectedRouteId = id
    }
    
    func clearSelectedRoute() {
        selectedRouteId = nil
    }
    
    func calculateDistance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
        
        return fromLocation.distance(from: toLocation)
    }
    
    // Calculate the bounding box that includes all coordinates
    func calculateBoundingBox(for coordinates: [CLLocationCoordinate2D]) -> [[Double]]? {
        guard !coordinates.isEmpty else { return nil }
        
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
        
        // Add a small padding
        let padding = 0.01
        minLat -= padding
        maxLat += padding
        minLng -= padding
        maxLng += padding
        
        return [[minLng, minLat], [maxLng, maxLat]]
    }
    
    // Fit the map to show all coordinates
    func fitMapToCoordinates(_ coordinates: [CLLocationCoordinate2D]) {
        guard let boundingBox = calculateBoundingBox(for: coordinates) else { return }
        
        // Calculate the center of the bounding box
        let centerLat = (boundingBox[0][1] + boundingBox[1][1]) / 2
        let centerLng = (boundingBox[0][0] + boundingBox[1][0]) / 2
        
        // Update the center coordinate
        centerCoordinate = CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng)
        
        // Calculate appropriate zoom level based on the size of the bounding box
        let latDelta = abs(boundingBox[1][1] - boundingBox[0][1])
        let lngDelta = abs(boundingBox[1][0] - boundingBox[0][0])
        let maxDelta = max(latDelta, lngDelta)
        
        // Simple formula to estimate zoom level
        zoomLevel = max(5, min(18, 14 - log2(maxDelta * 111))) // 111km per degree at equator
    }
}
