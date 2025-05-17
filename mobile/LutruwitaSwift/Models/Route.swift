import Foundation
import CoreLocation

struct Route: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let distance: Double
    let elevation: Double
    var coordinates: [CLLocationCoordinate2D]
    let boundingBox: [[Double]]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case distance
        case elevation
        case coordinates
        case boundingBox
        case createdAt
        case updatedAt
    }
    
    // Custom encoding for CLLocationCoordinate2D which isn't Codable by default
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(description, forKey: .description)
        try container.encode(distance, forKey: .distance)
        try container.encode(elevation, forKey: .elevation)
        
        // Encode coordinates as [[longitude, latitude]]
        let coordinateArray = coordinates.map { [$0.longitude, $0.latitude] }
        try container.encode(coordinateArray, forKey: .coordinates)
        
        try container.encode(boundingBox, forKey: .boundingBox)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
    
    // Custom decoding for CLLocationCoordinate2D
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        distance = try container.decode(Double.self, forKey: .distance)
        elevation = try container.decode(Double.self, forKey: .elevation)
        
        // Decode coordinates from [[longitude, latitude]]
        let coordinateArray = try container.decode([[Double]].self, forKey: .coordinates)
        coordinates = coordinateArray.map { CLLocationCoordinate2D(latitude: $0[1], longitude: $0[0]) }
        
        boundingBox = try container.decodeIfPresent([[Double]].self, forKey: .boundingBox)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }
    
    // Convenience initializer for creating routes in code
    init(id: String, name: String, description: String? = nil, distance: Double, elevation: Double, coordinates: [CLLocationCoordinate2D], boundingBox: [[Double]]? = nil, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.name = name
        self.description = description
        self.distance = distance
        self.elevation = elevation
        self.coordinates = coordinates
        self.boundingBox = boundingBox
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
