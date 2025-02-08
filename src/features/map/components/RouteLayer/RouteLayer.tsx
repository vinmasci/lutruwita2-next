import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString } from 'geojson';
import { RouteLayerProps } from './types';
import { LoadedRoute, UnpavedSection } from '../../types/route.types';

export const RouteLayer: React.FC<RouteLayerProps> = ({ map, route }) => {
  useEffect(() => {
    try {
      if (!map || !route) return;

      const routeId = route.routeId || `route-${route.id}`;
      const mainLayerId = `${routeId}-main-line`;
      const borderLayerId = `${routeId}-main-border`;
      const hoverLayerId = `${routeId}-hover`;
      const mainSourceId = `${routeId}-main`;

      // Clean up any existing layers
      const cleanup = () => {
        if (map.getLayer(hoverLayerId)) map.removeLayer(hoverLayerId);
        if (map.getLayer(mainLayerId)) map.removeLayer(mainLayerId);
        if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
        if (map.getSource(mainSourceId)) map.removeSource(mainSourceId);

        // Clean up surface layers
        if (route.unpavedSections) {
          route.unpavedSections.forEach((_, index) => {
            const surfaceLayerId = `unpaved-section-layer-${routeId}-${index}`;
            const surfaceSourceId = `unpaved-section-${routeId}-${index}`;
            if (map.getLayer(surfaceLayerId)) map.removeLayer(surfaceLayerId);
            if (map.getSource(surfaceSourceId)) map.removeSource(surfaceSourceId);
          });
        }
      };

      cleanup();

      // Get the GeoJSON data from the correct location
      const mainGeoJson = route.routes?.[0]?.geojson || route.geojson;
      if (!mainGeoJson) return;

      // Add main route source
      map.addSource(mainSourceId, {
        type: 'geojson',
        data: mainGeoJson,
        tolerance: 0.5
      });

      // Add border layer for main route
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
          'line-color': '#ee5253',
          'line-width': 3,
          'line-opacity': 1
        }
      });

      // Add hover layer (initially hidden)
      map.addLayer({
        id: hoverLayerId,
        type: 'line',
        source: mainSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'none'
        },
        paint: {
          'line-color': '#ff8f8f',
          'line-width': 5,
          'line-opacity': 1
        }
      });

      // Add surface layers for loaded routes
      if (route._type === 'loaded' && route.unpavedSections) {
        route.unpavedSections.forEach((section, index) => {
          const surfaceSourceId = `unpaved-section-${routeId}-${index}`;
          const surfaceLayerId = `unpaved-section-layer-${routeId}-${index}`;

          // Add source with surface property
          map.addSource(surfaceSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                surface: section.surfaceType
              },
              geometry: {
                type: 'LineString',
                coordinates: section.coordinates
              }
            }
          });

          // Add white dashed line for unpaved segments
          map.addLayer({
            id: surfaceLayerId,
            type: 'line',
            source: surfaceSourceId,
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
        });
      }

      // Add hover handlers
      const mouseHandler = () => {
        map.getCanvas().style.cursor = 'pointer';
        map.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
      };

      const mouseleaveHandler = () => {
        map.getCanvas().style.cursor = '';
        map.setLayoutProperty(hoverLayerId, 'visibility', 'none');
      };

      map.on('mouseenter', mainLayerId, mouseHandler);
      map.on('mousemove', mainLayerId, mouseHandler);
      map.on('mouseleave', mainLayerId, mouseleaveHandler);

      // Log layer info for debugging
      console.log('[RouteLayer] Layer info:', {
        layerId: mainLayerId,
        source: map.getSource(mainSourceId),
        layer: map.getLayer(mainLayerId)
      });

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

      return () => {
        map.off('mouseenter', mainLayerId, mouseHandler);
        map.off('mousemove', mainLayerId, mouseHandler);
        map.off('mouseleave', mainLayerId, mouseleaveHandler);
        cleanup();
      };
    } catch (error) {
      console.error('[RouteLayer] Error rendering route:', error);
    }
  }, [map, route]);

  return null;
};

export default RouteLayer;
