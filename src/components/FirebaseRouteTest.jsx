import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicRoute } from '../services/firebasePublicRouteService';
import { Box, CircularProgress, Typography, Paper, Alert } from '@mui/material';

/**
 * Test component to verify Firebase route loading
 */
const FirebaseRouteTest = () => {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!id) {
        setError('No route ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log(`[FirebaseRouteTest] Fetching route with ID: ${id}`);
        const routeData = await getPublicRoute(id);
        
        if (!routeData) {
          setError('Route not found');
          setLoading(false);
          return;
        }
        
        console.log('[FirebaseRouteTest] Route data:', routeData);
        setRoute(routeData);
      } catch (error) {
        console.error('[FirebaseRouteTest] Error fetching route:', error);
        setError(`Error fetching route: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoute();
  }, [id]);

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        p={2}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Firebase Route Test
      </Typography>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Route Details
        </Typography>
        <Typography><strong>ID:</strong> {route.id}</Typography>
        <Typography><strong>Name:</strong> {route.name}</Typography>
        <Typography><strong>Type:</strong> {route.routeType}</Typography>
        {route.totalDistance && (
          <Typography><strong>Distance:</strong> {route.totalDistance.toFixed(2)} km</Typography>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          GeoJSON Data
        </Typography>
        {route.geojson ? (
          <>
            <Typography><strong>Features:</strong> {route.geojson.features?.length || 0}</Typography>
            {route.geojson.features?.[0]?.geometry?.coordinates && (
              <Typography><strong>Coordinates:</strong> {route.geojson.features[0].geometry.coordinates.length} points</Typography>
            )}
          </>
        ) : (
          <Typography color="error">No GeoJSON data available</Typography>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Routes Array
        </Typography>
        {route.routes && route.routes.length > 0 ? (
          <>
            <Typography><strong>Routes:</strong> {route.routes.length}</Typography>
            <Box component="ul" sx={{ mt: 1 }}>
              {route.routes.map((routeItem, index) => (
                <Box component="li" key={routeItem.routeId || index} sx={{ mb: 1 }}>
                  <Typography>
                    <strong>Route {index + 1}:</strong> {routeItem.name} (ID: {routeItem.routeId})
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Typography color="error">No routes available</Typography>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Additional Data
        </Typography>
        <Typography><strong>POIs:</strong> {route.pois ? 'Available' : 'Not available'}</Typography>
        <Typography><strong>Lines:</strong> {route.lines ? 'Available' : 'Not available'}</Typography>
        <Typography><strong>Photos:</strong> {route.photos ? 'Available' : 'Not available'}</Typography>
      </Paper>
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 4 }}>
        This is a test component to verify that routes are being loaded correctly from Firebase.
        Once verified, you can use the regular RoutePresentation component to display the route.
      </Typography>
    </Box>
  );
};

export default FirebaseRouteTest;
