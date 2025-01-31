import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { calculatePOIPositions } from '../../utils/placeDetection';
import { PlaceNamePOI } from '../../types/poi.types';

interface MarkerRef {
  marker: mapboxgl.Marker;
  poiId: string;
}

export const PlacePOILayer: React.FC = () => {
  const { map } = useMapContext();
  const { pois } = usePOIContext();
  const markersRef = useRef<MarkerRef[]>([]);

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
          iconSize: 24,
          spacing: 4,
          maxPerRow: 6,
          baseOffset: 20
        }
      );

      pois.forEach((poi, index) => {
        const position = positions[index];
        if (!position) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'place-poi-marker';
        el.innerHTML = `<i class="poi-icon lucide-${poi.icon}" style="color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"></i>`;

        // Create and add marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          offset: position.offset
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
