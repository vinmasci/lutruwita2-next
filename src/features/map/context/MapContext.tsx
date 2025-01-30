import { createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';

type MapContextType = {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
  hoverCoordinates: [number, number] | null;
  setHoverCoordinates: (coords: [number, number] | null) => void;
  isPoiPlacementMode: boolean;
  setPoiPlacementMode: (mode: boolean) => void;
  onPoiPlacementClick?: (coords: [number, number]) => void;
  setPoiPlacementClick: (handler: ((coords: [number, number]) => void) | undefined) => void;
};

const MapContext = createContext<MapContextType>({
  map: null,
  isMapReady: false,
  hoverCoordinates: null,
  setHoverCoordinates: () => {},
  isPoiPlacementMode: false,
  setPoiPlacementMode: () => {},
  onPoiPlacementClick: undefined,
  setPoiPlacementClick: () => {}
});

export const MapProvider = MapContext.Provider;

export function useMapContext() {
  return useContext(MapContext);
}
