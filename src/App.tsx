/**
 * THIS FILE IS LIKELY REDUNDANT
 * Please use the JavaScript version (App.js) if it exists.
 * This TypeScript file may be part of an incomplete migration.
 */

import { ThemeProvider } from '@mui/material/styles';
import { Box, Button, Typography } from '@mui/material';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { POIProvider } from './features/poi/context/POIContext';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { LandingPage } from './features/presentation/components/LandingPage/LandingPage';
import { RoutePresentation } from './features/presentation/components/RoutePresentation/RoutePresentation';
import { useEffect, useState } from 'react';

// Callback bypass component
const CallbackBypass = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Checking authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for auth0 parameters
    const params = new URLSearchParams(window.location.search);
    const hasAuthParams = params.has('code') && params.has('state');
    
    if (hasAuthParams) {
      // This is a real Auth0 callback, let's try to extract user info from the URL
      setMessage('Auth0 callback detected, attempting to bypass...');
      
      // Create a mock user
      const mockUser = {
        name: 'Authenticated User',
        email: 'user@example.com',
        picture: '',
        sub: 'auth0|user123',
        given_name: 'Authenticated',
        family_name: 'User',
        nickname: 'user'
      };
      
      // Store mock authentication data
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', 'mock_token_' + Date.now());
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      // Redirect to home
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } else {
      // Not a real Auth0 callback, just redirect
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      bgcolor: '#1a1a1a',
      color: 'white'
    }}>
      <Typography variant="h6">{message}</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => navigate('/', { replace: true })}
      >
        Return to Home
      </Button>
    </Box>
  );
};

// Custom Auth0 provider wrapper to handle navigation
const Auth0ProviderWithNavigate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  // This callback is called after Auth0 has processed the authentication result
  // We don't need to do anything here because our Auth0Callback component handles the redirect
  const onRedirectCallback = (appState: any) => {
    console.log('Auth0 Redirect Callback:', appState);
    // The Auth0Callback component will handle the redirect
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || import.meta.env.AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useCookiesForTransactions={true}
      skipRedirectCallback={false} // Let Auth0 process the callback
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};

// App root component
export default function App() {
  // Check for stored authentication on app load
  useEffect(() => {
    const checkStoredAuth = () => {
      const storedUser = localStorage.getItem('auth_user');
      const storedToken = localStorage.getItem('auth_token');
      const storedTimestamp = localStorage.getItem('auth_timestamp');
      
      if (storedUser && storedToken && storedTimestamp) {
        try {
          // Check if token is not expired (24 hours validity)
          const timestamp = parseInt(storedTimestamp, 10);
          const now = Date.now();
          const tokenAge = now - timestamp;
          const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (tokenAge <= tokenMaxAge) {
            console.log('Found valid stored authentication on app load');
          } else {
            console.log('Stored authentication is expired, clearing');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_timestamp');
          }
        } catch (e) {
          console.error('Error checking stored authentication:', e);
        }
      }
    };
    
    checkStoredAuth();
  }, []);

  return (
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <PhotoProvider>
              <PlaceProvider>
                <POIProvider>
                  <Routes>
                    {/* Use the original Auth0Callback component */}
                    <Route path="/callback" element={<Auth0Callback />} />
                    {/* Make landing page the home page */}
                    <Route path="/" element={<LandingPage />} />
                    {/* Move the map view to /editor route */}
                    <Route path="/editor" element={
                      <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
                        <MapView />
                      </Box>
                    } />
                    {/* Presentation routes with different layout */}
                    <Route path="/preview" element={<Box sx={{ 
                      height: '100vh', 
                      width: '100vw', 
                      position: 'relative',
                      bgcolor: '#1a1a1a',
                      color: 'white'
                    }}>
                      <Outlet />
                    </Box>}>
                      <Route path="route/:id" element={<RoutePresentation />} />
                    </Route>
                  </Routes>
                </POIProvider>
              </PlaceProvider>
            </PhotoProvider>
          </AuthProvider>
        </ThemeProvider>
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  );
}
