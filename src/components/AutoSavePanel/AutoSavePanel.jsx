import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Tooltip, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import { useAutoSave } from '../../context/AutoSaveContext';
import { useRouteContext } from '../../features/map/context/RouteContext';
import { deleteAutoSaveFromFirebase } from '../../services/firebaseGpxAutoSaveService';
import { saveAutoSaveToPermanentRoute } from '../../services/firebaseSaveCompleteRouteService';
import { useAuth0 } from '@auth0/auth0-react';
import './AutoSavePanel.css';

/**
 * A floating panel that displays auto-save information and controls
 */
const AutoSavePanel = () => {
  // State for save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState(null);
  
  // State for clear confirmation dialog
  const [showClearDialog, setShowClearDialog] = useState(false);

  const { 
    autoSaveId, 
    routeId, 
    lastSaved, 
    status, 
    error,
    clearAutoSave,
    setLoadedPermanentRoute // Get the new function from AutoSaveContext
  } = useAutoSave();

  // Get the RouteContext to access clearCurrentWork and map
  const { 
    clearCurrentWork, 
    map
  } = useRouteContext();
  
  // Get Auth0 context for user ID
  const { user, isAuthenticated } = useAuth0();

  // Handle save route
  const handleSaveRoute = async () => {
    if (!routeName.trim() || !autoSaveId) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Get the current user ID
      const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
      
      console.log('[AutoSavePanel] Saving route permanently:', {
        autoSaveId,
        routeName: routeName.trim(),
        userId
      });
      
      // Save the route permanently
      const savedRouteId = await saveAutoSaveToPermanentRoute(
        autoSaveId,
        routeName.trim(),
        userId,
        true, // Public by default
        [] // No tags by default
      );
      
      if (savedRouteId) {
        console.log('[AutoSavePanel] Route saved successfully with ID:', savedRouteId);
        setSavedRouteId(savedRouteId);
        setSaveSuccess(true);
        setShowSaveDialog(false);
        setRouteName('');
        
        // After successful permanent save, set this new permanent route as the active loaded one
        if (typeof setLoadedPermanentRoute === 'function') {
          setLoadedPermanentRoute(savedRouteId);
        }
        // clearAutoSave() is called by saveAutoSaveToPermanentRoute internally after deleting the temporary save.
        // The AutoSaveContext's autoSaveId will now be the permanent route's ID.
      } else {
        console.error('[AutoSavePanel] Failed to save route permanently');
        setSaveError('Failed to save route. Please try again.');
      }
    } catch (error) {
      console.error('[AutoSavePanel] Error saving route permanently:', error);
      setSaveError(error.message || 'An error occurred while saving the route');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setShowSaveDialog(false);
    setRouteName('');
    setSaveError(null);
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
    setSaveError(null);
  };
  
  // Format the auto-save ID for display (shortened)
  const displayId = autoSaveId 
    ? `${autoSaveId.substring(0, 6)}...` 
    : 'None';

  // Format the last saved time
  const formattedTime = lastSaved 
    ? new Intl.DateTimeFormat('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(lastSaved)
    : 'Never';

  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'saving': return '#FFA500'; // Orange
      case 'saved': return '#4CAF50';  // Green
      case 'error': return '#F44336';  // Red
      default: return '#9E9E9E';       // Grey
    }
  };

  // Determine status text
  const getStatusText = () => {
    switch (status) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  // Get tooltip text based on status
  const getTooltipText = () => {
    if (status === 'error' && error) {
      return `Error: ${error}`;
    }
    
    if (status === 'saved' && lastSaved) {
      return `Last saved at ${formattedTime}`;
    }
    
    return getStatusText();
  };

  // Show clear confirmation dialog
  const handleShowClearDialog = () => {
    setShowClearDialog(true);
  };

  // Handle clear dialog close
  const handleCloseClearDialog = () => {
    setShowClearDialog(false);
  };

  // Handle clear auto-save
  const handleClearAutoSave = () => {
    // Get the current user ID
    const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
    
    // Delete the auto-save from Firebase
    if (autoSaveId && routeId) {
      console.log('[AutoSavePanel] Deleting auto-save from Firebase:', autoSaveId);
      deleteAutoSaveFromFirebase(routeId, userId)
        .then(success => {
          if (success) {
            console.log('[AutoSavePanel] Auto-save deleted successfully from Firebase');
          } else {
            console.warn('[AutoSavePanel] Failed to delete auto-save from Firebase');
          }
        })
        .catch(error => {
          console.error('[AutoSavePanel] Error deleting auto-save from Firebase:', error);
        });
    }
    
    // Enhanced cleanup process
    console.log('[AutoSavePanel] Starting enhanced cleanup process');
    
    // Step 1: Clear the auto-save state in the context first
    console.log('[AutoSavePanel] Clearing auto-save state');
    clearAutoSave();
    
    // Step 2: Set a flag in localStorage to prevent auto-loading
    localStorage.setItem('autoSaveClearedAt', Date.now().toString());
    
    // Step 3: Call clearCurrentWork which will handle all the context clearing and map reset
    console.log('[AutoSavePanel] Calling clearCurrentWork from RouteContext');
    clearCurrentWork();
    
    // Close the dialog
    setShowClearDialog(false);
  };

  return (
    <div>
      <Box 
        className="auto-save-panel"
        sx={{
          position: 'absolute',
          top: '80px', // Moved down to avoid overlapping with the header
          right: '70px', // Padding from the right side to avoid map controls
          zIndex: 1000,
          backgroundColor: 'rgba(35, 35, 35, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          maxWidth: '100%',
          backdropFilter: 'blur(5px)',
        }}
      >
        {/* Status indicator */}
        <Tooltip title={getTooltipText()}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {status === 'saving' ? (
              <CircularProgress size={16} sx={{ color: getStatusColor() }} />
            ) : (
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: getStatusColor(),
                  transition: 'background-color 0.3s ease'
                }} 
              />
            )}
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {getStatusText()}
            </Typography>
          </Box>
        </Tooltip>

        {/* Auto-save ID and Route ID are stored in the component but hidden from UI */}
        <div style={{ display: 'none' }}>
          <span>{autoSaveId}</span>
          <span>{routeId}</span>
        </div>

        {/* Save Permanently button */}
        <Tooltip title="Save this route permanently">
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => setShowSaveDialog(true)}
            disabled={!autoSaveId || status !== 'saved'}
            startIcon={<SaveIcon />}
            sx={{ 
              minWidth: 'auto', 
              py: 0.5, 
              px: 1,
              mr: 1,
              color: '#4CAF50', // Green color
              borderColor: '#4CAF50',
              '&:hover': {
                borderColor: '#388E3C', // Darker green on hover
                backgroundColor: 'rgba(76, 175, 80, 0.1)'
              },
              '&.Mui-disabled': {
                borderColor: 'rgba(76, 175, 80, 0.3)', // Faded green when disabled
                color: 'rgba(76, 175, 80, 0.3)'
              }
            }}
          >
            PUBLISH
          </Button>
        </Tooltip>

        {/* Clear button */}
        <Tooltip title="Clear auto-save state and remove from Firebase">
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleShowClearDialog}
            startIcon={<ClearIcon />}
            sx={{ 
              minWidth: 'auto', 
              py: 0.5, 
              px: 1,
              color: '#F44336', // Red color
              borderColor: '#F44336',
              '&:hover': {
                borderColor: '#D32F2F', // Darker red on hover
                backgroundColor: 'rgba(244, 67, 54, 0.1)'
              }
            }}
          >
            Clear
          </Button>
        </Tooltip>
      </Box>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={handleCloseDialog}>
        <DialogTitle>Save Route Permanently</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Route Name"
            fullWidth
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            error={!!saveError}
            helperText={saveError}
            disabled={isSaving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRoute} 
            disabled={!routeName.trim() || isSaving}
            variant="contained"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar 
        open={saveSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Route saved successfully!
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!saveError && !showSaveDialog} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {saveError}
        </Alert>
      </Snackbar>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onClose={handleCloseClearDialog}>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete your map. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleClearAutoSave} 
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AutoSavePanel;
