import SwiftUI

struct SavedRoutesView: View {
    @StateObject private var routeViewModel = RouteViewModel()
    @State private var showingDeleteAlert = false
    @State private var routeToDelete: Route? = nil
    
    var body: some View {
        NavigationView {
            ZStack {
                if routeViewModel.isLoading {
                    ProgressView("Loading routes...")
                } else if routeViewModel.routes.isEmpty {
                    VStack {
                        Image(systemName: "map")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 80, height: 80)
                            .foregroundColor(.gray)
                            .padding()
                        
                        Text("No saved routes")
                            .font(.headline)
                        
                        Text("Routes you save will appear here")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                    }
                } else {
                    List {
                        ForEach(routeViewModel.routes) { route in
                            NavigationLink(destination: RouteDetailView(route: route)) {
                                RouteRow(route: route)
                            }
                            .swipeActions {
                                Button(role: .destructive) {
                                    routeToDelete = route
                                    showingDeleteAlert = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .refreshable {
                        routeViewModel.loadRoutes()
                    }
                }
            }
            .navigationTitle("Saved Routes")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        routeViewModel.loadRoutes()
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .alert("Delete Route", isPresented: $showingDeleteAlert, presenting: routeToDelete) { route in
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    routeViewModel.deleteRoute(id: route.id)
                }
            } message: { route in
                Text("Are you sure you want to delete '\(route.name)'? This action cannot be undone.")
            }
        }
    }
}

struct RouteRow: View {
    let route: Route
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(route.name)
                .font(.headline)
            
            if let description = route.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            HStack(spacing: 12) {
                Label("\(String(format: "%.1f", route.distance)) km", systemImage: "ruler")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Label("\(Int(route.elevation)) m", systemImage: "arrow.up.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 4)
        }
        .padding(.vertical, 8)
    }
}

struct RouteDetailView: View {
    let route: Route
    @State private var centerCoordinate: CLLocationCoordinate2D
    
    init(route: Route) {
        self.route = route
        // Initialize with the first coordinate of the route
        _centerCoordinate = State(initialValue: route.coordinates.first ?? CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0))
    }
    
    var body: some View {
        VStack {
            // Map view showing the route
            MapView(centerCoordinate: $centerCoordinate)
                .frame(height: 300)
            
            // Route details
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(route.name)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        if let description = route.description {
                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Divider()
                    
                    HStack(spacing: 20) {
                        VStack {
                            Text("\(String(format: "%.1f", route.distance))")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Distance (km)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack {
                            Text("\(Int(route.elevation))")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Elevation (m)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack {
                            Text("Medium")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Difficulty")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Route Information")
                            .font(.headline)
                        
                        Text("Starting Point: \(String(format: "%.6f", route.coordinates.first?.latitude ?? 0)), \(String(format: "%.6f", route.coordinates.first?.longitude ?? 0))")
                            .font(.subheadline)
                        
                        Text("Number of Points: \(route.coordinates.count)")
                            .font(.subheadline)
                        
                        Text("Created: \(route.createdAt, formatter: dateFormatter)")
                            .font(.subheadline)
                        
                        Text("Last Updated: \(route.updatedAt, formatter: dateFormatter)")
                            .font(.subheadline)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }
}

#Preview {
    SavedRoutesView()
}
