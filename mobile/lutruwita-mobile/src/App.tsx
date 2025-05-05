import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import { RouteProvider } from './context/RouteContext';
import { SavedRoutesProvider } from './context/FirebaseSavedRoutesContext';
import { OfflineMapsProvider } from './context/OfflineMapsContext';
import { RouteSpecificOfflineMapsProvider } from './context/RouteSpecificOfflineMapsContext';
import Navigation from './navigation';

// Import Firebase service for initialization
import './services/firebaseService';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MapProvider>
            <RouteProvider>
              <SavedRoutesProvider>
                <OfflineMapsProvider>
                  <RouteSpecificOfflineMapsProvider>
                    <Navigation />
                  </RouteSpecificOfflineMapsProvider>
                </OfflineMapsProvider>
              </SavedRoutesProvider>
            </RouteProvider>
          </MapProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
