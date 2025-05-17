import SwiftUI

struct LoadingView: View {
    let message: String
    let isFullScreen: Bool
    
    init(message: String = "Loading...", isFullScreen: Bool = false) {
        self.message = message
        self.isFullScreen = isFullScreen
    }
    
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .scaleEffect(1.5)
            
            Text(message)
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .padding(30)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(UIColor.systemBackground))
                .shadow(radius: isFullScreen ? 0 : 5)
        )
        .frame(maxWidth: .infinity, maxHeight: isFullScreen ? .infinity : nil)
        .background(
            isFullScreen ? 
                Color.black.opacity(0.4).edgesIgnoringSafeArea(.all) : 
                Color.clear
        )
    }
}

// Modifier to add a loading overlay to any view
struct LoadingViewModifier: ViewModifier {
    let isLoading: Bool
    let message: String
    
    func body(content: Content) -> some View {
        ZStack {
            content
                .disabled(isLoading)
                .blur(radius: isLoading ? 2 : 0)
            
            if isLoading {
                LoadingView(message: message)
            }
        }
    }
}

// Extension to make it easier to use the loading modifier
extension View {
    func loading(isLoading: Bool, message: String = "Loading...") -> some View {
        self.modifier(LoadingViewModifier(isLoading: isLoading, message: message))
    }
}

#Preview {
    VStack(spacing: 20) {
        LoadingView(message: "Loading routes...")
        
        Text("Content with loading overlay")
            .frame(maxWidth: .infinity, maxHeight: 200)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(10)
            .loading(isLoading: true, message: "Processing...")
    }
    .padding()
}
