import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { ICON_PATHS } from '../../../poi/constants/icon-paths';
import { calculatePOIPositions } from '../../../poi/utils/placeDetection';
import { PresentationPOIViewer } from '../POIViewer';
import './PresentationPOILayer.css';
export const PresentationPOILayer = ({ map }) => {
    const { currentRoute } = useRouteContext();
    const { loadPOIsFromRoute, getPOIsForRoute } = usePOIContext();
    const markersRef = useRef([]);
    const placeMarkersRef = useRef([]);
    const [selectedPOI, setSelectedPOI] = useState(null);
    // Effect to handle place POIs visibility based on zoom
    useEffect(() => {
        if (!map)
            return;
        const handleZoom = () => {
            const currentZoom = Math.floor(map.getZoom());
            // Use requestAnimationFrame to batch DOM updates
            requestAnimationFrame(() => {
                // Update zoom level for regular POIs
                markersRef.current.forEach(({ marker }) => {
                    const markerElement = marker.getElement();
                    const container = markerElement.querySelector('.marker-container');
                    if (container) {
                        container.setAttribute('data-zoom', currentZoom.toString());
                    }
                });
                // Show/hide place markers based on zoom level
                placeMarkersRef.current.forEach(({ marker }) => {
                    if (currentZoom > 8.071) {
                        marker.addTo(map);
                    }
                    else {
                        marker.remove();
                    }
                });
            });
        };
        map.on('zoom', handleZoom);
        handleZoom(); // Initial check
        return () => {
            map.off('zoom', handleZoom);
        };
    }, [map]);
    // Load POIs when route changes
    useEffect(() => {
        if (!currentRoute || currentRoute._type !== 'loaded' || !currentRoute._loadedState?.pois) {
            return;
        }
        loadPOIsFromRoute(currentRoute._loadedState.pois);
    }, [currentRoute]); // Remove loadPOIsFromRoute from deps since it's a stable context function
    // Memoize POI data to prevent unnecessary recalculations
    // Memoize POI data based on the actual POIs from context
    const poiData = useMemo(() => getPOIsForRoute(), [getPOIsForRoute]); // Will update when POIs change since getPOIsForRoute is memoized with [pois]
    // Memoize marker creation function
    const createMarker = useCallback((poi) => {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        const iconDefinition = getIconDefinition(poi.icon);
        const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[poi.category].color;
        // Set up marker HTML with bubble-pin style and initial zoom level
        const initialZoom = Math.floor(map.getZoom());
        el.innerHTML = `
      <div class="marker-container" data-zoom="${initialZoom}">
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
            .addTo(map);
        // Add click handler to show drawer
        el.addEventListener('click', () => {
            setSelectedPOI(poi);
        });
        // Add hover effect
        el.addEventListener('mouseenter', () => {
            const bubble = el.querySelector('.marker-bubble');
            if (bubble) {
                bubble.style.transform = 'scale(1.1)';
                bubble.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
            }
        });
        el.addEventListener('mouseleave', () => {
            const bubble = el.querySelector('.marker-bubble');
            if (bubble) {
                bubble.style.transform = '';
                bubble.style.boxShadow = '';
            }
        });
        return { marker, poiId: poi.id };
    }, [map, setSelectedPOI]);
    // Effect to update markers when POI data changes
    useEffect(() => {
        if (!map)
            return;
        // Clear existing markers
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        // Handle regular POIs
        poiData.draggable.forEach((poi) => {
            const markerRef = createMarker(poi);
            markersRef.current.push(markerRef);
        });
        // Group place POIs by coordinates
        const poiGroups = poiData.places.reduce((acc, poi) => {
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
            const positions = calculatePOIPositions({
                id: coordKey,
                name: locationPois[0].name,
                coordinates: [lng, lat]
            }, totalPositions, {
                iconSize: 16,
                spacing: 5.5,
                maxPerRow: 4,
                baseOffset
            });
            // Only show first 3 POIs
            const visiblePois = locationPois.slice(0, 3);
            const remainingCount = locationPois.length - 3;
            // Create markers for visible POIs
            visiblePois.forEach((poi, index) => {
                const position = positions[index];
                if (!position)
                    return;
                // Create marker element without any zoom-based attributes for place POIs
                const el = document.createElement('div');
                el.className = 'mapboxgl-marker poi-marker';
                const container = document.createElement('div');
                container.className = 'poi-marker';
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
                    .setLngLat(position.coordinates);
                // Add click handler to show drawer
                el.addEventListener('click', () => {
                    setSelectedPOI(poi);
                });
                // Only add marker if we're zoomed in enough
                if (map.getZoom() > 8.071) {
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
                    el.className = 'mapboxgl-marker poi-marker';
                    const container = document.createElement('div');
                    container.className = 'poi-marker plus-badge';
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
                    // Only add marker if we're zoomed in enough
                    if (map.getZoom() > 8.071) {
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
    }, [map, poiData, createMarker]); // Use memoized poiData instead of getPOIsForRoute
    return (_jsx(PresentationPOIViewer, { poi: selectedPOI, onClose: () => setSelectedPOI(null) }));
};
