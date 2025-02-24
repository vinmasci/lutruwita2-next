import { useEffect, useState } from 'react';
import { useRouteState } from '../../hooks/useRouteState';
import { ProcessedRoute, RouteListItem } from '../../types/route.types';
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
  ClickAwayListener,
  Box,
  useTheme,
  Popover,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { styled } from '@mui/material/styles';

const ColorButton = styled(Box)(({ theme }) => ({
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
  }
}));

const PRESET_COLORS = [
  '#f44336', // Red
  '#e91e63', // Pink
  '#9c27b0', // Purple
  '#673ab7', // Deep Purple
  '#3f51b5', // Indigo
  '#2196f3', // Blue
  '#03a9f4', // Light Blue
  '#00bcd4', // Cyan
  '#009688', // Teal
  '#4caf50', // Green
  '#8bc34a', // Light Green
  '#cddc39', // Lime
  '#ffeb3b', // Yellow
  '#ffc107', // Amber
  '#ff9800', // Orange
  '#ff5722'  // Deep Orange
];

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
    updateRoute,
  } = useRouteState();

  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('');
  const [customColorError, setCustomColorError] = useState('');

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

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, routeId: string) => {
    event.stopPropagation();
    setColorAnchorEl(event.currentTarget);
    setSelectedRouteId(routeId);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
    setSelectedRouteId(null);
  };

  const handleColorSelect = (color: string) => {
    if (selectedRouteId) {
      updateRoute(selectedRouteId, { color });
      handleColorClose();
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
        {routes.map((route: ProcessedRoute) => (
          <StyledListItem
            key={route.id}
            className={`${currentRoute?.id === route.id ? 'selected' : ''} ${route.isFocused ? 'focused' : ''}`}
            sx={{ 
              cursor: 'pointer',
              '&.focused': {
                backgroundColor: 'rgba(74, 158, 255, 0.15)',
                borderLeft: '3px solid #4a9eff',
              }
            }}
          >
            {editingRouteId === route.id ? (
              <ClickAwayListener onClickAway={() => setEditingRouteId(null)}>
                <TextField
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && route.id) {
                      updateRoute(route.id, { name: editingName });
                      setEditingRouteId(null);
                    } else if (e.key === 'Escape') {
                      setEditingRouteId(null);
                    }
                  }}
                  autoFocus
                  fullWidth
                  size="small"
                  variant="outlined"
                  type="text"
                  inputProps={{
                    'aria-label': 'Edit route name'
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.4)'
                      }
                    }
                  }}
                />
              </ClickAwayListener>
            ) : (
              <>
                <ListItemText 
                  primary={route.name}
                  secondary={
                    <Box sx={{ 
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      mt: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <span>{(route.statistics.totalDistance / 1000).toFixed(1)}km</span>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className="fa-solid fa-up-right" style={{ color: '#2196f3' }}></i>
                        <span>{route.statistics.elevationGain}m</span>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className="fa-solid fa-down-right" style={{ color: '#2196f3' }}></i>
                        <span>{route.statistics.elevationLoss}m</span>
                      </Box>
                    </Box>
                  }
                  sx={{ color: 'white' }}
                  onClick={() => {
                    if (route.isFocused && route.routeId) {
                      unfocusRoute(route.routeId);
                    } else if (route.routeId) {
                      focusRoute(route.routeId);
                    }
                  }}
                  onDoubleClick={() => {
                    if (route.routeId) {
                      setEditingRouteId(route.routeId);
                      setEditingName(route.name);
                    }
                  }}
                />
                <Box sx={{ position: 'absolute', right: '40px', top: '32px', display: 'flex', gap: 1 }}>
                  <ColorButton
                    onClick={(e) => handleColorClick(e, route.id)}
                    sx={{ backgroundColor: route.color }}
                  />
                  <Box
                    sx={{
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.7,
                      padding: '4px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&:active': {
                        cursor: 'grabbing',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      },
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Box>
                </Box>
              </>
            )}
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

      {/* Color Picker Popover */}
      <Popover
        open={Boolean(colorAnchorEl)}
        anchorEl={colorAnchorEl}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ 
          p: 2,
          backgroundColor: 'rgba(35, 35, 35, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 0.5
          }}>
            {PRESET_COLORS.map((color) => (
              <ColorButton
                key={color}
                onClick={() => handleColorSelect(color)}
                sx={{ backgroundColor: color }}
              />
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              label="Custom Color"
              placeholder="#RRGGBB"
              value={customColor}
              onChange={(e) => {
                const value = e.target.value;
                setCustomColor(value);
                if (value && !value.match(/^#[0-9A-Fa-f]{6}$/)) {
                  setCustomColorError('Invalid hex color');
                } else {
                  setCustomColorError('');
                }
              }}
              error={!!customColorError}
              helperText={customColorError}
              size="small"
              sx={{
                flex: 1,
                '& .MuiInputBase-root': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
              }}
            />
            <Button
              variant="contained"
              disabled={!customColor || !!customColorError}
              onClick={() => {
                if (customColor && !customColorError) {
                  handleColorSelect(customColor);
                  setCustomColor('');
                }
              }}
              sx={{ minWidth: 'auto' }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>

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
            variant="outlined"
            type="text"
            inputProps={{
              'aria-label': 'Route name'
            }}
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
          sx={{ 
            width: '100%',
            backgroundColor: 'rgb(22, 11, 11)',
            color: '#fff',
            '& .MuiAlert-icon': {
              color: '#f44336'
            }
          }}
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
          sx={{ 
            width: '100%',
            backgroundColor: 'rgb(11, 22, 11)',
            color: '#fff',
            '& .MuiAlert-icon': {
              color: '#4caf50'
            }
          }}
        >
          Operation completed successfully
        </Alert>
      </Snackbar>
    </>
  );
};
