import React, { useEffect, useRef, useState } from 'react';
import './PlacePOILayer.css';
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

export const PlacePOILayer: React.FC = () => {
  const { map, isPoiPlacementMode } = useMapContext();
  const { pois } = usePOIContext();
  const { places, updatePlace } = usePlaceContext();
  const markersRef = useRef<MarkerRef[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<PlaceLabel | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const isDrawerOpen = selectedPlace !== null;
  const isStyleLoaded = useMapStyle(map);

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

  // Clear selected place when POI placement mode changes
  useEffect(() => {
    setSelectedPlace(null);
  }, [isPoiPlacementMode]);

  // Setup highlight layer
  useEffect(() => {
    if (!map || !isStyleLoaded) return;

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

      // Show highlight when in POI placement mode and hovering over a place,
      // or when hovering over a place that has POIs
      const hasData = place && (
        isPoiPlacementMode || 
        pois.some(poi => 
          poi.position.lng === place.coordinates[0] && 
          poi.position.lat === place.coordinates[1]
        )
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
      const hasPOIs = pois.some(poi => 
        poi.position.lng === place.coordinates[0] && 
        poi.position.lat === place.coordinates[1]
      );

      if (!hasPOIs && !isPoiPlacementMode) return;

      // Get place data if it exists, or create and save new place
      const placeData = places[place.id] || {
        id: place.id,
        name: place.name,
        coordinates: place.coordinates,
        description: '',
        photos: []
      };

      // If this is a new place, save it first
      if (!places[place.id]) {
        await updatePlace(place.id, placeData);
      }

      setSelectedPlace(placeData);
    };

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

      // Add event listeners
      map.on('mousemove', handleMouseMove);
      map.on('click', handleClick);
    } catch (error) {
      console.error('[PlacePOILayer] Error setting up layer:', error);
    }

    return () => {
      if (map.getStyle()) {
        try {
          map.off('mousemove', handleMouseMove);
          map.off('click', handleClick);
          if (map.getLayer(HIGHLIGHT_LAYER)) {
            map.removeLayer(HIGHLIGHT_LAYER);
          }
          if (map.getSource(HIGHLIGHT_SOURCE)) {
            map.removeSource(HIGHLIGHT_SOURCE);
          }
          map.getCanvas().style.cursor = '';
        } catch (error) {
          console.error('[PlacePOILayer] Error cleaning up:', error);
        }
      }
    };
  }, [map, isStyleLoaded, isPoiPlacementMode, places, pois]);

  // Handle POI markers
  useEffect(() => {
    if (!map || !isStyleLoaded || !document.querySelector('[class*="fa-"]')) {
      // Wait for Font Awesome to load
      const checkFontAwesome = setInterval(() => {
        if (document.querySelector('[class*="fa-"]')) {
          clearInterval(checkFontAwesome);
          setZoom(map?.getZoom() || null); // Trigger re-render
        }
      }, 100);
      return () => clearInterval(checkFontAwesome);
    }

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    // Group POIs by coordinates
    const poiGroups = pois.reduce<Record<string, typeof pois>>((acc, poi) => {
      const key = `${poi.position.lng},${poi.position.lat}`;
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

      const positions = calculatePOIPositions(
        {
          id: coordKey,
          name: locationPois[0].name,
          coordinates: [lng, lat]
        },
        locationPois.length,
        {
          iconSize: 16,
          spacing: 5.5,
          maxPerRow: 3,
          baseOffset
        }
      );

      locationPois.forEach((poi, index) => {
        const position = positions[index];
        if (!position) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'place-poi-marker';
        const category = POI_CATEGORIES[poi.category as POICategory];
        const backgroundColor = poi.style?.color || category.color;
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.backgroundColor = backgroundColor;
        el.style.borderRadius = '100%';
        el.style.cursor = 'pointer';
        el.innerHTML = `<i class="poi-icon ${ICON_PATHS[poi.icon]}" style="color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"></i>`;
        
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
    });

    return () => {
      // Clear interval if it exists
      if (!document.querySelector('[class*="fa-"]')) {
        return;
      }
      // Clean up markers
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
