import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme';
import { MapProvider } from './context/MapContext';
import { RouteProvider } from './context/RouteContext';
import Navigation from './navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MapProvider>
          <RouteProvider>
            <Navigation />
          </RouteProvider>
        </MapProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
