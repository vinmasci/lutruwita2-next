import SwiftUI

struct DownloadsView: View {
    @EnvironmentObject var offlineViewModel: OfflineViewModel
    @EnvironmentObject var routeViewModel: RouteViewModel
    @State private var showingDownloadSheet = false
    @State private var showingDeleteAlert = false
    @State private var regionToDelete: OfflineRegionViewModel? = nil
    @State private var routeToDelete: String? = nil
    
    var body: some View {
        NavigationView {
            ZStack {
                if offlineViewModel.isLoading {
                    LoadingView(message: "Loading downloads...", isFullScreen: true)
                } else {
                    VStack {
                        // Storage usage indicator
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Storage Used")
                                    .font(.headline)
                                Text(offlineViewModel.formatBytes(offlineViewModel.totalStorageUsed))
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Button(action: {
                                // Show confirmation dialog
                                showingDeleteAlert = true
                            }) {
                                Text("Clear All")
                                    .foregroundColor(.red)
                            }
                        }
                        .padding()
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(10)
                        .padding(.horizontal)
                        
                        // Content list
                        List {
                            // Offline Maps section
                            Section(header: Text("Offline Maps")) {
                                if offlineViewModel.downloadedRegions.isEmpty {
                                    Text("No offline maps downloaded")
                                        .foregroundColor(.secondary)
                                        .italic()
                                } else {
                                    ForEach(offlineViewModel.downloadedRegions) { region in
                                        HStack {
                                            VStack(alignment: .leading) {
                                                Text(region.name)
                                                    .font(.headline)
                                                
                                                HStack {
                                                    Text(offlineViewModel.formatBytes(region.size))
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                    
                                                    Text("•")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                    
                                                    Text(region.createdAt, style: .date)
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                            }
                                            
                                            Spacer()
                                            
                                            // Status indicator
                                            if case .downloading(let progress) = region.status {
                                                HStack {
                                                    ProgressView(value: progress)
                                                        .frame(width: 100)
                                                    
                                                    Text("\(Int(progress * 100))%")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                            } else if case .downloaded = region.status {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(.green)
                                            } else if case .failed = region.status {
                                                Image(systemName: "exclamationmark.circle.fill")
                                                    .foregroundColor(.red)
                                            }
                                        }
                                        .padding(.vertical, 4)
                                        .swipeActions {
                                            Button(role: .destructive) {
                                                regionToDelete = region
                                                showingDeleteAlert = true
                                            } label: {
                                                Label("Delete", systemImage: "trash")
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Offline Routes section
                            Section(header: Text("Offline Routes")) {
                                if offlineViewModel.downloadedRoutes.isEmpty {
                                    Text("No offline routes downloaded")
                                        .foregroundColor(.secondary)
                                        .italic()
                                } else {
                                    ForEach(offlineViewModel.downloadedRoutes, id: \.self) { routeId in
                                        // Find the route in the route view model
                                        let route = routeViewModel.routes.first { $0.id == routeId }
                                        
                                        if let route = route {
                                            RouteRow(route: route)
                                                .swipeActions {
                                                    Button(role: .destructive) {
                                                        routeToDelete = routeId
                                                        showingDeleteAlert = true
                                                    } label: {
                                                        Label("Delete", systemImage: "trash")
                                                    }
                                                }
                                        } else {
                                            HStack {
                                                VStack(alignment: .leading) {
                                                    Text("Route \(routeId)")
                                                        .font(.headline)
                                                    Text("Downloaded route")
                                                        .font(.subheadline)
                                                        .foregroundColor(.secondary)
                                                }
                                                Spacer()
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(.green)
                                            }
                                            .padding(.vertical, 4)
                                            .swipeActions {
                                                Button(role: .destructive) {
                                                    routeToDelete = routeId
                                                    showingDeleteAlert = true
                                                } label: {
                                                    Label("Delete", systemImage: "trash")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Downloads")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingDownloadSheet = true
                    }) {
                        Image(systemName: "arrow.down.circle")
                    }
                }
            }
            .sheet(isPresented: $showingDownloadSheet) {
                DownloadSheetView(isPresented: $showingDownloadSheet)
                    .environmentObject(offlineViewModel)
            }
            .alert(isPresented: $showingDeleteAlert) {
                if let region = regionToDelete {
                    return Alert(
                        title: Text("Delete Map Region"),
                        message: Text("Are you sure you want to delete the offline map for \(region.name)?"),
                        primaryButton: .destructive(Text("Delete")) {
                            offlineViewModel.deleteRegion(id: region.id)
                            regionToDelete = nil
                        },
                        secondaryButton: .cancel {
                            regionToDelete = nil
                        }
                    )
                } else if let routeId = routeToDelete {
                    return Alert(
                        title: Text("Delete Offline Route"),
                        message: Text("Are you sure you want to delete this offline route?"),
                        primaryButton: .destructive(Text("Delete")) {
                            offlineViewModel.deleteRoute(routeId: routeId)
                            routeToDelete = nil
                        },
                        secondaryButton: .cancel {
                            routeToDelete = nil
                        }
                    )
                } else {
                    return Alert(
                        title: Text("Clear All Downloads"),
                        message: Text("Are you sure you want to delete all offline maps and routes? This action cannot be undone."),
                        primaryButton: .destructive(Text("Clear All")) {
                            offlineViewModel.clearAllDownloads()
                        },
                        secondaryButton: .cancel()
                    )
                }
            }
        }
    }
}

// Sheet for downloading new content
struct DownloadSheetView: View {
    @EnvironmentObject var offlineViewModel: OfflineViewModel
    @EnvironmentObject var routeViewModel: RouteViewModel
    @Binding var isPresented: Bool
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack {
                Picker("Content Type", selection: $selectedTab) {
                    Text("Maps").tag(0)
                    Text("Routes").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                if selectedTab == 0 {
                    // Maps tab
                    List {
                        Section(header: Text("Available Regions")) {
                            Button(action: {
                                offlineViewModel.downloadRegion(
                                    name: "Tasmania",
                                    boundingBox: [
                                        [145.0, -43.5], // Southwest corner
                                        [148.5, -40.5]  // Northeast corner
                                    ]
                                )
                                isPresented = false
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("Tasmania")
                                            .font(.headline)
                                        Text("Full island map")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.down.circle")
                                        .foregroundColor(.blue)
                                }
                            }
                            
                            Button(action: {
                                offlineViewModel.downloadRegion(
                                    name: "Hobart Region",
                                    boundingBox: [
                                        [147.0, -43.0], // Southwest corner
                                        [147.5, -42.5]  // Northeast corner
                                    ]
                                )
                                isPresented = false
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("Hobart Region")
                                            .font(.headline)
                                        Text("Hobart and surrounding areas")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.down.circle")
                                        .foregroundColor(.blue)
                                }
                            }
                            
                            Button(action: {
                                offlineViewModel.downloadRegion(
                                    name: "Cradle Mountain",
                                    boundingBox: [
                                        [145.9, -41.7], // Southwest corner
                                        [146.1, -41.5]  // Northeast corner
                                    ]
                                )
                                isPresented = false
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("Cradle Mountain")
                                            .font(.headline)
                                        Text("Cradle Mountain National Park")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.down.circle")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                } else {
                    // Routes tab
                    List {
                        Section(header: Text("Available Routes")) {
                            ForEach(routeViewModel.routes) { route in
                                if !offlineViewModel.isRouteDownloaded(routeId: route.id) {
                                    Button(action: {
                                        offlineViewModel.downloadRoute(routeId: route.id)
                                        isPresented = false
                                    }) {
                                        RouteRow(route: route)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Download Content")
            .navigationBarItems(trailing: Button("Done") {
                isPresented = false
            })
        }
    }
}

#Preview {
    DownloadsView()
        .environmentObject(OfflineViewModel())
        .environmentObject(RouteViewModel())
}
