import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth0Callback from './features/auth/components/Auth0Callback/Auth0Callback';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <PhotoProvider>
          <PlaceProvider>
            <Routes>
              <Route path="/callback" element={<Auth0Callback />} />
              <Route path="/" element={
                <div className="app">
                  <MapView />
                </div>
              } />
            </Routes>
          </PlaceProvider>
        </PhotoProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
