import { useEffect, useRef, useState } from 'react';
import { along, lineString, length } from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import EmbedRouteLayer from './EmbedRouteLayer';
import { normalizeRoute } from '../../../../map/hooks/useUnifiedRouteProcessing';

// Import the CSS for distance markers
import './SimplifiedRouteLayer.css';

// Calculate distance between two points using Haversine formula
const calculateDistance = (point1, point2) => {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  // Convert to radians
  const toRad = (value) => value * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  
  // Haversine formula
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in meters
  const R = 6371e3;
  return R * c;
};

// Get points along route at specified interval using actual cumulative distances
const getPointsAtInterval = (coordinates, totalDistanceKm, interval) => {
  // If no coordinates or invalid interval, return empty array
  if (!coordinates || coordinates.length < 2 || interval <= 0) {
    return [];
  }
  
  const points = [];
  const cumulativeDistances = [0]; // First point is at distance 0
  let totalDistanceM = 0;
  
  // Calculate cumulative distances for each point
  for (let i = 1; i < coordinates.length; i++) {
    const distance = calculateDistance(coordinates[i-1], coordinates[i]);
    totalDistanceM += distance;
    cumulativeDistances.push(totalDistanceM);
  }
  
  // Convert interval to meters
  const intervalM = interval * 1000;
  
  // Find points at each interval
  for (let targetDistance = intervalM; targetDistance < totalDistanceM; targetDistance += intervalM) {
    // Find the point just before or at our target distance
    let index = 0;
    while (index < cumulativeDistances.length - 1 && 
           cumulativeDistances[index + 1] < targetDistance) {
      index++;
    }
    
    // If we're at the last point, we can't interpolate
    if (index >= coordinates.length - 1) {
      continue;
    }
    
    // If we're exactly at a point, use that point
    if (cumulativeDistances[index] === targetDistance) {
      points.push(coordinates[index]);
      continue;
    }
    
    // Otherwise, we need to interpolate between two points
    const beforeDist = cumulativeDistances[index];
    const afterDist = cumulativeDistances[index + 1];
    const segmentLength = afterDist - beforeDist;
    
    // How far along this segment is our target distance?
    const ratio = (targetDistance - beforeDist) / segmentLength;
    
    // Interpolate between the two points
    const beforePoint = coordinates[index];
    const afterPoint = coordinates[index + 1];
    const interpolatedPoint = [
      beforePoint[0] + ratio * (afterPoint[0] - beforePoint[0]),
      beforePoint[1] + ratio * (afterPoint[1] - beforePoint[1])
    ];
    
    points.push(interpolatedPoint);
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

  // Render the EmbedRouteLayer component
  return (
    <>
      {/* Use the EmbedRouteLayer component for route rendering */}
      <EmbedRouteLayer 
        map={map} 
        route={normalizedRoute} 
        currentRoute={normalizedRoute} // Pass the current route as a prop
      />
      
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
