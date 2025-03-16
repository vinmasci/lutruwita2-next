import { useEffect, useRef, useState, useCallback } from 'react';
import { along, lineString, length } from '@turf/turf';
import mapboxgl from 'mapbox-gl';

// Import the CSS for distance markers
import './SimplifiedRouteLayer.css';

// Get points along route at specified interval using route's total distance
const getPointsAtInterval = (coordinates, totalDistance, interval) => {
  const points = [];
  const numMarkers = Math.floor(totalDistance / interval);
  for (let i = 1; i <= numMarkers; i++) {
    const fraction = (i * interval) / totalDistance;
    const index = Math.floor(fraction * (coordinates.length - 1));
    points.push(coordinates[index]);
  }
  return points;
};

// Simplified version of RouteLayer that doesn't use context
const SimplifiedRouteLayer = ({ map, route, showDistanceMarkers = false, isActive = false }) => {
  const markersRef = useRef([]);
  const [interval, setInterval] = useState(10); // Default 10km interval
  
  // Animation interval reference
  const animationIntervalRef = useRef(null);
  
  // Track animation state
  const animationState = useRef({
    growing: true,
    mainWidth: 3,
    borderWidth: 5
  });

  // Update interval based on zoom level
  useEffect(() => {
    if (!map || !showDistanceMarkers) return;

    const handleZoom = () => {
      const zoom = map.getZoom();
      if (zoom >= 11) {
        setInterval(5); // 5km when zoomed in
      } else if (zoom >= 9) {
        setInterval(10); // 10km default
      } else if (zoom >= 7) {
        setInterval(20); // 20km when zoomed out
      } else {
        setInterval(-1); // Special value to show only start/finish
      }
    };

    map.on('zoom', handleZoom);
    handleZoom(); // Set initial interval

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, showDistanceMarkers]);

  // Effect to add and update distance markers
  useEffect(() => {
    if (!map || !route || !route.geojson || !showDistanceMarkers) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    try {
      const feature = route.geojson.features[0];
      const coordinates = feature.geometry.coordinates;
      
      if (!coordinates || coordinates.length < 2) {
        return;
      }

      // Calculate total distance in kilometers
      const totalDistanceKm = route.statistics?.totalDistance 
        ? route.statistics.totalDistance / 1000 
        : length(lineString(coordinates));

      // Get points at current interval
      const points = getPointsAtInterval(coordinates, totalDistanceKm, interval);

      // Create start marker (0km)
      const startEl = document.createElement('div');
      startEl.className = 'distance-marker';
      startEl.innerHTML = '0km <i class="fa-solid fa-play" style="font-size: 1.1em;"></i>';
      
      const startMarker = new mapboxgl.Marker({
        element: startEl,
        anchor: 'center',
        offset: [0, -3] // Offset to account for larger marker size
      })
        .setLngLat(coordinates[0])
        .addTo(map);
      
      markersRef.current.push(startMarker);

      // Create intermediate markers only if not at lowest zoom level
      if (interval > 0) {
        points.forEach((point, index) => {
          // Skip if point is too close to the end
          const distanceToEnd = (totalDistanceKm - ((index + 1) * interval));
          if (distanceToEnd > interval / 2) {
            const el = document.createElement('div');
            el.className = 'distance-marker';
            el.textContent = `${(index + 1) * interval}km`;
            
            const marker = new mapboxgl.Marker({
              element: el,
              anchor: 'center',
              offset: [0, -3] // Offset to account for larger marker size
            })
              .setLngLat(point)
              .addTo(map);
            
            markersRef.current.push(marker);
          }
        });
      }

      // Create end marker with total distance
      const endEl = document.createElement('div');
      endEl.className = 'distance-marker';
      endEl.innerHTML = `${Math.round(totalDistanceKm)}km <i class="fa-solid fa-flag-checkered" style="font-size: 1.1em;"></i>`;
      
      const endMarker = new mapboxgl.Marker({
        element: endEl,
        anchor: 'center',
        offset: [0, -3] // Offset to account for larger marker size
      })
        .setLngLat(coordinates[coordinates.length - 1])
        .addTo(map);
      
      markersRef.current.push(endMarker);
    } catch (error) {
      console.error('[SimplifiedRouteLayer] Error adding distance markers:', error);
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, route, showDistanceMarkers, interval]);

  // Function to start the pulsing animation for the active route
  const startAnimation = useCallback(() => {
    if (!map || !route || !isActive) return;
    
    // Clear any existing animation interval
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    
    const routeId = route.id || route.routeId;
    const mainLayerId = `${routeId}-main-line`;
    const borderLayerId = `${routeId}-main-border`;
    
    // Reset animation state
    animationState.current = {
      growing: true,
      mainWidth: 3,
      borderWidth: 5
    };
    
    // Start the animation interval
    animationIntervalRef.current = setInterval(() => {
      const state = animationState.current;
      
      // Calculate new widths with larger steps for more visible effect
      if (state.growing) {
        state.mainWidth += 0.2;
        state.borderWidth += 0.2;
        if (state.mainWidth >= 6) {
          state.growing = false;
        }
      } else {
        state.mainWidth -= 0.2;
        state.borderWidth -= 0.2;
        if (state.mainWidth <= 3) {
          state.growing = true;
        }
      }
      
      // Apply new widths to layers
      if (map.getLayer(mainLayerId)) {
        map.setPaintProperty(mainLayerId, 'line-width', state.mainWidth);
      }
      
      if (map.getLayer(borderLayerId)) {
        map.setPaintProperty(borderLayerId, 'line-width', state.borderWidth);
      }
    }, 50); // 50ms interval for smoother animation
  }, [map, route]);
  
  // Effect to start animation when component mounts or when isActive changes
  useEffect(() => {
    if (isActive) {
      startAnimation();
    } else {
      // Clear any existing animation if not active
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
        
        // Reset to default widths
        const routeId = route?.id || route?.routeId;
        if (routeId && map) {
          const mainLayerId = `${routeId}-main-line`;
          const borderLayerId = `${routeId}-main-border`;
          
          if (map.getLayer(mainLayerId)) {
            map.setPaintProperty(mainLayerId, 'line-width', 3);
          }
          
          if (map.getLayer(borderLayerId)) {
            map.setPaintProperty(borderLayerId, 'line-width', 5);
          }
        }
      }
    }
    
    // Cleanup function
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [startAnimation, isActive, map, route]);

  // Effect to render the route
  useEffect(() => {
    try {
      // Skip rendering if the route has an error flag or is missing geojson data
      if (!map || !route || !route.geojson || route.error) {
        console.log(`[SimplifiedRouteLayer] Skipping route rendering:`, {
          routeId: route?.id || route?.routeId,
          hasMap: !!map,
          hasRoute: !!route,
          hasGeojson: !!route?.geojson,
          hasError: !!route?.error
        });
        return;
      }

      // Default colors
      const DEFAULT_COLORS = {
        main: '#f44336', // Red
        hover: '#ff5252'  // Lighter red
      };

      const routeId = route.id || route.routeId;
      const mainLayerId = `${routeId}-main-line`;
      const borderLayerId = `${routeId}-main-border`;
      const mainSourceId = `${routeId}-main`;

      // Initial validation of GeoJSON data
      if (!route.geojson.features || !route.geojson.features.length) {
        console.error('[SimplifiedRouteLayer] Invalid GeoJSON data:', {
          routeId: route.routeId,
          geojsonType: route.geojson.type,
          featureCount: route.geojson.features?.length
        });
        return;
      }

      // Extract and validate geometry
      const geometry = route.geojson.features[0].geometry;
      if (!geometry || geometry.type !== 'LineString') {
        console.error('[SimplifiedRouteLayer] Invalid GeoJSON structure:', {
          featureType: geometry?.type,
          expected: 'LineString'
        });
        return;
      }

      // Check if source already exists
      const sourceExists = map.getSource(mainSourceId);
      
      // Clean up existing layers and source if they exist
      if (sourceExists) {
        const layersToRemove = [borderLayerId, mainLayerId, `unpaved-sections-layer-${routeId}`];
        layersToRemove.forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        });

        const sourcesToRemove = [mainSourceId, `unpaved-sections-${routeId}`];
        sourcesToRemove.forEach(sourceId => {
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        });
      }

      // Add new source and layers
      try {
        // Add main route source
        map.addSource(mainSourceId, {
          type: 'geojson',
          data: route.geojson,
          tolerance: 0.5
        });
      }
      catch (error) {
        console.error('[SimplifiedRouteLayer] Error adding source:', error);
        return;
      }

      // Add border layer
      map.addLayer({
        id: borderLayerId,
        type: 'line',
        source: mainSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 5,
          'line-opacity': 1
        }
      });

      // Add main route layer
      map.addLayer({
        id: mainLayerId,
        type: 'line',
        source: mainSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': route.color || DEFAULT_COLORS.main,
          'line-width': 3,
          'line-opacity': 1
        }
      });

      // Add unpaved sections if available
      if (route.unpavedSections && route.unpavedSections.length > 0) {
        const surfaceSourceId = `unpaved-sections-${routeId}`;
        const surfaceLayerId = `unpaved-sections-layer-${routeId}`;

        // Combine all unpaved sections into a single feature collection
        const features = route.unpavedSections.map(section => ({
          type: 'Feature',
          properties: {
            surface: section.surfaceType
          },
          geometry: {
            type: 'LineString',
            coordinates: section.coordinates
          }
        }));

        map.addSource(surfaceSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features
          },
          tolerance: 1,
          maxzoom: 14
        });

        map.addLayer({
          id: surfaceLayerId,
          type: 'line',
          source: surfaceSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [1, 3]
          }
        });
      }

      // Cleanup function
      return () => {
        // Clear animation interval
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
        
        // Remove layers and sources
        if (map.getLayer(mainLayerId)) {
          map.removeLayer(mainLayerId);
        }
        if (map.getLayer(borderLayerId)) {
          map.removeLayer(borderLayerId);
        }
        if (map.getLayer(`unpaved-sections-layer-${routeId}`)) {
          map.removeLayer(`unpaved-sections-layer-${routeId}`);
        }
        if (map.getSource(mainSourceId)) {
          map.removeSource(mainSourceId);
        }
        if (map.getSource(`unpaved-sections-${routeId}`)) {
          map.removeSource(`unpaved-sections-${routeId}`);
        }
      };
    }
    catch (error) {
      console.error('[SimplifiedRouteLayer] Error rendering route:', error);
    }
  }, [map, route, startAnimation]);

  return null;
};

export default SimplifiedRouteLayer;
