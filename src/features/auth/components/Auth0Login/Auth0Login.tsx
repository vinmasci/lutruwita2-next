import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Auth0Login.css';
import UserProfileDrawer from '../UserProfileDrawer/UserProfileDrawer';

export const Auth0Login: React.FC = () => {
  const { loginWithRedirect, user: auth0User, isAuthenticated: auth0IsAuthenticated, isLoading, error, getAccessTokenSilently } = useAuth0();
  const [imageError, setImageError] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [storedUser, setStoredUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const userRef = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  // Get and store the access token when authenticated via Auth0
  useEffect(() => {
    const getToken = async () => {
      if (auth0IsAuthenticated && auth0User) {
        try {
          console.log('Auth0Login: User authenticated via Auth0, getting token');
          const token = await getAccessTokenSilently();
          setAccessToken(token);
          tokenRef.current = token;
          
          // Store user data and token in localStorage for persistence
          localStorage.setItem('auth_user', JSON.stringify(auth0User));
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_timestamp', Date.now().toString());
          
          // Update stored user
          setStoredUser(auth0User);
          userRef.current = auth0User;
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Error getting access token:', err);
        }
      }
    };
    
    getToken();
  }, [auth0IsAuthenticated, auth0User, getAccessTokenSilently]);

  // Check for stored authentication on component mount
  useEffect(() => {
    const checkStoredAuth = () => {
      const storedUserData = localStorage.getItem('auth_user');
      const storedToken = localStorage.getItem('auth_token');
      const storedTimestamp = localStorage.getItem('auth_timestamp');
      
      if (storedUserData && storedToken && storedTimestamp) {
        try {
          // Check if token is not expired (24 hours validity)
          const timestamp = parseInt(storedTimestamp, 10);
          const now = Date.now();
          const tokenAge = now - timestamp;
          const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (tokenAge <= tokenMaxAge) {
            console.log('Auth0Login: Found valid stored authentication, using it');
            const userData = JSON.parse(storedUserData);
            setStoredUser(userData);
            userRef.current = userData;
            setAccessToken(storedToken);
            tokenRef.current = storedToken;
            setIsAuthenticated(true);
          } else {
            console.log('Auth0Login: Stored authentication is expired');
            // Clear expired authentication data
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_timestamp');
          }
        } catch (e) {
          console.error('Error parsing stored user data:', e);
        }
      }
    };
    
    // Only check stored auth if not authenticated via Auth0
    if (!auth0IsAuthenticated && !isLoading) {
      checkStoredAuth();
    }
  }, [auth0IsAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="auth0-login">
        <div className="auth0-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    console.error('Auth0 error:', error);
  }

  // Use stored user if available, otherwise use Auth0 user
  const currentUser = auth0IsAuthenticated ? auth0User : (isAuthenticated ? storedUser : null);
  const currentToken = auth0IsAuthenticated ? accessToken : (isAuthenticated ? tokenRef.current : null);
  
  // Create a logout avatar (red circle with white X)
  const logoutAvatar = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#d32f2f" />
      <path d="M16.192 7.808a1 1 0 0 0-1.414 0L12 10.586l-2.778-2.778a1 1 0 1 0-1.414 1.414L10.586 12l-2.778 2.778a1 1 0 1 0 1.414 1.414L12 13.414l2.778 2.778a1 1 0 0 0 1.414-1.414L13.414 12l2.778-2.778a1 1 0 0 0 0-1.414z" fill="white" />
    </svg>
  `;
  
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
  
  // Determine which avatar to show
  let avatarSrc;
  let avatarTitle;
  
  if (currentUser) {
    // User is authenticated - show profile picture or initials
    if (currentUser.picture && !imageError) {
      // Add cache-busting parameter to prevent caching issues with Google images
      const cacheBuster = `?t=${Date.now()}`;
      avatarSrc = currentUser.picture.includes('?') 
        ? `${currentUser.picture}&cb=${cacheBuster}` 
        : `${currentUser.picture}${cacheBuster}`;
    } else {
      avatarSrc = defaultAvatar;
    }
    avatarTitle = "Click to view profile";
  } else {
    // User is not authenticated - show login avatar
    avatarSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoutAvatar)}`;
    avatarTitle = "Click to login";
  }

  const handleAvatarClick = () => {
    if (currentUser) {
      // If authenticated, open the drawer
      setIsDrawerOpen(true);
    } else {
      // If not authenticated, trigger login
      loginWithRedirect();
    }
  };

  return (
    <>
      <div className="auth0-login">
        <img 
          src={avatarSrc}
          alt={currentUser ? currentUser.name : "Login"}
          className="auth0-avatar"
          onClick={handleAvatarClick}
          title={avatarTitle}
          style={{ cursor: 'pointer', backgroundColor: '#2a2a2a' }}
          onError={() => setImageError(true)}
        />
        {currentUser ? (
          <i className="fa-solid fa-circle-check auth-status-indicator logged-in" title="Logged in"></i>
        ) : (
          <i className="fa-solid fa-circle-xmark auth-status-indicator logged-out" title="Logged out"></i>
        )}
      </div>
      
      {/* User Profile Drawer */}
      <div className={`user-profile-drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`user-profile-drawer-container ${isDrawerOpen ? 'open' : ''}`}>
        <UserProfileDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          user={currentUser}
          token={currentToken || undefined}
        />
      </div>
    </>
  );
};

export default Auth0Login;
