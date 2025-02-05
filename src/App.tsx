import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { POIProvider } from './features/poi/context/POIContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';
import { Auth0Provider } from '@auth0/auth0-react';

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
        window.history.replaceState(
          {},
          document.title,
          appState?.returnTo || window.location.pathname
        );
      }}
    >
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <PhotoProvider>
            <PlaceProvider>
              <POIProvider>
                <Routes>
                <Route path="/callback" element={<Auth0Callback />} />
                <Route path="/" element={
                  <div className="app">
                    <MapView />
                  </div>
                } />
                </Routes>
              </POIProvider>
            </PlaceProvider>
          </PhotoProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Auth0Provider>
  )
}
