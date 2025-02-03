import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';
import { PlaceProvider } from './features/place/context/PlaceContext';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <PhotoProvider>
        <PlaceProvider>
          <div className="app">
            <MapView />
          </div>
        </PlaceProvider>
      </PhotoProvider>
    </ThemeProvider>
  )
}
