import SwiftUI

enum Tab {
    case home
    case savedRoutes
    case downloads
    case profile
}

struct MainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab: Tab = .home
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
                .tag(Tab.home)
            
            SavedRoutesView()
                .tabItem {
                    Label("Saved", systemImage: "bookmark")
                }
                .tag(Tab.savedRoutes)
            
            DownloadsView()
                .tabItem {
                    Label("Downloads", systemImage: "arrow.down.circle")
                }
                .tag(Tab.downloads)
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
                .tag(Tab.profile)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthViewModel())
}
