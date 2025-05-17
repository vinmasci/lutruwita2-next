import SwiftUI
import Firebase
import MapboxMaps
import Auth0
import Combine

@main
struct LutruwitaApp: App {
    // Initialize Firebase and other services on app launch
    init() {
        // Initialize Firebase
        FirebaseApp.configure()
        
        // Initialize Mapbox
        if let mapboxAccessToken = Bundle.main.object(forInfoDictionaryKey: "MGLMapboxAccessToken") as? String {
            ResourceOptionsManager.default.resourceOptions.accessToken = mapboxAccessToken
        }
        
        print("LutruwitaApp: App initialized")
    }
    
    var body: some Scene {
        WindowGroup {
            LutruwitaContentView()
                .onOpenURL { url in
                    // Handle Auth0 callback URL
                    _ = Auth0.resumeAuth(url, options: [:])
                }
        }
    }
}

struct LutruwitaContentView: View {
    // Initialize services
    private let firebaseService = FirebaseService.shared
    
    // Initialize view models with explicit service dependencies
    @StateObject private var authViewModel = AuthViewModel(authService: AuthService())
    @StateObject private var routeViewModel = RouteViewModel(routeService: RouteService())
    @StateObject private var mapViewModel = MapViewModel()
    @StateObject private var offlineViewModel = OfflineViewModel()
    
    var body: some View {
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
