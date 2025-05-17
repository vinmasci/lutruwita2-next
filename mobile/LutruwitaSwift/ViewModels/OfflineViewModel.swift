import SwiftUI
import Combine
import CoreLocation
import Network

enum OfflineStatus {
    case online
    case offline
    case limited
}

enum DownloadStatus {
    case notDownloaded
    case downloading(progress: Double)
    case downloaded
    case failed(error: Error)
}

// Extended OfflineRegion model that includes UI-specific properties
struct OfflineRegionViewModel: Identifiable {
    let id: String
    let name: String
    let boundingBox: [[Double]]?
    let size: Int64
    let createdAt: Date
    let status: DownloadStatus
    
    // Initialize from MapboxService's OfflineRegion
    init(from region: OfflineRegion, status: DownloadStatus = .downloaded, boundingBox: [[Double]]? = nil) {
        self.id = region.id
        self.name = region.name
        self.boundingBox = boundingBox
        self.size = Int64(region.size)
        self.createdAt = Date() // Mapbox doesn't provide creation date
        self.status = status
    }
    
    // Initialize directly
    init(id: String, name: String, boundingBox: [[Double]]?, size: Int64, createdAt: Date, status: DownloadStatus) {
        self.id = id
        self.name = name
        self.boundingBox = boundingBox
        self.size = size
        self.createdAt = createdAt
        self.status = status
    }
}

class OfflineViewModel: ObservableObject {
    @Published var offlineStatus: OfflineStatus = .online
    @Published var downloadedRegions: [OfflineRegionViewModel] = []
    @Published var downloadedRoutes: [String] = [] // IDs of downloaded routes
    @Published var isLoading: Bool = false
    @Published var error: Error? = nil
    @Published var totalStorageUsed: Int64 = 0
    
    private var cancellables = Set<AnyCancellable>()
    private let mapboxService = MapboxService.shared
    private var networkMonitor: NWPathMonitor?
    
    init() {
        // Monitor network connectivity
        monitorConnectivity()
        
        // Load downloaded regions and routes
        loadDownloadedContent()
    }
    
