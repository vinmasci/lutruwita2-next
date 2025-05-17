import SwiftUI
import CoreLocation

struct HomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var routeViewModel: RouteViewModel
    @EnvironmentObject var mapViewModel: MapViewModel
    @EnvironmentObject var offlineViewModel: OfflineViewModel
    
    @State private var showingRouteDetails = false
    @State private var selectedCoordinate: CLLocationCoordinate2D?
    @State private var showingRouteCreated = false
    @State private var createdRoute: Route?
    @State private var showingSearchSheet = false
    @State private var showingFilterSheet = false
    @State private var searchText = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                // Main map view
                MapView(
                    centerCoordinate: $mapViewModel.centerCoordinate,
                    mapViewModel: mapViewModel,
                    onMapTap: { coordinate in
                        selectedCoordinate = coordinate
                        showingRouteDetails = true
                    }
                )
                .edgesIgnoringSafeArea(.all)
                
                // Overlay for search and filters
                VStack {
                    HStack {
                        // Search bar
                        Button(action: {
                            showingSearchSheet = true
                        }) {
                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.gray)
                                Text("Search routes and locations")
                                    .foregroundColor(.gray)
                                Spacer()
                            }
                            .padding(10)
                            .background(Color.white)
                            .cornerRadius(8)
                            .shadow(radius: 2)
                        }
                        
                        // Filter button
                        Button(action: {
                            showingFilterSheet = true
                        }) {
                            Image(systemName: "slider.horizontal.3")
                                .foregroundColor(.blue)
                                .padding(10)
                                .background(Color.white)
                                .cornerRadius(8)
                                .shadow(radius: 2)
                        }
                    }
                    .padding()
                    
                    Spacer()
                    
                    // Map controls
                    VStack(spacing: 10) {
                        Button(action: {
                            mapViewModel.zoomIn()
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .resizable()
                                .frame(width: 44, height: 44)
                                .foregroundColor(.white)
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(radius: 2)
                        }
                        
                        Button(action: {
                            mapViewModel.zoomOut()
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .resizable()
                                .frame(width: 44, height: 44)
                                .foregroundColor(.white)
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(radius: 2)
                        }
                        
                        Button(action: {
                            mapViewModel.centerOnUserLocation()
                        }) {
                            Image(systemName: "location.circle.fill")
                                .resizable()
                                .frame(width: 44, height: 44)
                                .foregroundColor(.white)
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(radius: 2)
                        }
                    }
                    .padding(.trailing, 16)
                    .padding(.bottom, 16)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                
                // Loading indicator
                if mapViewModel.isLoading || routeViewModel.isLoading {
                    LoadingView(message: "Loading map data...")
                }
            }
            .navigationTitle("Lutruwita")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: {
                            // Download current map area
                            if let boundingBox = mapViewModel.calculateBoundingBox(for: [mapViewModel.centerCoordinate]) {
                                offlineViewModel.downloadRegion(
                                    name: "Custom Region",
                                    boundingBox: boundingBox
                                )
                            }
                        }) {
                            Label("Download This Area", systemImage: "arrow.down.circle")
                        }
                        
                        Button(action: {
                            // Show user location
                            mapViewModel.centerOnUserLocation()
                        }) {
                            Label("My Location", systemImage: "location")
                        }
                        
                        Button(action: {
                            // Sign out
                            authViewModel.logout()
                        }) {
                            Label("Sign Out", systemImage: "arrow.right.circle")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .imageScale(.large)
                    }
                }
            }
            .sheet(isPresented: $showingRouteDetails) {
                if let coordinate = selectedCoordinate {
                    VStack {
                        Text("Location Details")
                            .font(.headline)
                            .padding(.bottom)
                        
                        Text("Latitude: \(String(format: "%.6f", coordinate.latitude))")
                        Text("Longitude: \(String(format: "%.6f", coordinate.longitude))")
                        
                        Button("Create Route Here") {
                            // Create a sample route at this location
                            let newRoute = routeViewModel.createSampleRoute(at: coordinate)
                            routeViewModel.saveRoute(route: newRoute)
                            createdRoute = newRoute
                            showingRouteDetails = false
                            showingRouteCreated = true
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.top)
                        
                        Button("Close") {
                            showingRouteDetails = false
                        }
                        .padding(.top)
                    }
                    .padding()
                }
            }
            .sheet(isPresented: $showingSearchSheet) {
                SearchSheetView(isPresented: $showingSearchSheet, searchText: $searchText)
                    .environmentObject(routeViewModel)
                    .environmentObject(mapViewModel)
            }
            .sheet(isPresented: $showingFilterSheet) {
                FilterSheetView(isPresented: $showingFilterSheet)
            }
            .alert("Route Created", isPresented: $showingRouteCreated) {
                Button("View in Saved Routes", role: .cancel) {
                    // User will need to navigate to Saved Routes tab
                }
            } message: {
                if let route = createdRoute {
                    Text("'\(route.name)' has been created and saved to your routes.")
                } else {
                    Text("A new route has been created and saved.")
                }
            }
            .onAppear {
                // Request location permission when the view appears
                mapViewModel.requestLocationPermission()
            }
        }
    }
}

