import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Button, 
  IconButton, 
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Map as MapIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Public as PublicIcon, 
  Lock as LockIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  getUserRouteIndex, 
  deleteSavedRoute, 
  updateSavedRoute 
} from '../../services/firebaseSaveCompleteRouteService';

/**
 * Component to display a user's saved routes
 */
const MyRoutesView = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  
  // Load routes when component mounts
  useEffect(() => {
    const loadRoutes = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const userId = user?.sub;
        if (!userId) {
          throw new Error('User ID not available');
        }
        
        const routeIndex = await getUserRouteIndex(userId);
        
        // Sort routes by updated date (newest first)
        const sortedRoutes = [...routeIndex].sort((a, b) => {
          const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return dateB - dateA;
        });
        
        setRoutes(sortedRoutes);
      } catch (error) {
        console.error('[MyRoutesView] Error loading routes:', error);
        setError('Failed to load your routes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadRoutes();
  }, [isAuthenticated, user]);
  
  // Handle opening a route
  const handleOpenRoute = (routeId) => {
    navigate(`/edit/${routeId}`);
  };
  
  // Handle deleting a route
  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;
    
    setDeleteInProgress(true);
    
    try {
      const userId = user?.sub;
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      const success = await deleteSavedRoute(routeToDelete, userId);
      
      if (success) {
        // Remove the route from the local state
        setRoutes(routes.filter(route => route.id !== routeToDelete));
        
        // Show success message
        setSnackbarMessage('Route deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('Failed to delete route');
      }
    } catch (error) {
      console.error('[MyRoutesView] Error deleting route:', error);
      setSnackbarMessage('Failed to delete route. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteInProgress(false);
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
    }
  };
  
  // Handle toggling route visibility (public/private)
  const handleToggleVisibility = async (routeId, currentVisibility) => {
    try {
      const userId = user?.sub;
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      const newVisibility = !currentVisibility;
      
      const success = await updateSavedRoute(routeId, { isPublic: newVisibility }, userId);
      
      if (success) {
        // Update the route in the local state
        setRoutes(routes.map(route => 
          route.id === routeId 
            ? { ...route, isPublic: newVisibility } 
            : route
        ));
        
        // Show success message
        setSnackbarMessage(`Route is now ${newVisibility ? 'public' : 'private'}`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('Failed to update route visibility');
      }
    } catch (error) {
      console.error('[MyRoutesView] Error updating route visibility:', error);
      setSnackbarMessage('Failed to update route visibility. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Render login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>My Routes</Typography>
        <Typography variant="body1" paragraph>
          Please log in to view your saved routes.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => loginWithRedirect()}
          sx={{ mt: 2 }}
        >
          Log In
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>My Routes</Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : routes.length === 0 ? (
        <Typography>You don't have any saved routes yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {routes.map(route => (
            <Grid item xs={12} sm={6} md={4} key={route.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={route.thumbnailUrl || '/placeholder-map.jpg'}
                  alt={route.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {route.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last updated: {formatDate(route.updatedAt)}
                  </Typography>
                  
                  {route.statistics && (
                    <Box sx={{ my: 1 }}>
                      <Typography variant="body2">
                        {route.statistics.totalDistance ? `${route.statistics.totalDistance} km` : ''}
                        {route.statistics.totalDistance && route.statistics.totalAscent ? ' • ' : ''}
                        {route.statistics.totalAscent ? `${route.statistics.totalAscent} m elevation` : ''}
                      </Typography>
                      
                      {route.statistics.isLoop !== undefined && (
                        <Typography variant="body2">
                          {route.statistics.isLoop ? 'Loop route' : 'Point-to-point route'}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {route.tags && route.tags.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {route.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button 
                      variant="contained" 
                      startIcon={<MapIcon />}
                      onClick={() => handleOpenRoute(route.id)}
                      size="small"
                    >
                      Open
                    </Button>
                    
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleToggleVisibility(route.id, route.isPublic)}
                        title={route.isPublic ? 'Make private' : 'Make public'}
                      >
                        {route.isPublic ? <PublicIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                      </IconButton>
                      
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => {
                          setRouteToDelete(route.id);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete route"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Route</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this route? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={deleteInProgress}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteRoute} 
            color="error" 
            disabled={deleteInProgress}
            variant="contained"
          >
            {deleteInProgress ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyRoutesView;
