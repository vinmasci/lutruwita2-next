import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { useMapStyle } from '../../../map/hooks/useMapStyle';
import { usePlaceContext } from '../../../place/context/PlaceContext';
import { calculatePOIPositions, getPlaceLabelAtPoint } from '../../utils/placeDetection';
import { ICON_PATHS } from '../../constants/icon-paths';
import { PlaceNamePOI, POI_CATEGORIES, POICategory } from '../../types/poi.types';
import { PlaceLabel } from '../../utils/placeDetection';
import { PlacePOIDetailsDrawer } from '../POIDetailsDrawer';
import { Place } from '../../../place/types/place.types';

const HIGHLIGHT_SOURCE = 'place-highlight-source';
const HIGHLIGHT_LAYER = 'place-highlight-layer';

interface MarkerRef {
  marker: mapboxgl.Marker;
  poiId: string;
}

interface Props {}

export const PlacePOILayer: React.FC<Props> = () => {
  const { map } = useMapContext();
  const { pois, poiMode } = usePOIContext();
  const { places, updatePlace } = usePlaceContext();
  const markersRef = useRef<MarkerRef[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<PlaceLabel | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const isDrawerOpen = selectedPlace !== null;
  // Custom hook to track map style loading
  const isStyleLoaded = useMapStyle(map);
  const [isLayerReady, setIsLayerReady] = useState(false);

  // Effect to track when both map and style are ready
  useEffect(() => {
      if (!map || !isStyleLoaded) return;

      // Wait for layers to be fully loaded
      const checkLayers = () => {
        const settlementLayers = [
          'settlement-major-label',
          'settlement-minor-label',
          'settlement-subdivision-label'
        ];
        
        const hasSettlementLayers = settlementLayers.every(layer => map.getLayer(layer));

        if (hasSettlementLayers) {
          setIsLayerReady(true);
        } else {
          setTimeout(checkLayers, 100);
        }
      };

    // Start checking for layers
    checkLayers();
  }, [map, isStyleLoaded, poiMode]);

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

  // Clear selected place when POI mode changes
  useEffect(() => {
    setSelectedPlace(null);
  }, [poiMode]);

  // Setup highlight layer - now dependent on isLayerReady
  useEffect(() => {
    if (!map || !isLayerReady) return;

    try {
      // Safe cleanup of existing layers/sources
      if (map.getStyle() && map.getLayer(HIGHLIGHT_LAYER)) {
        map.removeLayer(HIGHLIGHT_LAYER);
      }
      if (map.getStyle() && map.getSource(HIGHLIGHT_SOURCE)) {
        map.removeSource(HIGHLIGHT_SOURCE);
      }
    
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
      layout: {
        'visibility': 'none'
      },
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 20,  // Larger at zoom 10
          15, 30   // Larger at zoom 15
        ],
        'circle-color': '#ffffff',
        'circle-opacity': 0.3,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8
      }
    });

      const handleMouseMove = (e: mapboxgl.MapMouseEvent & { point: mapboxgl.Point }) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      
      if (place?.name !== hoveredPlace?.name) {
        setHoveredPlace(place);
      }
      
      // Update highlight
      const source = map.getSource(HIGHLIGHT_SOURCE) as mapboxgl.GeoJSONSource;
      if (source) {
        const coordinates = place?.coordinates || [0, 0];
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {}
        });
      }

      // Show highlight whenever we're in place mode and hovering over a place
      const hasData = place && poiMode === 'place';
      map.setLayoutProperty(
        HIGHLIGHT_LAYER,
        'visibility',
        hasData ? 'visible' : 'none'
      );

      // Update cursor
      map.getCanvas().style.cursor = hasData ? 'pointer' : '';
    };

      const handleClick = async (e: mapboxgl.MapMouseEvent & { point: mapboxgl.Point }) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      if (!place) return;

      // Check if place already has POIs
      const hasPOIs = pois.some(poi => 
        poi.coordinates[0] === place.coordinates[0] && 
        poi.coordinates[1] === place.coordinates[1]
      );

      // Get place data if it exists, or create and save new place
      const placeData = places[place.id] || {
        id: place.id,
        name: place.name,
        coordinates: place.coordinates,
        description: '',
        photos: []
      };

      // Only show details drawer if we're not in place mode or if the place has POIs
      if (poiMode !== 'place' || hasPOIs) {
        // If this is a new place, save it first
        if (!places[place.id]) {
          await updatePlace(place.id, placeData);
        }
        setSelectedPlace(placeData);
      }
    };

      // Add event listeners
      map.on('mousemove', handleMouseMove);
      map.on('click', handleClick);

      return () => {
        if (!map || !map.getStyle()) return;
        
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
    } catch (error) {
      console.error('[PlacePOILayer] Error setting up layer:', error);
      return () => {};
    }
  }, [map, isStyleLoaded, poiMode, places, pois]);

  // Handle POI markers - now dependent on isLayerReady
  useEffect(() => {
    if (!map || !isLayerReady) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    // Group only place POIs by coordinates
    const poiGroups = pois
      .filter((poi): poi is PlaceNamePOI => poi.type === 'place') // Only include place POIs
      .reduce<Record<string, PlaceNamePOI[]>>((acc: Record<string, PlaceNamePOI[]>, poi: PlaceNamePOI) => {
        const key = `${poi.coordinates[0]},${poi.coordinates[1]}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(poi);
        return acc;
      }, {});

    // Get current zoom level
    const currentZoom = map.getZoom();

    // Only show markers if zoom level is less than 12
    if (currentZoom <= 9) {
      return;
    }

    // Create markers for each location's POIs
    Object.entries(poiGroups).forEach(([coordKey, locationPois]) => {
      const [lng, lat] = coordKey.split(',').map(Number);
      // Adjust baseOffset based on zoom level
      const baseOffset = currentZoom <= 8.06 ? -15 : 9;

      // Calculate positions for all icons including plus badge if needed
      const totalPositions = locationPois.length > 3 ? 4 : locationPois.length;
      const positions = calculatePOIPositions(
        {
          id: coordKey,
          name: locationPois[0].name,
          coordinates: [lng, lat]
        },
        totalPositions,
        {
          iconSize: 16,
          spacing: 5.5,
          maxPerRow: 4, // Always use 4 to ensure space for plus badge
          baseOffset
        }
      );

      // Only show first 3 POIs
      const visiblePois = locationPois.slice(0, 3);
      const remainingCount = locationPois.length - 3;

      // Create markers for visible POIs
      visiblePois.forEach((poi, index) => {
        const position = positions[index];
        if (!position) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'mapboxgl-marker place-poi-marker';
        
        // Create inner container for marker content
        const container = document.createElement('div');
        container.className = 'place-poi-marker';
        
        // Create icon element
        const icon = document.createElement('i');
        icon.className = `poi-icon ${ICON_PATHS[poi.icon]}`;
        
        // Assemble the marker
        container.appendChild(icon);
        el.appendChild(container);
        
        // Add click handler to open drawer
        el.addEventListener('click', async () => {
          const placeData: Place = {
            id: coordKey,
            name: poi.name,
            coordinates: [lng, lat] as [number, number],
            description: '',
            photos: []
          };

          // Save place data
          await updatePlace(coordKey, placeData);

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

      // Add plus badge if there are more POIs
      if (remainingCount > 0) {
        const plusPosition = positions[3]; // Plus badge will always be at position 3
        if (plusPosition) {
          const el = document.createElement('div');
          el.className = 'mapboxgl-marker place-poi-marker';
          
          const container = document.createElement('div');
          container.className = 'place-poi-marker plus-badge';
          container.textContent = `+${remainingCount}`;
          
          el.appendChild(container);
          
          // Add click handler to open drawer
          el.addEventListener('click', async () => {
            const placeData: Place = {
              id: coordKey,
              name: locationPois[0].name,
              coordinates: [lng, lat] as [number, number],
              description: '',
              photos: []
            };

            // Save place data
            await updatePlace(coordKey, placeData);

            setSelectedPlace(placeData);
          });

          // Create and add marker
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
            offset: plusPosition.offset,
            rotation: 0,
            rotationAlignment: 'viewport',
            pitchAlignment: 'viewport'
          })
            .setLngLat(plusPosition.coordinates)
            .addTo(map);

          markersRef.current.push({ marker, poiId: 'plus-badge' });
        }
      }
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
    };
  }, [map, isStyleLoaded, pois, zoom, places]);

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
