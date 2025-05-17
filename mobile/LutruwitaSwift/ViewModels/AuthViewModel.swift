import SwiftUI
import Combine

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var user: User? = nil
    @Published var isLoading: Bool = false
    @Published var error: Error? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let authService: AuthService
    
    init(authService: AuthService = AuthService()) {
        self.authService = authService
        checkAuthStatus()
    }
    
    func checkAuthStatus() {
        isLoading = true
        
        // Check if user is already authenticated
        // This would typically involve checking for stored credentials
        // and validating them with the auth service
        
        // For now, we'll just set isAuthenticated to false
        isAuthenticated = false
        isLoading = false
    }
    
    func login() {
        isLoading = true
        
        authService.login()
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error
                }
            }, receiveValue: { [weak self] user in
                self?.user = user
                self?.isAuthenticated = true
            })
            .store(in: &cancellables)
    }
    
    func logout() {
        isLoading = true
        
        authService.logout()
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error
                }
            }, receiveValue: { [weak self] _ in
                self?.user = nil
                self?.isAuthenticated = false
            })
            .store(in: &cancellables)
    }
}