// Search sheet view
struct SearchSheetView: View {
    @EnvironmentObject var routeViewModel: RouteViewModel
    @EnvironmentObject var mapViewModel: MapViewModel
    @Binding var isPresented: Bool
    @Binding var searchText: String
    @State private var searchResults: [SearchResult] = []
    
    struct SearchResult: Identifiable {
        let id = UUID()
        let name: String
        let description: String
        let coordinate: CLLocationCoordinate2D
        let type: SearchResultType
    }
    
    enum SearchResultType {
        case route
        case location
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    
                    TextField("Search routes and locations", text: $searchText)
                        .onChange(of: searchText) { _ in
                            performSearch()
                        }
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            searchText = ""
                            searchResults = []
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding(10)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
                .padding()
                
                // Search results
                List {
                    if searchResults.isEmpty && !searchText.isEmpty {
                        Text("No results found")
                            .foregroundColor(.secondary)
                            .italic()
                    } else {
                        ForEach(searchResults) { result in
                            Button(action: {
                                // Center map on the selected result
                                mapViewModel.centerCoordinate = result.coordinate
                                isPresented = false
                            }) {
                                HStack {
                                    Image(systemName: result.type == .route ? "map" : "mappin")
                                        .foregroundColor(result.type == .route ? .blue : .red)
                                    
                                    VStack(alignment: .leading) {
                                        Text(result.name)
                                            .font(.headline)
                                        
                                        Text(result.description)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search")
            .navigationBarItems(trailing: Button("Cancel") {
                isPresented = false
            })
        }
    }
    
    private func performSearch() {
        guard !searchText.isEmpty else {
            searchResults = []
            return
        }
        
        // Filter routes based on search text
        let matchingRoutes = routeViewModel.routes.filter { route in
            return route.name.lowercased().contains(searchText.lowercased()) ||
                   (route.description?.lowercased().contains(searchText.lowercased()) ?? false)
        }
        
        // Convert routes to search results
        let routeResults = matchingRoutes.map { route in
            return SearchResult(
                name: route.name,
                description: route.description ?? "No description",
                coordinate: route.coordinates.first ?? CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0),
                type: .route
            )
        }
        
        // Add some mock location results
        var locationResults: [SearchResult] = []
        
        if "tasmania".contains(searchText.lowercased()) {
            locationResults.append(
                SearchResult(
                    name: "Tasmania",
                    description: "Island state of Australia",
                    coordinate: CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0),
                    type: .location
                )
            )
        }
        
        if "hobart".contains(searchText.lowercased()) {
            locationResults.append(
                SearchResult(
                    name: "Hobart",
                    description: "Capital city of Tasmania",
                    coordinate: CLLocationCoordinate2D(latitude: -42.8821, longitude: 147.3272),
                    type: .location
                )
            )
        }
        
        if "launceston".contains(searchText.lowercased()) {
            locationResults.append(
                SearchResult(
                    name: "Launceston",
                    description: "City in northern Tasmania",
                    coordinate: CLLocationCoordinate2D(latitude: -41.4332, longitude: 147.1441),
                    type: .location
                )
            )
        }
        
        // Combine and sort results
        searchResults = (routeResults + locationResults).sorted { $0.name < $1.name }
    }
}

// Filter sheet view
struct FilterSheetView: View {
    @Binding var isPresented: Bool
    @State private var selectedDifficulty: String = "All"
    @State private var selectedDistance: String = "All"
    @State private var selectedElevation: String = "All"
    
    let difficulties = ["All", "Easy", "Medium", "Hard", "Expert"]
    let distances = ["All", "< 5 km", "5-10 km", "10-20 km", "> 20 km"]
    let elevations = ["All", "< 200 m", "200-500 m", "500-1000 m", "> 1000 m"]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Difficulty")) {
                    Picker("Difficulty", selection: $selectedDifficulty) {
                        ForEach(difficulties, id: \.self) { difficulty in
                            Text(difficulty)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section(header: Text("Distance")) {
                    Picker("Distance", selection: $selectedDistance) {
                        ForEach(distances, id: \.self) { distance in
                            Text(distance)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section(header: Text("Elevation")) {
                    Picker("Elevation", selection: $selectedElevation) {
                        ForEach(elevations, id: \.self) { elevation in
                            Text(elevation)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section {
                    Button(action: {
                        // Apply filters
                        isPresented = false
                    }) {
                        Text("Apply Filters")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                    
                    Button(action: {
                        // Reset filters
                        selectedDifficulty = "All"
                        selectedDistance = "All"
                        selectedElevation = "All"
                    }) {
                        Text("Reset Filters")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                }
            }
            .navigationTitle("Filter Routes")
            .navigationBarItems(trailing: Button("Cancel") {
                isPresented = false
            })
        }
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthViewModel())
        .environmentObject(RouteViewModel())
        .environmentObject(MapViewModel())
        .environmentObject(OfflineViewModel())
}
