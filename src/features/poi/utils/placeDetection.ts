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
    console.debug('[placeDetection] Available layers:', {
      required: requiredLayers,
      found: availableLayers,
      allLayers: map.getStyle()?.layers?.map(l => l.id)
    });

    if (availableLayers.length === 0) {
      console.debug('[placeDetection] No settlement layers found in map style');
      return null;
    }

    // Query map features at point
    console.debug('[placeDetection] Querying features at point:', {
      point,
      availableLayers,
      zoom: map.getZoom(),
      center: map.getCenter(),
      bounds: map.getBounds(),
      pixelRatio: window.devicePixelRatio || 1
    });

    const features = map.queryRenderedFeatures(point, {
      layers: availableLayers
    });
    
    console.debug('[placeDetection] Query result:', { 
      point,
      featureCount: features.length,
      queriedLayers: availableLayers,
      features: features.map(f => ({
        id: f.id,
        type: f.type,
        layer: f.layer?.id,
        layerType: f.layer?.type,
        source: f.source,
        sourceLayer: f.sourceLayer,
        properties: f.properties,
        geometry: f.geometry,
        state: {
          isVisible: map.getLayoutProperty(f.layer?.id || '', 'visibility') !== 'none',
          zoom: map.getZoom()
        }
      }))
    });
    
    if (!features.length) {
      console.debug('[placeDetection] No features found at point');
      return null;
    }
  
    const place = features[0];
    
    if (!place.properties?.name || !place.geometry) {
      console.debug('[placeDetection] Invalid place:', { 
        hasName: !!place.properties?.name,
        hasGeometry: !!place.geometry,
        properties: place.properties,
        geometry: place.geometry
      });
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

    console.debug('[placeDetection] Found place:', placeLabel);
    return placeLabel;
  } catch (error) {
    console.error('[placeDetection] Error querying place:', error);
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
                   ((Math.min(poiCount, config.maxPerRow) * (config.iconSize + config.spacing)) / 2) + 10; // Added 30px to move right
const yOffset = config.baseOffset + (row * (config.iconSize + config.spacing));
    
positions.push({
  coordinates: place.coordinates,
  offset: [xOffset, -yOffset] // Negative y to move up
});
  }
  
  return positions;
};
