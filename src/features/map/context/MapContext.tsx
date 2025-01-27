import { createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';

type MapContextType = {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
};

const MapContext = createContext<MapContextType>({
  map: null,
  isMapReady: false
});

export const MapProvider = MapContext.Provider;

export function useMapContext() {
  return useContext(MapContext);
}
