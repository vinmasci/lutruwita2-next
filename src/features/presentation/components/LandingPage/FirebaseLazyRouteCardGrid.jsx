import React from 'react';
import Grid from '@mui/material/Grid';
import { FirebaseRouteCard, RouteCardSkeleton } from './FirebaseRouteCard';

/**
 * A grid of route cards with lazy loading
 * @param {Object} props - Component props
 * @param {Array} props.routes - Array of route objects
 * @returns {JSX.Element} - The component
 */
const FirebaseLazyRouteCardGrid = ({ routes = [] }) => {
  // If no routes, show skeletons
  if (!routes || routes.length === 0) {
    return (
      <Grid container spacing={4} sx={{ width: '100%' }}>
        {Array(6).fill().map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`skeleton-${i}`}>
            <RouteCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }
  
  return (
    <Grid container spacing={4} sx={{ width: '100%' }}>
      {routes.map((route, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={route.id || route.persistentId || index}>
          <FirebaseRouteCard route={route} />
        </Grid>
      ))}
    </Grid>
  );
};

export default FirebaseLazyRouteCardGrid;
