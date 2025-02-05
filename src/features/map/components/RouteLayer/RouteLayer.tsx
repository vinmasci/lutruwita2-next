import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString } from 'geojson';
import { RouteLayerProps } from './types';

export const RouteLayer: React.FC<RouteLayerProps> = ({ map, route }) => {
  useEffect(() => {
    try {
      if (!map || !route) return;

      const routeId = route.routeId || `route-${route.id}`;

      // Store event handler references for cleanup
      const mousemoveHandler = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source: `${routeId}-main`, id: hoveredFeatureId },
              { hover: false }
            );
          }
          hoveredFeatureId = e.features[0].id as number;
          map.setFeatureState(
            { source: `${routeId}-main`, id: hoveredFeatureId },
            { hover: true }
          );
          map.getCanvas().style.cursor = 'pointer';
        }
      };

      const mouseleaveHandler = () => {
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source: `${routeId}-main`, id: hoveredFeatureId },
            { hover: false }
          );
        }
        hoveredFeatureId = null;
        map.getCanvas().style.cursor = '';
      };

      // Clean up any existing layers
      const cleanup = () => {
        // Remove event listeners
        map.off('mousemove', `${routeId}-line`, mousemoveHandler);
        map.off('mouseleave', `${routeId}-line`, mouseleaveHandler);

        // Remove layers
        if (map.getLayer(`${routeId}-line`)) map.removeLayer(`${routeId}-line`);
        if (map.getLayer(`${routeId}-border`)) map.removeLayer(`${routeId}-border`);
        if (map.getLayer(`${routeId}-unpaved-line`)) map.removeLayer(`${routeId}-unpaved-line`);

        // Remove sources
        if (map.getSource(`${routeId}-main`)) map.removeSource(`${routeId}-main`);
        if (map.getSource(`${routeId}-unpaved`)) map.removeSource(`${routeId}-unpaved`);
      };

      cleanup();

      // Declare hoveredFeatureId after cleanup
      let hoveredFeatureId: number | null = null;

      // Use the saved route data directly
      const mainGeoJson = route.routes?.[0]?.geojson;
      const unpavedGeoJson = route.routes?.[1]?.geojson;

      if (mainGeoJson) {
        // Add main route source
        map.addSource(`${routeId}-main`, {
          type: 'geojson',
          data: mainGeoJson,
          generateId: true
        });

        // Add border layer for main route
        map.addLayer({
          id: `${routeId}-border`,
          type: 'line',
          source: `${routeId}-main`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 5
          }
        });

        // Add main route layer
        map.addLayer({
          id: `${routeId}-line`,
          type: 'line',
          source: `${routeId}-main`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ff8f8f',
              '#ee5253'
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              5,
              3
            ]
          }
        });

        // Add hover effects for main route
        map.on('mousemove', `${routeId}-line`, mousemoveHandler);
        map.on('mouseleave', `${routeId}-line`, mouseleaveHandler);
      }

      if (unpavedGeoJson) {
        // Add unpaved sections source
        map.addSource(`${routeId}-unpaved`, {
          type: 'geojson',
          data: unpavedGeoJson,
          generateId: true
        });

        // Add unpaved sections layer
        map.addLayer({
          id: `${routeId}-unpaved-line`,
          type: 'line',
          source: `${routeId}-unpaved`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [1, 3]
          }
        });
      }

      // Fit bounds to route
      if (mainGeoJson?.features?.[0]) {
        const feature = mainGeoJson.features[0] as Feature<LineString>;
        const coordinates = feature.geometry.coordinates;
        
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coord) => {
          bounds.extend([coord[0], coord[1]] as [number, number]);
        });

        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13
        });
      }

      return cleanup;
    } catch (error) {
      console.error('[RouteLayer] Error rendering route:', error);
      // Fallback to original rendering if needed
    }
  }, [map, route]);

  return null;
};

export default RouteLayer;
