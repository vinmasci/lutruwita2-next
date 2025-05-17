import Foundation

struct User: Identifiable, Codable {
    let id: String
    let email: String
    let name: String?
    let profileImage: URL?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case profileImage = "picture"
    }
}
