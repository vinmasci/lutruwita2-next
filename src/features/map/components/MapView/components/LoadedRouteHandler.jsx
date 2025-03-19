import React from 'react';
import { RouteLayer } from '../../RouteLayer/RouteLayer';

/**
 * Component for handling loaded routes (retrieved from the database)
 * 
 * @param {Object} props - Component props
 * @param {Object} props.mapInstance - Reference to the map instance
 * @param {Array} props.routes - All routes
 * @returns {React.ReactElement} The rendered component
 */
const LoadedRouteHandler = ({ mapInstance, routes }) => {
  // Filter for loaded routes only
  const loadedRoutes = routes.filter(route => route._type === 'loaded');
  
  // If no map instance or no loaded routes, don't render anything
  if (!mapInstance.current || loadedRoutes.length === 0) {
    return null;
  }
  
  return (
    <>
      {loadedRoutes.map(route => (
        <RouteLayer 
          key={route.routeId} 
          map={mapInstance.current} 
          route={route} 
        />
      ))}
    </>
  );
};

export default LoadedRouteHandler;
