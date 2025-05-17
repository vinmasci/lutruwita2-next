import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Service class for handling Firebase operations
class FirebaseService {
    // Singleton instance
    static let shared = FirebaseService()
    
    // Firestore database reference
    private let db = Firestore.firestore()
    
    private init() {
        // Configure Firestore settings if needed
        let settings = FirestoreSettings()
        // Enable offline persistence
        settings.isPersistenceEnabled = true
        // Set cache size to 100MB
        settings.cacheSizeBytes = FirestoreCacheSizeUnlimited
        db.settings = settings
    }
    
    // MARK: - Route Loading
    
    /// Load a route by its persistent ID
    /// - Parameter persistentId: The persistent ID of the route
    /// - Returns: The route data
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
    
    /// Get optimized route data if available
    /// - Parameter persistentId: The persistent ID of the route
    /// - Returns: The optimized route data if available
    private func getOptimizedRouteData(persistentId: String) async throws -> Route? {
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
    
    /// List routes with optional filters
    /// - Parameter filters: Optional filters to apply to the query
    /// - Returns: An array of route list items
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
