import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { hasStoredAuthentication, getStoredUser, getStoredToken, clearStoredAuthentication } from '../utils/authUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  token: string | null;
  loading: boolean;
  error: Error | null;
  logout: () => void;
  forceLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null,
  logout: () => {},
  forceLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    isAuthenticated: auth0IsAuthenticated, 
    user: auth0User, 
    getAccessTokenSilently, 
    logout: auth0Logout, 
    error: auth0Error, 
    isLoading,
    loginWithRedirect
  } = useAuth0();
  
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [authSource, setAuthSource] = useState<'auth0' | 'local' | null>(null);

  // Effect to handle Auth0 authentication state changes
  useEffect(() => {
    const updateAuthState = async () => {
      try {
        // Skip auth state update on the callback page to avoid race conditions
        if (window.location.pathname === '/callback') {
          console.log('AuthContext: On callback page, skipping auth state update');
          setLoading(false);
          return;
        }
        
        console.log('AuthContext: Updating auth state, Auth0 authenticated:', auth0IsAuthenticated);
        console.log('AuthContext: Has stored auth:', hasStoredAuthentication());
        
        if (auth0IsAuthenticated && auth0User) {
          // User is authenticated with Auth0
          console.log('AuthContext: User authenticated via Auth0');
          setUser(auth0User);
          setIsAuthenticated(true);
          setAuthSource('auth0');
          
          try {
            // Get the access token
            const accessToken = await getAccessTokenSilently();
            setToken(accessToken);
            
            // Store authentication data in localStorage
            localStorage.setItem('auth_user', JSON.stringify(auth0User));
            localStorage.setItem('auth_token', accessToken);
            localStorage.setItem('auth_timestamp', Date.now().toString());
            
            console.log('AuthContext: Successfully stored auth data in localStorage');
          } catch (tokenError) {
            console.error('Error getting access token:', tokenError);
            setError(tokenError as Error);
          }
        } else if (hasStoredAuthentication()) {
          // User is not authenticated with Auth0, but we have stored authentication
          console.log('AuthContext: Using stored authentication');
          const storedUser = getStoredUser();
          const storedToken = getStoredToken();
          
          setUser(storedUser);
          setToken(storedToken);
          setIsAuthenticated(true);
          setAuthSource('local');
        } else {
          // User is not authenticated
          console.log('AuthContext: User not authenticated');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
          setAuthSource(null);
        }
        
        // Set error from Auth0 if any
        if (auth0Error) {
          setError(auth0Error);
        }
        
        // Update loading state
        setLoading(isLoading);
      } catch (err) {
        console.error('Error in auth state update:', err);
        setError(err as Error);
      }
    };
    
    updateAuthState();
  }, [auth0IsAuthenticated, auth0User, getAccessTokenSilently, auth0Error, isLoading]);

  // Custom logout function that also clears localStorage
  const handleLogout = () => {
    console.log('AuthContext: Logging out');
    clearStoredAuthentication();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setAuthSource(null);
    
    // Only call Auth0 logout if we were authenticated via Auth0
    if (authSource === 'auth0') {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    }
  };

  // Force login function
  const forceLogin = () => {
    loginWithRedirect();
  };

  // Create a mock user if needed for development
  useEffect(() => {
    const createMockUser = () => {
      // Check if we should create a mock user (for development)
      const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
      
      if (useMockAuth && !isAuthenticated && !loading) {
        console.log('AuthContext: Creating mock user for development');
        
        const mockUser = {
          name: 'Mock User',
          email: 'mock@example.com',
          picture: '',
          sub: 'mock|user123',
          given_name: 'Mock',
          family_name: 'User',
          nickname: 'mockuser'
        };
        
        setUser(mockUser);
        setToken('mock_token_' + Date.now());
        setIsAuthenticated(true);
        setAuthSource('local');
        
        // Store mock authentication data
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
        localStorage.setItem('auth_token', 'mock_token_' + Date.now());
        localStorage.setItem('auth_timestamp', Date.now().toString());
      }
    };
    
    createMockUser();
  }, [isAuthenticated, loading]);

  const value = {
    isAuthenticated,
    user,
    token,
    loading,
    error,
    logout: handleLogout,
    forceLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
