import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { RouteData } from '../../../services/routeService';

interface RouteLayerProps {
  routes: RouteData[];
}

/**
 * RouteLayer component for displaying route lines on the map
 * 
 * This component renders each route as a line on the map using Mapbox GL's LineLayer.
 * It filters routes based on visibility and renders each with its specified color.
 */
const RouteLayer: React.FC<RouteLayerProps> = ({ routes }) => {
  // Filter out invisible routes
  const visibleRoutes = routes.filter(route => route.isVisible);

  return (
    <>
      {visibleRoutes.map((route) => {
        // Skip routes without valid GeoJSON data
        if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
          console.warn(`Route ${route.name} has invalid GeoJSON data`);
          return null;
        }

        // Create a unique ID for this route
        const routeId = `route-${route.routeId}`;
        const sourceId = `source-${route.routeId}`;
        
        return (
          <React.Fragment key={route.routeId}>
            <MapboxGL.ShapeSource
              id={sourceId}
              shape={route.geojson}
            >
              <MapboxGL.LineLayer
                id={routeId}
                style={{
                  lineColor: route.color || '#ff4d4d',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default RouteLayer;
