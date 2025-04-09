import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AUTH_EVENTS } from '../../../features/map/services/routeService';

// Create context
const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  authError: null,
  checkAuthentication: () => {},
  refreshToken: () => Promise.resolve(),
});

/**
 * AuthProvider component that wraps the application and provides authentication state
 * This component synchronizes the Auth0 state with our application state
 * and handles authentication errors and token refresh
 */
export const AuthProvider = function(props) {
  // Get Auth0 state
  const { 
    isAuthenticated: auth0IsAuthenticated, 
    isLoading: auth0IsLoading, 
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout
  } = useAuth0();

  // Local state
  const [isAuthenticated, setIsAuthenticated] = useState(auth0IsAuthenticated);
  const [isLoading, setIsLoading] = useState(auth0IsLoading);
  const [user, setUser] = useState(auth0User);
  const [authError, setAuthError] = useState(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(Date.now());

  // Sync Auth0 state with local state
  useEffect(() => {
    setIsAuthenticated(auth0IsAuthenticated);
    setIsLoading(auth0IsLoading);
    setUser(auth0User);
  }, [auth0IsAuthenticated, auth0IsLoading, auth0User]);

  // Listen for authentication events
  useEffect(() => {
    const handleTokenRefreshFailed = (event) => {
      console.warn('[AuthContext] Token refresh failed:', event.detail.message);
      setAuthError(event.detail.message);
      setIsAuthenticated(false);
    };

    const handleTokenExpired = (event) => {
      console.warn('[AuthContext] Token expired:', event.detail.message);
      setAuthError(event.detail.message);
      setIsAuthenticated(false);
    };

    const handleSessionTimeout = (event) => {
      console.warn('[AuthContext] Session timeout:', event.detail.message);
      setAuthError(event.detail.message);
      setIsAuthenticated(false);
    };

    // Add event listeners
    window.addEventListener(AUTH_EVENTS.TOKEN_REFRESH_FAILED, handleTokenRefreshFailed);
    window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
    window.addEventListener(AUTH_EVENTS.SESSION_TIMEOUT, handleSessionTimeout);

    // Clean up event listeners
    return () => {
      window.removeEventListener(AUTH_EVENTS.TOKEN_REFRESH_FAILED, handleTokenRefreshFailed);
      window.removeEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.removeEventListener(AUTH_EVENTS.SESSION_TIMEOUT, handleSessionTimeout);
    };
  }, []);

  // Function to check if the user is authenticated
  const checkAuthentication = async () => {
    try {
      // If we're already loading, don't do anything
      if (isLoading) return isAuthenticated;

      // If we're not authenticated, don't do anything
      if (!isAuthenticated) return false;
      
      // Skip token refresh in presentation mode
      if (isPresentationMode()) {
        console.log('[AuthContext] Skipping token refresh check in presentation mode');
        return isAuthenticated;
      }

      // Check if token needs refresh (token validity is 50 minutes)
      const tokenValidityDuration = 50 * 60 * 1000; // 50 minutes in milliseconds
      const needsRefresh = Date.now() - lastTokenRefresh > tokenValidityDuration;

      if (needsRefresh) {
        console.log('[AuthContext] Token may be expiring soon, refreshing...');
        await refreshToken();
      }

      return isAuthenticated;
    } catch (error) {
      console.error('[AuthContext] Error checking authentication:', error);
      setAuthError('Failed to check authentication status');
      setIsAuthenticated(false);
      return false;
    }
  };

  // Function to refresh the token
  const refreshToken = async () => {
    // Skip token refresh in presentation mode
    if (isPresentationMode()) {
      console.log('[AuthContext] Skipping token refresh in presentation mode');
      return true;
    }
    
    try {
      console.log('[AuthContext] Refreshing token...');
      await getAccessTokenSilently({ ignoreCache: true });
      console.log('[AuthContext] Token refreshed successfully');
      setLastTokenRefresh(Date.now());
      setAuthError(null);
      return true;
    } catch (error) {
      console.error('[AuthContext] Error refreshing token:', error);
      
      // Check error type to determine appropriate action
      if (error.error === 'login_required' || 
          error.error === 'consent_required' ||
          error.message?.includes('Login required') ||
          error.message?.includes('consent required')) {
        
        setAuthError('Your session has expired. Please log in again.');
        setIsAuthenticated(false);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          console.log('[AuthContext] Redirecting to login page...');
          loginWithRedirect({
            appState: { returnTo: window.location.pathname }
          });
        }, 2000);
      } else {
        setAuthError('Failed to refresh authentication. Please try again.');
        setIsAuthenticated(false);
      }
      
      return false;
    }
  };

  // Helper function to check if we're in presentation mode
  const isPresentationMode = () => {
    if (typeof window === 'undefined') return false;
    
    // Check if the current URL path indicates presentation mode
    const path = window.location.pathname;
    return path.startsWith('/preview') || 
           path.startsWith('/embed') || 
           path === '/'; // Landing page is also presentation mode
  };

  // Set up periodic token refresh
  useEffect(() => {
    // Only set up refresh if authenticated
    if (!isAuthenticated) return;

    // Check token validity every 5 minutes
    const tokenCheckInterval = setInterval(() => {
      // Skip token refresh in presentation mode
      if (isPresentationMode()) {
        console.log('[AuthContext] Skipping token refresh in presentation mode');
        return;
      }

      const tokenValidityDuration = 50 * 60 * 1000; // 50 minutes in milliseconds
      const needsRefresh = Date.now() - lastTokenRefresh > tokenValidityDuration;

      if (needsRefresh) {
        console.log('[AuthContext] Token may be expiring soon, refreshing...');
        refreshToken()
          .then(success => {
            if (success) {
              console.log('[AuthContext] Token refreshed successfully');
            } else {
              console.warn('[AuthContext] Token refresh failed');
            }
          })
          .catch(error => {
            console.error('[AuthContext] Error refreshing token:', error);
          });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Clean up interval on component unmount
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [isAuthenticated, lastTokenRefresh]);

  // Context value
  const contextValue = {
    isAuthenticated,
    isLoading,
    user,
    authError,
    checkAuthentication,
    refreshToken,
    login: loginWithRedirect,
    logout: () => {
      // Clear any cached tokens or state
      localStorage.removeItem('auth0.is.authenticated');
      
      // Log out the user
      logout({ returnTo: window.location.origin });
    },
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    props.children
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
