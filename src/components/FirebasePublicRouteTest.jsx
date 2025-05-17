import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Paper, Divider } from '@mui/material';
import { listPublicRoutes, getPublicRoute, getFirebasePublicRouteStatus } from '../services/firebasePublicRouteService';
import FirebaseRouteCard from '../features/presentation/components/LandingPage/FirebaseRouteCard';

/**
 * Test component for Firebase Public Route Service
 * This component demonstrates how to use the Firebase Public Route Service
 * to fetch and display public routes from Firebase.
 */
const FirebasePublicRouteTest = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Fetch routes on component mount
  useEffect(() => {
    fetchRoutes();
  }, []);
  
  // Fetch routes from Firebase
  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch routes with no filters
      const routes = await listPublicRoutes();
      setRoutes(routes);
      console.log('Fetched routes:', routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch route details
  const fetchRouteDetails = async (routeId) => {
    setLoadingDetails(true);
    setError(null);
    
    try {
      // Fetch route details
      const route = await getPublicRoute(routeId);
      setRouteDetails(route);
      console.log('Fetched route details:', route);
    } catch (error) {
      console.error('Error fetching route details:', error);
      setError('Failed to fetch route details: ' + error.message);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  // Handle route selection
  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    fetchRouteDetails(route.id);
  };
  
  // Get the current status
  const status = getFirebasePublicRouteStatus();
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Firebase Public Route Test
      </Typography>
      
      <Typography variant="body1" paragraph>
        This component demonstrates how to use the Firebase Public Route Service
        to fetch and display public routes from Firebase.
      </Typography>
      
      {/* Status display */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Service Status
        </Typography>
        <Typography variant="body2">
          Loading: {status.isLoading ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          Success: {status.success ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          Last Load Time: {status.lastLoadTime ? `${status.lastLoadTime}ms` : 'N/A'}
        </Typography>
        {status.error && (
          <Typography variant="body2" color="error">
            Error: {status.error}
          </Typography>
        )}
      </Paper>
      
      {/* Error display */}
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </Paper>
      )}
      
      {/* Fetch button */}
      <Button 
        variant="contained" 
        onClick={fetchRoutes} 
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? 'Fetching...' : 'Fetch Public Routes'}
      </Button>
      
      {/* Routes display */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {loading ? (
          <CircularProgress />
        ) : routes.length > 0 ? (
          routes.slice(0, 4).map((route) => (
            <Box 
              key={route.id} 
              sx={{ width: 300, cursor: 'pointer' }}
              onClick={() => handleRouteSelect(route)}
            >
              <FirebaseRouteCard route={route} isFirebaseData={true} />
            </Box>
          ))
        ) : (
          <Typography variant="body1">
            No routes found.
          </Typography>
        )}
      </Box>
      
      {/* Selected route details */}
      {selectedRoute && (
        <Box>
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            Selected Route Details
          </Typography>
          
          {loadingDetails ? (
            <CircularProgress />
          ) : routeDetails ? (
            <Box>
              <Typography variant="h6">
                {routeDetails.metadata?.info?.name || 'Unnamed Route'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                ID: {routeDetails.id}
              </Typography>
              
              <Typography variant="body2" paragraph>
                Type: {routeDetails.metadata?.info?.type || 'Unknown'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                State: {routeDetails.metadata?.info?.state || 'Unknown'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                Public: {routeDetails.metadata?.info?.isPublic ? 'Yes' : 'No'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                Created: {routeDetails.metadata?.info?.createdAt?.toDate?.().toLocaleString() || 'Unknown'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                Updated: {routeDetails.metadata?.info?.updatedAt?.toDate?.().toLocaleString() || 'Unknown'}
              </Typography>
              
              {/* Display route GeoJSON data if available */}
              {routeDetails.geojson?.routes && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Route Segments
                  </Typography>
                  
                  {routeDetails.geojson.routes.map((route, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Name: {route.name || 'Unnamed Segment'}
                      </Typography>
                      <Typography variant="body2">
                        Color: {route.color || 'Default'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Display POIs if available */}
              {routeDetails.pois?.draggable && routeDetails.pois.draggable.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Points of Interest
                  </Typography>
                  
                  {routeDetails.pois.draggable.map((poi, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {poi.name || 'Unnamed POI'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Display photos if available */}
              {routeDetails.photos?.photos && routeDetails.photos.photos.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Photos
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {routeDetails.photos.photos.map((photo, index) => (
                      <Box 
                        key={index} 
                        component="img"
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.name || 'Photo'}
                        sx={{ 
                          width: 100, 
                          height: 100, 
                          objectFit: 'cover',
                          borderRadius: 1
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body1">
              No route details available.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FirebasePublicRouteTest;
