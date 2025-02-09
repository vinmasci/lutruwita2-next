import { createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import { POICategory, POIIconName } from '../../poi/types/poi.types';

type DragPreviewType = {
  icon: POIIconName;
  category: POICategory;
} | null;

type MapContextType = {
  dragPreview: DragPreviewType;
  setDragPreview: (preview: DragPreviewType) => void;
  map: mapboxgl.Map | null;
  isMapReady: boolean;
  isInitializing: boolean;
  hoverCoordinates: [number, number] | null;
  setHoverCoordinates: (coords: [number, number] | null) => void;
  onPoiPlacementClick?: (coords: [number, number]) => void;
  setPoiPlacementClick: (handler: ((coords: [number, number]) => void) | undefined) => void;
  poiPlacementMode: boolean;
  setPoiPlacementMode: (mode: boolean) => void;
};

const MapContext = createContext<MapContextType>({
  dragPreview: null,
  setDragPreview: () => {},
  map: null,
  isMapReady: false,
  isInitializing: true,
  hoverCoordinates: null,
  setHoverCoordinates: () => {},
  onPoiPlacementClick: undefined,
  setPoiPlacementClick: () => {},
  poiPlacementMode: false,
  setPoiPlacementMode: () => {}
});

export const MapProvider = MapContext.Provider;

export function useMapContext() {
  return useContext(MapContext);
}
