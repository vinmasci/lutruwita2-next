import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import MapView from './features/map/components/MapView/MapView';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <MapView />
      </div>
    </ThemeProvider>
  )
}
