import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { calculatePOIPositions, getPlaceLabelAtPoint } from '../../utils/placeDetection';
import { ICON_PATHS } from '../../constants/icon-paths';
import { PlaceNamePOI } from '../../types/poi.types';
import { PlaceLabel } from '../../utils/placeDetection';

const HIGHLIGHT_SOURCE = 'place-highlight-source';
const HIGHLIGHT_LAYER = 'place-highlight-layer';

interface MarkerRef {
  marker: mapboxgl.Marker;
  poiId: string;
}

export const PlacePOILayer: React.FC = () => {
  const { map, isPoiPlacementMode } = useMapContext();
  const { pois } = usePOIContext();
  const markersRef = useRef<MarkerRef[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<PlaceLabel | null>(null);

  // Setup highlight layer
  useEffect(() => {
    if (!map) return;

    // Add highlight source and layer
    map.addSource(HIGHLIGHT_SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        },
        properties: {}
      }
    });

    map.addLayer({
      id: HIGHLIGHT_LAYER,
      type: 'circle',
      source: HIGHLIGHT_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 10,  // Smaller at zoom 10
          15, 20   // Larger at zoom 15
        ],
        'circle-color': '#ffffff',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8
      }
    });

    // Handle mouse move for hover effect
    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      setHoveredPlace(place);
      
      // Update highlight
      const source = map.getSource(HIGHLIGHT_SOURCE) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: place?.coordinates || [0, 0]
          },
          properties: {}
        });
      }

      // Only show highlight when in POI placement mode and hovering over a place
      map.setLayoutProperty(
        HIGHLIGHT_LAYER,
        'visibility',
        isPoiPlacementMode && place ? 'visible' : 'none'
      );

      // Update cursor
      map.getCanvas().style.cursor = place ? 'pointer' : '';
    };

    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('mousemove', handleMouseMove);
      if (map.getLayer(HIGHLIGHT_LAYER)) {
        map.removeLayer(HIGHLIGHT_LAYER);
      }
      if (map.getSource(HIGHLIGHT_SOURCE)) {
        map.removeSource(HIGHLIGHT_SOURCE);
      }
      map.getCanvas().style.cursor = '';
    };
  }, [map, isPoiPlacementMode]);

  // Handle POI markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    // Group POIs by placeId
    const placePOIs = pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place');
    const poiGroups = placePOIs.reduce<Record<string, PlaceNamePOI[]>>((acc, poi) => {
      if (!acc[poi.placeId]) {
        acc[poi.placeId] = [];
      }
      acc[poi.placeId].push(poi);
      return acc;
    }, {});

    // Create markers for each place's POIs
    Object.entries(poiGroups).forEach(([placeId, pois]) => {
      const positions = calculatePOIPositions(
        {
          id: placeId,
          name: pois[0].name,
          coordinates: [pois[0].position.lng, pois[0].position.lat]
        },
        pois.length,
        {
          iconSize: 16,
          spacing: 2,
          maxPerRow: 6,
          baseOffset: -25
        }
      );

      pois.forEach((poi, index) => {
        const position = positions[index];
        if (!position) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'place-poi-marker';
        el.innerHTML = `<i class="poi-icon ${ICON_PATHS[poi.icon]}" style="color: white;"></i>`;

        // Create and add marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          offset: position.offset,
          rotation: 0,
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport'
        })
          .setLngLat(position.coordinates)
          .addTo(map);

        markersRef.current.push({ marker, poiId: poi.id });
      });
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
    };
  }, [map, pois]);

  return null;
};

export default PlacePOILayer;
