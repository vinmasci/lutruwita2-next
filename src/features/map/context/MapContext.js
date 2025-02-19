import { createContext, useContext } from 'react';
const MapContext = createContext({
    dragPreview: null,
    setDragPreview: () => { },
    map: null,
    isMapReady: false,
    isInitializing: true,
    hoverCoordinates: null,
    setHoverCoordinates: () => { },
    onPoiPlacementClick: undefined,
    setPoiPlacementClick: () => { },
    poiPlacementMode: false,
    setPoiPlacementMode: () => { }
});
export const MapProvider = MapContext.Provider;
export function useMapContext() {
    return useContext(MapContext);
}
