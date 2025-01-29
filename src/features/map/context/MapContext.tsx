import { createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';

type MapContextType = {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
  hoverCoordinates: [number, number] | null;
  setHoverCoordinates: (coords: [number, number] | null) => void;
};

const MapContext = createContext<MapContextType>({
  map: null,
  isMapReady: false,
  hoverCoordinates: null,
  setHoverCoordinates: () => {}
});

export const MapProvider = MapContext.Provider;

export function useMapContext() {
  return useContext(MapContext);
}
