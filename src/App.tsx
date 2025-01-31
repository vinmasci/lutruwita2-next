import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';
import { PhotoProvider } from './features/photo/context/PhotoContext';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <PhotoProvider>
        <div className="app">
          <MapView />
        </div>
      </PhotoProvider>
    </ThemeProvider>
  )
}
