import SwiftUI

@main
struct LutruwitaApp: App {
    // Initialize services
    private let firebaseService = FirebaseService.shared
    
    // Initialize view models
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var routeViewModel = RouteViewModel()
    @StateObject private var mapViewModel = MapViewModel()
    @StateObject private var offlineViewModel = OfflineViewModel()
    
    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(routeViewModel)
                    .environmentObject(mapViewModel)
                    .environmentObject(offlineViewModel)
            } else {
                AuthView()
                    .environmentObject(authViewModel)
            }
        }
    }
}
