import SwiftUI

struct RouteCard: View {
    let route: Route
    var onTap: (() -> Void)? = nil
    var showActions: Bool = false
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header with route name and actions
            HStack {
                Text(route.name)
                    .font(.headline)
                    .lineLimit(1)
                
                Spacer()
                
                if showActions {
                    HStack(spacing: 12) {
                        Button(action: {
                            onEdit?()
                        }) {
                            Image(systemName: "pencil")
                                .foregroundColor(.blue)
                        }
                        
                        Button(action: {
                            onDelete?()
                        }) {
                            Image(systemName: "trash")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            
            // Description
            if let description = route.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            // Route stats
            HStack(spacing: 16) {
                // Distance
                HStack(spacing: 4) {
                    Image(systemName: "ruler")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(String(format: "%.1f km", route.distance))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Elevation
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(String(format: "%d m", Int(route.elevation)))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Date
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(route.createdAt, style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Route preview (placeholder for now)
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.blue.opacity(0.1))
                    .frame(height: 100)
                
                Image(systemName: "map")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
                    .foregroundColor(.blue.opacity(0.5))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
        .onTapGesture {
            onTap?()
        }
    }
}

// Preview with sample data
#Preview {
    let sampleRoute = Route(
        id: "1",
        name: "Mount Wellington Loop",
        description: "A scenic loop around Mount Wellington with beautiful views of Hobart.",
        distance: 12.5,
        elevation: 750,
        coordinates: [
            CLLocationCoordinate2D(latitude: -42.8955, longitude: 147.2365),
            CLLocationCoordinate2D(latitude: -42.9055, longitude: 147.2465),
            CLLocationCoordinate2D(latitude: -42.9155, longitude: 147.2365)
        ]
    )
    
    return VStack(spacing: 16) {
        RouteCard(route: sampleRoute)
        
        RouteCard(
            route: sampleRoute,
            showActions: true,
            onEdit: { print("Edit tapped") },
            onDelete: { print("Delete tapped") }
        )
    }
    .padding()
    .background(Color(UIColor.systemBackground))
}
