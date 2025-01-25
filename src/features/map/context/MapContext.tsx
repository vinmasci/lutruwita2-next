import { createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';

type MapContextType = {
  map: mapboxgl.Map | null;
};

const MapContext = createContext<MapContextType>({
  map: null
});

export const MapProvider = MapContext.Provider;

export function useMapContext() {
  return useContext(MapContext);
}
