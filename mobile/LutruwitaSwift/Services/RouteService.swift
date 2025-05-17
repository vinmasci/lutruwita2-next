import Foundation
import Combine
import CoreLocation

enum RouteError: Error {
    case fetchFailed
    case saveFailed
    case deleteFailed
    case notFound
    case invalidData
}

class RouteService {
    // In a real implementation, this would use Firebase SDK
    // For now, we'll create a mock implementation with sample data
    
    private var sampleRoutes: [Route] = []
    
    init() {
        // Create some sample routes for testing
        createSampleRoutes()
    }
    
    private func createSampleRoutes() {
        // Tasmania center coordinates
        let tasmaniaCenter = CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0)
        
        // Create a few sample routes
        let route1 = createCircularRoute(
            id: "route1",
            name: "Mount Wellington Loop",
            description: "A scenic loop around Mount Wellington",
            center: CLLocationCoordinate2D(latitude: -42.8955, longitude: 147.2365),
            radius: 0.02,
            distance: 12.5,
            elevation: 750
        )
        
        let route2 = createCircularRoute(
            id: "route2",
            name: "Cradle Mountain Trail",
            description: "Explore the beautiful Cradle Mountain area",
            center: CLLocationCoordinate2D(latitude: -41.6382, longitude: 145.9517),
            radius: 0.03,
            distance: 18.2,
            elevation: 950
        )
        
        let route3 = createCircularRoute(
            id: "route3",
            name: "Freycinet Peninsula",
            description: "Coastal walk with stunning views",
            center: CLLocationCoordinate2D(latitude: -42.1304, longitude: 148.2871),
            radius: 0.025,
            distance: 15.7,
            elevation: 450
        )
        
        sampleRoutes = [route1, route2, route3]
    }
    
    private func createCircularRoute(id: String, name: String, description: String, center: CLLocationCoordinate2D, radius: Double, distance: Double, elevation: Double) -> Route {
        let steps = 20
        var coordinates: [CLLocationCoordinate2D] = []
        
        for i in 0..<steps {
            let angle = Double(i) * (2 * Double.pi / Double(steps))
            let lat = center.latitude + radius * sin(angle)
            let lon = center.longitude + radius * cos(angle)
            coordinates.append(CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
        
        // Close the loop
        coordinates.append(coordinates[0])
        
        return Route(
            id: id,
            name: name,
            description: description,
            distance: distance,
            elevation: elevation,
            coordinates: coordinates,
            boundingBox: [
                [center.longitude - radius, center.latitude - radius],
                [center.longitude + radius, center.latitude + radius]
            ]
        )
    }
    
    func fetchRoutes() -> AnyPublisher<[Route], Error> {
        // Simulate network delay
        return Future<[Route], Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Return sample routes
                promise(.success(self.sampleRoutes))
            }
        }
        .eraseToAnyPublisher()
    }
    
    func fetchRoute(id: String) -> AnyPublisher<Route, Error> {
        // Simulate network delay
        return Future<Route, Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Find route by ID
                if let route = self.sampleRoutes.first(where: { $0.id == id }) {
                    promise(.success(route))
                } else {
                    promise(.failure(RouteError.notFound))
                }
            }
        }
        .eraseToAnyPublisher()
    }
    
    func saveRoute(route: Route) -> AnyPublisher<Void, Error> {
        // Simulate network delay
        return Future<Void, Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Check if route already exists
                if let index = self.sampleRoutes.firstIndex(where: { $0.id == route.id }) {
                    // Update existing route
                    self.sampleRoutes[index] = route
                } else {
                    // Add new route
                    self.sampleRoutes.append(route)
                }
                
                // Return success
                promise(.success(()))
            }
        }
        .eraseToAnyPublisher()
    }
    
    func deleteRoute(id: String) -> AnyPublisher<Void, Error> {
        // Simulate network delay
        return Future<Void, Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Remove route by ID
                self.sampleRoutes.removeAll { $0.id == id }
                
                // Return success
                promise(.success(()))
            }
        }
        .eraseToAnyPublisher()
    }
}
