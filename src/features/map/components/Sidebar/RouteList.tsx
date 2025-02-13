import { useEffect } from 'react';
import { useRouteState } from '../../hooks/useRouteState';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { styled } from '@mui/material/styles';
import { useState } from 'react';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  backgroundColor: 'rgba(35, 35, 35, 0.9)',
  marginBottom: '8px',
  borderRadius: '4px',
  transition: 'all 0.2s ease-in-out',
  border: '1px solid transparent',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transform: 'translateX(4px)',
  },
  '&.selected': {
    backgroundColor: 'rgba(55, 55, 55, 0.95)',
    borderLeft: '3px solid #4a9eff',
    paddingLeft: '13px',
  }
}));

const SaveDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: 'rgba(35, 35, 35, 0.95)',
    color: 'white',
    minWidth: '400px',
  }
}));

export const RouteList = () => {
  const {
    routes,
    currentRoute,
    savedRoutes,
    isSaving,
    isLoading,
    error,
    saveRoute,
    loadRoute,
    listRoutes,
    deleteRoute,
    clearError,
    focusRoute,
    unfocusRoute,
    getFocusedRoute,
  } = useRouteState();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    type: 'tourism' as const,
    isPublic: false,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    listRoutes();
  }, [listRoutes]);

  const handleSaveClick = () => {
    console.log('Save button clicked, opening dialog');
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    try {
      console.log('Attempting to save route with form:', saveForm);
      await saveRoute(saveForm);
      console.log('Route saved successfully');
      setSaveDialogOpen(false);
      setShowSuccess(true);
      setSaveForm({ name: '', type: 'tourism', isPublic: false });
    } catch (err) {
      // Error will be handled by the error state
    }
  };

  const handleLoadClick = async (id: string) => {
    try {
      await loadRoute(id);
      setShowSuccess(true);
    } catch (err) {
      // Error will be handled by the error state
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteRoute(id);
      setShowSuccess(true);
    } catch (err) {
      // Error will be handled by the error state
    }
  };

  return (
    <>
      {/* Current Routes Section */}
      <List sx={{ width: '100%', padding: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveClick}
          disabled={routes.length === 0 || isSaving}
          fullWidth
          sx={{ marginBottom: 2 }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Current Route'}
        </Button>

        {/* Local Routes */}
        {routes.map((route) => (
          <StyledListItem
            key={route.id}
            className={`${currentRoute?.routeId === route.routeId ? 'selected' : ''} ${route.isFocused ? 'focused' : ''}`}
            sx={{ 
              cursor: 'pointer',
              '&.focused': {
                backgroundColor: 'rgba(74, 158, 255, 0.15)',
                borderLeft: '3px solid #4a9eff',
              }
            }}
            onClick={() => {
              if (route.isFocused) {
                unfocusRoute(route.routeId);
              } else {
                focusRoute(route.routeId);
              }
            }}
          >
            <ListItemText 
              primary={route.name}
              secondary={`${(route.statistics.totalDistance / 1000).toFixed(1)}km`}
              sx={{ color: 'white' }}
            />
          </StyledListItem>
        ))}

        {/* Divider if both local and saved routes exist */}
        {routes.length > 0 && savedRoutes.length > 0 && (
          <ListItem sx={{ justifyContent: 'center', padding: '16px 0' }}>
            <ListItemText 
              primary="Saved Routes"
              sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}
            />
          </ListItem>
        )}

        {/* Saved Routes */}
        {isLoading ? (
          <ListItem sx={{ justifyContent: 'center' }}>
            <CircularProgress />
          </ListItem>
        ) : (
          savedRoutes.map((route) => (
            <StyledListItem
              key={route.id}
              onClick={() => handleLoadClick(route.id)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemText 
                primary={route.name}
                secondary={`Type: ${route.type}`}
                sx={{ color: 'white' }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => handleDeleteClick(e, route.id)}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </StyledListItem>
          ))
        )}
      </List>

      {/* Save Dialog */}
      <SaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
      >
        <DialogTitle>Save Route</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Route Name"
            fullWidth
            value={saveForm.name}
            onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ marginBottom: 2 }}
          />
          <FormControl fullWidth sx={{ marginBottom: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={saveForm.type}
              label="Type"
              onChange={(e) => setSaveForm(prev => ({ 
                ...prev, 
                type: e.target.value as typeof saveForm.type 
              }))}
            >
              <MenuItem value="tourism">Tourism</MenuItem>
              <MenuItem value="event">Event</MenuItem>
              <MenuItem value="bikepacking">Bikepacking</MenuItem>
              <MenuItem value="single">Single</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={saveForm.isPublic}
                onChange={(e) => setSaveForm(prev => ({ 
                  ...prev, 
                  isPublic: e.target.checked 
                }))}
              />
            }
            label="Make Public"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveConfirm}
            disabled={!saveForm.name || isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </SaveDialog>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={clearError}
      >
        <Alert 
          onClose={clearError} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Operation completed successfully
        </Alert>
      </Snackbar>
    </>
  );
};
