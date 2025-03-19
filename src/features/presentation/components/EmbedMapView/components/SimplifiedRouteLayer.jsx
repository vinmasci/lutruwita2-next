import { useEffect, useRef, useState } from 'react';
import { along, lineString, length } from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import { RouteLayer } from '../../../../../map/components/RouteLayer/RouteLayer';
import { normalizeRoute } from '../../../../../map/hooks/useUnifiedRouteProcessing';

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

// Enhanced version of SimplifiedRouteLayer that uses the unified RouteLayer
const SimplifiedRouteLayer = ({ map, route, showDistanceMarkers = false, isActive = false }) => {
  const markersRef = useRef([]);
  const [interval, setInterval] = useState(10); // Default 10km interval
  
  // Normalize the route to ensure consistent structure
  const normalizedRoute = normalizeRoute({
    ...route,
    isFocused: isActive // Set the route as focused if it's active
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

  // Animation is now handled by the RouteLayer component

  // Render the unified RouteLayer component
  return (
    <>
      {/* Use the enhanced RouteLayer component for route rendering */}
      <RouteLayer map={map} route={normalizedRoute} />
      
      {/* Handle distance markers separately */}
      {showDistanceMarkers && (
        <DistanceMarkers 
          map={map} 
          route={normalizedRoute} 
          interval={interval} 
          setInterval={setInterval} 
          markersRef={markersRef} 
        />
      )}
    </>
  );
};

// Separate component for distance markers
const DistanceMarkers = ({ map, route, interval, setInterval, markersRef }) => {

  // Update interval based on zoom level
  useEffect(() => {
    if (!map) return;

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
  }, [map, setInterval]);

  // Effect to add and update distance markers
  useEffect(() => {
    if (!map || !route || !route.geojson) return;

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
  }, [map, route, interval, markersRef]);

  return null;
};

export default SimplifiedRouteLayer;
