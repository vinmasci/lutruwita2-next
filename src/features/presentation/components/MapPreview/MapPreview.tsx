import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPreviewProps {
  center: [number, number];
  zoom: number;
  geojson?: any;
  className?: string;
}

export const MapPreview: React.FC<MapPreviewProps> = ({ center, zoom, geojson, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: center,
      zoom: zoom,
      interactive: false, // Disable map interactions for preview
      attributionControl: false
    });

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current || !geojson) return;

    // Wait for map to load before adding source and layer
    map.current.once('load', () => {
      // Add the route source
      map.current?.addSource('route', {
        type: 'geojson',
        data: geojson
      });

      // Add the route layer
      map.current?.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0066CC',
          'line-width': 3
        }
      });

      // Fit bounds to the route
      if (geojson.coordinates) {
        const bounds = new mapboxgl.LngLatBounds();
        geojson.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        map.current?.fitBounds(bounds, {
          padding: 20
        });
      }
    });
  }, [geojson]);

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-full ${className}`}
    />
  );
};
