import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { POIProvider } from './features/poi/context/POIContext';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';
import { Auth0Provider } from '@auth0/auth0-react';
import { LandingPage } from './features/presentation/components/LandingPage/LandingPage';
import { RoutePresentation } from './features/presentation/components/RoutePresentation/RoutePresentation';
export default function App() {
    return (_jsx(Auth0Provider, { domain: import.meta.env.VITE_AUTH0_DOMAIN, clientId: import.meta.env.VITE_AUTH0_CLIENT_ID, authorizationParams: {
            redirect_uri: `${window.location.origin}/callback`,
            audience: 'https://dev-8jmwfh4hugvdjwh8.au.auth0.com/api/v2/',
            scope: 'openid profile email offline_access'
        }, cacheLocation: "localstorage", useRefreshTokens: true, onRedirectCallback: (appState) => {
            console.log('Auth0 Redirect Callback:', appState);
            window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
        }, children: _jsx(BrowserRouter, { children: _jsx(ThemeProvider, { theme: theme, children: _jsx(PhotoProvider, { children: _jsx(PlaceProvider, { children: _jsx(POIProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/callback", element: _jsx(Auth0Callback, {}) }), _jsx(Route, { path: "/", element: _jsx(Box, { sx: { height: '100vh', width: '100vw', position: 'relative' }, children: _jsx(MapView, {}) }) }), _jsxs(Route, { path: "/preview", element: _jsx(Box, { sx: {
                                                height: '100vh',
                                                width: '100vw',
                                                position: 'relative',
                                                bgcolor: '#1a1a1a',
                                                color: 'white'
                                            }, children: _jsx(Outlet, {}) }), children: [_jsx(Route, { path: "landing", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "route/:id", element: _jsx(RoutePresentation, {}) })] })] }) }) }) }) }) }) }));
}
