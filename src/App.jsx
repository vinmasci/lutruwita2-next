import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { POIProvider } from './features/poi/context/POIContext';
import { ProcessingProvider } from './features/map/context';
import { AutoSaveProvider } from './context/AutoSaveContext';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AuthModalProvider } from './features/auth/context/AuthModalContext.jsx';
import { FirebaseLandingPage } from './features/presentation/components/LandingPage/FirebaseLandingPage';
import { RoutePresentation } from './features/presentation/components/RoutePresentation/RoutePresentation';
import MyRoutesView from './components/MyRoutesView/MyRoutesView';
import FirebaseRouteTest from './components/FirebaseRouteTest';

// Make React available globally for components that use React.createElement
window.React = React;

export default function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: 'https://dev-8jmwfh4hugvdjwh8.au.auth0.com/api/v2/',
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensWithPopup={true}
      onRedirectCallback={(appState) => {
        console.log('Auth0 Redirect Callback:', appState);
        // After login, redirect to editor page
        window.history.replaceState({}, document.title, '/editor');
      }}
    >
      {/* Add our custom AuthProvider to synchronize authentication state */}
      <AuthProvider>
        {/* Add AuthModalProvider for authentication modals */}
        <AuthModalProvider>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <ProcessingProvider>
                  <AutoSaveProvider>
                    <PhotoProvider>
                      <PlaceProvider>
                        <POIProvider>
                          <Routes>
                          <Route path="/callback" element={<Auth0Callback />} />
                          <Route path="/" element={<FirebaseLandingPage />} />
                          <Route
                            path="/editor"
                            element={
                              <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
                                <MapView />
                              </Box>
                            }
                          />
                          <Route
                            path="/preview"
                            element={
                              <Box
                                sx={{
                                  height: '100vh',
                                  width: '100vw',
                                  position: 'relative',
                                  bgcolor: '#1a1a1a',
                                  color: 'white'
                                }}
                              >
                                <Outlet />
                              </Box>
                            }
                          >
                            <Route path="route/:id" element={<RoutePresentation />} />
                          </Route>
                          <Route path="/embed/:stateId" element={
                            <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
                              <React.Suspense fallback={<div>Loading...</div>}>
                                {/* Lazy load the embed view */}
                                {React.createElement(React.lazy(() => import('./features/presentation/components/EmbedMapView/EmbedMapView')))}
                              </React.Suspense>
                            </Box>
                          } />
                          
                          {/* New route for Firebase-first embed */}
                          <Route path="/embed-firebase/:stateId" element={
                            <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
                              <React.Suspense fallback={<div>Loading...</div>}>
                                {/* Lazy load the Firebase embed view */}
                                {React.createElement(React.lazy(() => import('./features/presentation/components/FirebaseEmbedMapView')))}
                              </React.Suspense>
                            </Box>
                          } />
                          
                          {/* Route for viewing saved routes */}
                          <Route path="/my-routes" element={
                            <Box sx={{ 
                              minHeight: '100vh', 
                              width: '100vw', 
                              position: 'relative',
                              bgcolor: '#f5f5f5'
                            }}>
                              <MyRoutesView />
                            </Box>
                          } />
                          
                          {/* Route for editing a saved route */}
                          <Route path="/edit/:routeId" element={
                            <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
                              <MapView />
                            </Box>
                          } />
                          
                          {/* Test route for Firebase route loading */}
                          <Route path="/test-firebase-route/:id" element={
                            <Box sx={{ 
                              minHeight: '100vh', 
                              width: '100vw', 
                              position: 'relative',
                              bgcolor: '#f5f5f5'
                            }}>
                              <FirebaseRouteTest />
                            </Box>
                          } />
                          
                          {/* Direct route for route presentation (without /preview prefix) */}
                          <Route path="/route/:id" element={
                            <Box
                              sx={{
                                height: '100vh',
                                width: '100vw',
                                position: 'relative',
                                bgcolor: '#1a1a1a',
                                color: 'white'
                              }}
                            >
                              <RoutePresentation />
                            </Box>
                          } />
                        </Routes>
                        </POIProvider>
                      </PlaceProvider>
                    </PhotoProvider>
                  </AutoSaveProvider>
                </ProcessingProvider>
              </LocalizationProvider>
            </ThemeProvider>
          </BrowserRouter>
        </AuthModalProvider>
      </AuthProvider>
    </Auth0Provider>
  );
}
