import mapboxgl from 'mapbox-gl';
import { POIIconName } from '../types/poi.types';

export interface PlaceLabel {
  id: string;
  name: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  icons?: POIIconName[];
}

export const getPlaceLabelAtPoint = (
  map: mapboxgl.Map,
  point: mapboxgl.Point
): PlaceLabel | null => {
  try {
    // First check if the required layers exist
    const requiredLayers = [
      'settlement-major-label',  // Cities
      'settlement-minor-label',  // Towns
      'settlement-subdivision-label' // Suburbs
    ];

    const availableLayers = requiredLayers.filter(layer => map.getLayer(layer));
    if (availableLayers.length === 0) {
      return null;
    }

    const features = map.queryRenderedFeatures(point, {
      layers: availableLayers
    });
    
    if (!features.length) {
      return null;
    }
  
    const place = features[0];
    
    if (!place.properties?.name || !place.geometry) {
      return null;
    }
  
    const coordinates: [number, number] = place.geometry.type === 'Point' 
      ? [
          place.geometry.coordinates[0] as number,
          place.geometry.coordinates[1] as number
        ]
      : [0, 0]; // Fallback coordinates if geometry is not a point

    const placeLabel = {
      id: place.id as string,
      name: place.properties.name as string,
      coordinates,
      bbox: place.bbox as [number, number, number, number] | undefined
    };

    return placeLabel;
  } catch (error) {
    console.error('[placeDetection] Error:', error);
    return null;
  }
};

export const calculatePOIPositions = (
  place: PlaceLabel,
  poiCount: number,
  config: {
    iconSize: number;
    spacing: number;
    maxPerRow: number;
    baseOffset: number;
  }
): Array<{ coordinates: [number, number]; offset: [number, number] }> => {
  const positions: Array<{ coordinates: [number, number]; offset: [number, number] }> = [];
  
  for (let i = 0; i < poiCount; i++) {
    const row = Math.floor(i / config.maxPerRow);
    const col = i % config.maxPerRow;
    
    // Calculate offsets to center the POIs above the place name
const xOffset = (col * (config.iconSize + config.spacing)) - 
                   ((Math.min(poiCount, config.maxPerRow) * (config.iconSize + config.spacing)) / 3);
const yOffset = config.baseOffset + (row * (config.iconSize + config.spacing));
    
positions.push({
  coordinates: place.coordinates,
  offset: [xOffset, -yOffset] // Negative y to move up
});
  }
  
  return positions;
};
