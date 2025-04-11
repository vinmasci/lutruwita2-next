import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import LazyRouteCard from './LazyRouteCard';

/**
 * LazyRouteCardGrid component that renders a grid of LazyRouteCard components
 * Each card will only load its content when it's about to enter the viewport
 */
const LazyRouteCardGrid = ({ routes, gridProps = {} }) => {
  // If no routes are available, show a message
  if (!routes || routes.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No routes found matching your criteria
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={4} {...gridProps}>
      {routes.map((route) => (
        <Grid 
          item 
          xs={12} 
          sm={6} 
          md={4} 
          key={route.id || route.persistentId || Math.random().toString(36).substr(2, 9)}
          sx={{ width: '100%', display: 'flex' }}
        >
          <Box sx={{ width: '100%', display: 'flex', flexGrow: 1 }}>
            <LazyRouteCard route={route} />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default LazyRouteCardGrid;