    private func monitorConnectivity() {
        networkMonitor = NWPathMonitor()
        networkMonitor?.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                switch path.status {
                case .satisfied:
                    self?.offlineStatus = .online
                case .unsatisfied:
                    self?.offlineStatus = .offline
                case .requiresConnection:
                    self?.offlineStatus = .limited
                @unknown default:
                    self?.offlineStatus = .online
                }
            }
        }
        
        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor?.start(queue: queue)
    }
    
    private func loadDownloadedContent() {
        isLoading = true
        
        // Load downloaded regions from MapboxService
        mapboxService.listDownloadedRegions()
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.error = error
                }
                self?.isLoading = false
            }, receiveValue: { [weak self] regions in
                guard let self = self else { return }
                
                // Convert to view model regions
                self.downloadedRegions = regions.map { region in
                    OfflineRegionViewModel(
                        from: region,
                        status: .downloaded,
                        boundingBox: nil // Mapbox doesn't provide bounding box in the response
                    )
                }
                
                // Calculate total storage used
                self.totalStorageUsed = self.downloadedRegions.reduce(0) { $0 + $1.size }
                
                // If no regions were found, add some sample data for development
                if self.downloadedRegions.isEmpty {
                    self.addSampleRegions()
                }
            })
            .store(in: &cancellables)
        
        // Load downloaded routes (this would use a local database in a real implementation)
        // For now, we'll just use sample data
        downloadedRoutes = ["route1", "route2"]
    }
    
    private func addSampleRegions() {
        // Add sample regions for development purposes
        let tasmaniaRegion = OfflineRegionViewModel(
            id: "tasmania",
            name: "Tasmania",
            boundingBox: [
                [145.0, -43.5], // Southwest corner
                [148.5, -40.5]  // Northeast corner
            ],
            size: 50 * 1024 * 1024, // 50 MB
            createdAt: Date().addingTimeInterval(-86400 * 7), // 7 days ago
            status: .downloaded
        )
        
        let hobartRegion = OfflineRegionViewModel(
            id: "hobart",
            name: "Hobart Region",
            boundingBox: [
                [147.0, -43.0], // Southwest corner
                [147.5, -42.5]  // Northeast corner
            ],
            size: 20 * 1024 * 1024, // 20 MB
            createdAt: Date().addingTimeInterval(-86400 * 2), // 2 days ago
            status: .downloaded
        )
        
        downloadedRegions = [tasmaniaRegion, hobartRegion]
        totalStorageUsed = downloadedRegions.reduce(0) { $0 + $1.size }
    }
    
    func downloadRegion(name: String, boundingBox: [[Double]]) {
        // Check if region already exists
        if downloadedRegions.contains(where: { $0.id == name.lowercased() }) {
            // Region already exists
            return
        }
        
        // Create a new region with downloading status
        let newRegion = OfflineRegionViewModel(
            id: name.lowercased(),
            name: name,
            boundingBox: boundingBox,
            size: 0, // Size not known yet
            createdAt: Date(),
            status: .downloading(progress: 0.0)
        )
        
        // Add to downloaded regions
        downloadedRegions.append(newRegion)
        
        // Start the download using MapboxService
        mapboxService.downloadRegion(name: name, boundingBox: boundingBox)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    // Update region with failed status
                    if let index = self?.downloadedRegions.firstIndex(where: { $0.id == name.lowercased() }) {
                        self?.downloadedRegions[index] = OfflineRegionViewModel(
                            id: name.lowercased(),
                            name: name,
                            boundingBox: boundingBox,
                            size: 0,
                            createdAt: Date(),
                            status: .failed(error: error)
                        )
                    }
                }
            }, receiveValue: { [weak self] progress in
                guard let self = self else { return }
                
                // Update progress
                if let index = self.downloadedRegions.firstIndex(where: { $0.id == name.lowercased() }) {
                    if progress.percentComplete >= 1.0 {
                        // Download complete
                        let size = Int64(progress.completedResourceSize)
                        
                        // Update region with downloaded status and size
                        self.downloadedRegions[index] = OfflineRegionViewModel(
                            id: name.lowercased(),
                            name: name,
                            boundingBox: boundingBox,
                            size: size,
                            createdAt: Date(),
                            status: .downloaded
                        )
                        
                        // Update total storage used
                        self.totalStorageUsed += size
                    } else {
                        // Update progress
                        self.downloadedRegions[index] = OfflineRegionViewModel(
                            id: name.lowercased(),
                            name: name,
                            boundingBox: boundingBox,
                            size: 0,
                            createdAt: Date(),
                            status: .downloading(progress: progress.percentComplete)
                        )
                    }
                }
            })
            .store(in: &cancellables)
    }
    
    func deleteRegion(id: String) {
        // Find the region
        guard let index = downloadedRegions.firstIndex(where: { $0.id == id }) else {
            return
        }
        
        // Get the region size
        let size = downloadedRegions[index].size
        
        // Delete the region using MapboxService
        mapboxService.deleteRegion(id: id)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.error = error
                }
            }, receiveValue: { [weak self] _ in
                guard let self = self else { return }
                
                // Remove the region from the local list
                self.downloadedRegions.remove(at: index)
                
                // Update total storage used
                self.totalStorageUsed -= size
            })
            .store(in: &cancellables)
    }
    
    func downloadRoute(routeId: String) {
        // Check if route is already downloaded
        if downloadedRoutes.contains(routeId) {
            return
        }
        
        // In a real implementation, this would download the route data
        // For now, we'll just simulate it
        isLoading = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            
            // Add route to downloaded routes
            self.downloadedRoutes.append(routeId)
            
            self.isLoading = false
        }
    }
    
    func deleteRoute(routeId: String) {
        // Remove route from downloaded routes
        downloadedRoutes.removeAll { $0 == routeId }
    }
    
    func isRouteDownloaded(routeId: String) -> Bool {
        return downloadedRoutes.contains(routeId)
    }
    
    func clearAllDownloads() {
        isLoading = true
        
        // Delete all regions one by one
        let regionIds = downloadedRegions.map { $0.id }
        
        for id in regionIds {
            deleteRegion(id: id)
        }
        
        // Clear all downloaded routes
        downloadedRoutes.removeAll()
        
        // Reset total storage used
        totalStorageUsed = 0
        
        isLoading = false
    }
    
    // Format bytes to human-readable size
    func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
    
    deinit {
        networkMonitor?.cancel()
    }
}
