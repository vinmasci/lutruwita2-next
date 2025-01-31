import mapboxgl from 'mapbox-gl';

export interface PlaceLabel {
  id: string;
  name: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
}

export const getPlaceLabelAtPoint = (
  map: mapboxgl.Map,
  point: mapboxgl.Point
): PlaceLabel | null => {
  // Query map features at point
  const features = map.queryRenderedFeatures(point, {
    layers: ['settlement-label'] // Mapbox layer for place names (cities, towns, villages)
  });
  
  if (!features.length) return null;
  
  const place = features[0];
  
  if (!place.properties?.name || !place.geometry) return null;
  
  return {
    id: place.id as string,
    name: place.properties.name as string,
    coordinates: place.geometry.type === 'Point' 
      ? place.geometry.coordinates as [number, number]
      : [0, 0], // Fallback coordinates if geometry is not a point
    bbox: place.bbox as [number, number, number, number] | undefined
  };
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
                   ((Math.min(poiCount, config.maxPerRow) * (config.iconSize + config.spacing)) / 2);
    const yOffset = config.baseOffset + (row * (config.iconSize + config.spacing));
    
    positions.push({
      coordinates: place.coordinates,
      offset: [xOffset, -yOffset] // Negative y to move up
    });
  }
  
  return positions;
};
