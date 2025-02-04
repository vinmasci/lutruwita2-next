import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { usePlaceContext } from '../../../place/context/PlaceContext';
import { calculatePOIPositions, getPlaceLabelAtPoint } from '../../utils/placeDetection';
import { ICON_PATHS } from '../../constants/icon-paths';
import { PlaceNamePOI, POI_CATEGORIES } from '../../types/poi.types';
import { PlaceLabel } from '../../utils/placeDetection';
import { PlacePOIDetailsDrawer } from '../POIDetailsDrawer';
import { Place } from '../../../place/types/place.types';

const HIGHLIGHT_SOURCE = 'place-highlight-source';
const HIGHLIGHT_LAYER = 'place-highlight-layer';

interface MarkerRef {
  marker: mapboxgl.Marker;
  poiId: string;
}

export const PlacePOILayer: React.FC = () => {
  const { map, isPoiPlacementMode } = useMapContext();
  const { pois } = usePOIContext();
  const { places, updatePlace } = usePlaceContext();
  const markersRef = useRef<MarkerRef[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<PlaceLabel | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const isDrawerOpen = selectedPlace !== null;

  // Handle zoom changes
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setZoom(map.getZoom());
    };

    map.on('zoom', handleZoom);
    handleZoom(); // Set initial zoom

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

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

    // Handle mouse move and click for place labels
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

      // Show highlight only when hovering over a place that has POIs
      const hasData = place && pois.some(
        (poi): poi is PlaceNamePOI => 
          poi.type === 'place' && 
          poi.placeId === place.id
      );

      map.setLayoutProperty(
        HIGHLIGHT_LAYER,
        'visibility',
        hasData ? 'visible' : 'none'
      );

      // Update cursor
      map.getCanvas().style.cursor = hasData ? 'pointer' : '';
    };

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      if (!place) return;

      // Only handle click if place has POIs
      const hasPOIs = pois.some(
        (poi): poi is PlaceNamePOI => 
          poi.type === 'place' && 
          poi.placeId === place.id
      );

      if (!hasPOIs) return;

      // Get place data if it exists, or create and save new place
      const placeData = places[place.id] || {
        id: place.id,
        name: place.name,
        coordinates: place.coordinates,
        description: '',
        photos: [],
        updatedAt: new Date().toISOString()
      };

      // If this is a new place, save it first
      if (!places[place.id]) {
        await updatePlace(place.id, placeData);
      }

      setSelectedPlace(placeData);
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      if (map.getLayer(HIGHLIGHT_LAYER)) {
        map.removeLayer(HIGHLIGHT_LAYER);
      }
      if (map.getSource(HIGHLIGHT_SOURCE)) {
        map.removeSource(HIGHLIGHT_SOURCE);
      }
      map.getCanvas().style.cursor = '';
    };
  }, [map, isPoiPlacementMode, places]);

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

    // Get current zoom level
    const currentZoom = map.getZoom();

    // Only show markers if zoom level is less than 12
    if (currentZoom <= 9) {
      return;
    }

    // Create markers for each place's POIs
    Object.entries(poiGroups).forEach(([placeId, pois]) => {
      // Adjust baseOffset based on zoom level
      const baseOffset = currentZoom <= 8.06 ? -15 : 9; // Move icons up by 10px when zoomed out

      const positions = calculatePOIPositions(
        {
          id: placeId,
          name: pois[0].name,
          coordinates: [pois[0].position.lng, pois[0].position.lat]
        },
        pois.length,
        {
          iconSize: 16,
          spacing: 5.5,
          maxPerRow: 3,
          baseOffset
        }
      );

      pois.forEach((poi, index) => {
        const position = positions[index];
        if (!position) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'place-poi-marker';
        const category = POI_CATEGORIES[poi.category];
        const backgroundColor = poi.style?.color || category.color;
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `<i class="poi-icon ${ICON_PATHS[poi.icon]}" style="color: white; font-size: 12px;"></i>`;
        
        // Add click handler to open drawer
        el.addEventListener('click', async () => {
          const placeData = places[placeId] || {
            id: placeId,
            name: poi.name,
            coordinates: [poi.position.lng, poi.position.lat],
            description: '',
            photos: [],
            updatedAt: new Date().toISOString()
          };

          // If this is a new place, save it first
          if (!places[placeId]) {
            await updatePlace(placeId, placeData);
          }

          setSelectedPlace(placeData);
        });

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
  }, [map, pois, zoom, places]); // Add places to dependencies

  return (
    <PlacePOIDetailsDrawer
      isOpen={isDrawerOpen}
      onClose={() => setSelectedPlace(null)}
      placeId={selectedPlace?.id || null}
      placeName={selectedPlace?.name || ''}
      description={selectedPlace?.description}
      photos={selectedPlace?.photos}
    />
  );
};

export default PlacePOILayer;
