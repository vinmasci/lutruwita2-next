import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { POIProvider } from './features/poi/context/POIContext';
import { ProcessingProvider } from './features/map/context';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AuthModalProvider } from './features/auth/context/AuthModalContext.jsx';
import { LandingPage } from './features/presentation/components/LandingPage/LandingPage';
import { RoutePresentation } from './features/presentation/components/RoutePresentation/RoutePresentation';
import PrivacyPolicy from './components/PrivacyPolicy/PrivacyPolicy';

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
      onRedirectCallback={(appState) => {
        console.log('Auth0 Redirect Callback:', appState);
        // After login, redirect to editor page
        window.history.replaceState({}, document.title, '/editor');
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Privacy policy outside all providers */}
          <Route path="/privacy-policy" element={
            <ThemeProvider theme={theme}>
              <PrivacyPolicy />
            </ThemeProvider>
          } />
          
          {/* All other routes with full provider stack */}
          <Route path="*" element={
            <AuthProvider>
              <AuthModalProvider>
                <ThemeProvider theme={theme}>
                  <ProcessingProvider>
                    <PhotoProvider>
                      <PlaceProvider>
                        <POIProvider>
                          <Routes>
                            <Route path="/callback" element={<Auth0Callback />} />
                            <Route path="/" element={<LandingPage />} />
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
                          </Routes>
                        </POIProvider>
                      </PlaceProvider>
                    </PhotoProvider>
                  </ProcessingProvider>
                </ThemeProvider>
              </AuthModalProvider>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </Auth0Provider>
  );
}
