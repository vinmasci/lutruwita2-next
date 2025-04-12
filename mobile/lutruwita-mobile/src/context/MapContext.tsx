import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the map state interface
export interface MapState {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  bounds?: {
    ne: [number, number];
    sw: [number, number];
  };
  isLoaded: boolean;
}

// Define the map context interface
interface MapContextType {
  mapState: MapState;
  setMapState: React.Dispatch<React.SetStateAction<MapState>>;
  updateMapCenter: (center: [number, number]) => void;
  updateMapZoom: (zoom: number) => void;
  updateMapBounds: (bounds: { ne: [number, number]; sw: [number, number] }) => void;
  setMapLoaded: (loaded: boolean) => void;
}

// Default map state centered on Tasmania
const DEFAULT_MAP_STATE: MapState = {
  center: [146.8087, -41.4419], // Tasmania center coordinates
  zoom: 7,
  isLoaded: false,
};

// Create the context
const MapContext = createContext<MapContextType | undefined>(undefined);

// Map provider component
export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mapState, setMapState] = useState<MapState>(DEFAULT_MAP_STATE);

  // Update map center
  const updateMapCenter = (center: [number, number]) => {
    setMapState(prevState => ({
      ...prevState,
      center,
    }));
  };

  // Update map zoom
  const updateMapZoom = (zoom: number) => {
    setMapState(prevState => ({
      ...prevState,
      zoom,
    }));
  };

  // Update map bounds
  const updateMapBounds = (bounds: { ne: [number, number]; sw: [number, number] }) => {
    setMapState(prevState => ({
      ...prevState,
      bounds,
    }));
  };

  // Set map loaded state
  const setMapLoaded = (loaded: boolean) => {
    setMapState(prevState => ({
      ...prevState,
      isLoaded: loaded,
    }));
  };

  return (
    <MapContext.Provider
      value={{
        mapState,
        setMapState,
        updateMapCenter,
        updateMapZoom,
        updateMapBounds,
        setMapLoaded,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

// Hook to use the map context
export const useMap = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};
