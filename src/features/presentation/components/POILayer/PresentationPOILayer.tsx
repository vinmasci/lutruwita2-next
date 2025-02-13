import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { DraggablePOI, PlaceNamePOI, POI_CATEGORIES } from '../../../poi/types/poi.types';
import { LoadedRoute } from '../../../map/types/route.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { ICON_PATHS } from '../../../poi/constants/icon-paths';
import { calculatePOIPositions } from '../../../poi/utils/placeDetection';
import './PresentationPOILayer.css';

interface PresentationPOILayerProps {
  map: mapboxgl.Map;
}

interface MarkerRef {
  marker: mapboxgl.Marker;
  poiId: string;
}

export const PresentationPOILayer: React.FC<PresentationPOILayerProps> = ({ map }) => {
  const { currentRoute } = useRouteContext();
  const markersRef = useRef<MarkerRef[]>([]);
  const placeMarkersRef = useRef<MarkerRef[]>([]);

  // Effect to handle place POIs visibility based on zoom
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      const currentZoom = map.getZoom();
      placeMarkersRef.current.forEach(({ marker }) => {
        if (currentZoom > 9) {
          marker.addTo(map);
        } else {
          marker.remove();
        }
      });
    };

    map.on('zoom', handleZoom);
    handleZoom(); // Initial check

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);
  useEffect(() => {
    // Type guard for LoadedRoute
    if (!map || !currentRoute || currentRoute._type !== 'loaded' || !currentRoute._loadedState?.pois) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const { draggable, places } = currentRoute._loadedState.pois;

    // Handle regular POIs
    draggable.forEach((poi: DraggablePOI) => {
      const el = document.createElement('div');
      el.className = 'poi-marker';
      const iconDefinition = getIconDefinition(poi.icon);
      const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[poi.category].color;
      
      // Set up marker HTML with bubble-pin style and zoom data only for regular POIs
      el.innerHTML = `
        <div class="marker-container" data-zoom="${Math.floor(map.getZoom())}">
          <div class="marker-bubble" style="background-color: ${markerColor}">
            <i class="${ICON_PATHS[poi.icon]} marker-icon"></i>
          </div>
          <div class="marker-point" style="border-top-color: ${markerColor}"></div>
        </div>
      `;

      // Create marker with viewport alignment
      const marker = new mapboxgl.Marker({
        element: el,
        draggable: false,
        rotationAlignment: 'viewport',
        pitchAlignment: 'viewport',
        anchor: 'center',
        offset: [0, -14] // Half the height of marker-bubble to center it
      })
        .setLngLat(poi.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3>${poi.name}</h3><p>${poi.description || ''}</p>`)
        )
        .addTo(map);

      markersRef.current.push({ marker, poiId: poi.id });

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        const bubble = el.querySelector('.marker-bubble') as HTMLElement;
        if (bubble) {
          bubble.style.transform = 'scale(1.1)';
          bubble.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
        }
      });

      el.addEventListener('mouseleave', () => {
        const bubble = el.querySelector('.marker-bubble') as HTMLElement;
        if (bubble) {
          bubble.style.transform = '';
          bubble.style.boxShadow = '';
        }
      });
    });

    // Create place POIs regardless of zoom level

    // Group place POIs by coordinates
    const poiGroups = places.reduce<Record<string, PlaceNamePOI[]>>((acc, poi) => {
      const key = `${poi.coordinates[0]},${poi.coordinates[1]}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(poi);
      return acc;
    }, {});

    // Create markers for each location's POIs
    Object.entries(poiGroups).forEach(([coordKey, locationPois]) => {
      const [lng, lat] = coordKey.split(',').map(Number);
      const baseOffset = 9; // Fixed offset for place POIs, just like in creation mode

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
          maxPerRow: 4,
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

        // Create marker element without any zoom-based attributes for place POIs
        const el = document.createElement('div');
        el.className = 'mapboxgl-marker place-poi-marker';
        
        const container = document.createElement('div');
        container.className = 'place-poi-marker';
        
        const icon = document.createElement('i');
        icon.className = `poi-icon ${ICON_PATHS[poi.icon]}`;
        
        container.appendChild(icon);
        el.appendChild(container);

      // Create and add marker with same configuration as creation mode
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        offset: position.offset,
        rotation: 0,
        rotationAlignment: 'viewport',
        pitchAlignment: 'viewport'
      })
          .setLngLat(position.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3>${poi.name}</h3><p>${poi.description || ''}</p>`)
          );

      if (map.getZoom() > 9) {
        marker.addTo(map);
      }

          placeMarkersRef.current.push({ marker, poiId: poi.id });
      });

      // Add plus badge if there are more POIs
      if (remainingCount > 0) {
        const plusPosition = positions[3];
        if (plusPosition) {
          // Create plus badge marker without any zoom-based attributes
          const el = document.createElement('div');
          el.className = 'mapboxgl-marker place-poi-marker';
          
          const container = document.createElement('div');
          container.className = 'place-poi-marker plus-badge';
          container.textContent = `+${remainingCount}`;
          
          el.appendChild(container);

          // Create and add marker with same configuration as creation mode
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
            offset: plusPosition.offset,
            rotation: 0,
            rotationAlignment: 'viewport',
            pitchAlignment: 'viewport'
          })
            .setLngLat(plusPosition.coordinates);

          if (map.getZoom() > 9) {
            marker.addTo(map);
          }

          placeMarkersRef.current.push({ marker, poiId: 'plus-badge' });
        }
      }
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      placeMarkersRef.current.forEach(({ marker }) => marker.remove());
      placeMarkersRef.current = [];
    };
  }, [map, currentRoute]); // Remove zoom dependency since place POIs shouldn't move with zoom

  return null;
};
