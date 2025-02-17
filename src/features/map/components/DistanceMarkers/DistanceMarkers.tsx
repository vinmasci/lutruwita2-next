import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './DistanceMarkers.css';
import { useRouteContext } from '../../context/RouteContext';
import { Feature, LineString } from 'geojson';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';

// Get points along route at specified interval using route's total distance
const getPointsAtInterval = (coordinates: [number, number][], totalDistance: number, interval: number): [number, number][] => {
  const points: [number, number][] = [];
  const numMarkers = Math.floor(totalDistance / interval);
  
  for (let i = 1; i <= numMarkers; i++) {
    const fraction = (i * interval) / totalDistance;
    const index = Math.floor(fraction * (coordinates.length - 1));
    points.push(coordinates[index]);
  }

  return points;
};

interface DistanceMarkersProps {
  map: mapboxgl.Map;
}

export const DistanceMarkers: React.FC<DistanceMarkersProps> = ({ map }) => {
  const { currentRoute } = useRouteContext();
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [interval, setInterval] = useState(10); // Default 10km interval

  // Update interval based on zoom level
  useEffect(() => {
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
  }, [map]);

  // Update markers when route or interval changes
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!currentRoute) return;

    const feature = currentRoute.geojson.features[0] as Feature<LineString>;
    const coordinates = feature.geometry.coordinates as [number, number][];
    const totalDistanceKm = currentRoute.statistics.totalDistance / 1000; // Convert meters to kilometers
    
    // Get points at current interval
    const points = getPointsAtInterval(coordinates, totalDistanceKm, interval);

    // Create start marker (0km)
    const startEl = document.createElement('div');
    startEl.className = 'distance-marker';
    startEl.innerHTML = '0km <i class="fa-solid fa-play"></i>';
    const startMarker = new mapboxgl.Marker({
      element: startEl,
      anchor: 'center'
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
            anchor: 'center'
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
    endEl.innerHTML = `${Math.round(totalDistanceKm)}km <i class="fa-solid fa-flag-checkered"></i>`;
    const endMarker = new mapboxgl.Marker({
      element: endEl,
      anchor: 'center'
    })
      .setLngLat(coordinates[coordinates.length - 1])
      .addTo(map);
    markersRef.current.push(endMarker);

    return () => {
      markersRef.current.forEach(marker => marker.remove());
    };
  }, [currentRoute, interval, map]);

  return null;
};
