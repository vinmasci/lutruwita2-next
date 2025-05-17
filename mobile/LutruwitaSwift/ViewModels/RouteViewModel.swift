import SwiftUI
import Combine
import CoreLocation

class RouteViewModel: ObservableObject {
    @Published var routes: [Route] = []
    @Published var selectedRoute: Route? = nil
    @Published var isLoading: Bool = false
    @Published var error: Error? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let routeService: RouteService
    
    init(routeService: RouteService = RouteService()) {
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
    
    func loadRoute(id: String) {
        isLoading = true
        
        routeService.fetchRoute(id: id)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error
                }
            }, receiveValue: { [weak self] route in
                self?.selectedRoute = route
            })
            .store(in: &cancellables)
    }
    
    func saveRoute(route: Route) {
        isLoading = true
        
        routeService.saveRoute(route: route)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error
                } else {
                    // Reload routes after saving
                    self?.loadRoutes()
                }
            }, receiveValue: { _ in })
            .store(in: &cancellables)
    }
    
    func deleteRoute(id: String) {
        isLoading = true
        
        routeService.deleteRoute(id: id)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error
                } else {
                    // Reload routes after deleting
                    self?.loadRoutes()
                }
            }, receiveValue: { _ in })
            .store(in: &cancellables)
    }
    
    // Create a sample route for testing
    func createSampleRoute(at coordinate: CLLocationCoordinate2D) -> Route {
        // Create a simple route around the given coordinate
        let radius = 0.01 // Approximately 1km
        let steps = 20
        var coordinates: [CLLocationCoordinate2D] = []
        
        for i in 0..<steps {
            let angle = Double(i) * (2 * Double.pi / Double(steps))
            let lat = coordinate.latitude + radius * sin(angle)
            let lon = coordinate.longitude + radius * cos(angle)
            coordinates.append(CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
        
        // Close the loop
        coordinates.append(coordinates[0])
        
        return Route(
            id: UUID().uuidString,
            name: "Sample Route",
            description: "A sample route created for testing",
            distance: 5.0, // km
            elevation: 100.0, // m
            coordinates: coordinates,
            boundingBox: [
                [coordinate.longitude - radius, coordinate.latitude - radius],
                [coordinate.longitude + radius, coordinate.latitude + radius]
            ]
        )
    }
}
