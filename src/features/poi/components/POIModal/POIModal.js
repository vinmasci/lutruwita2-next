import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Box, 
  Typography, 
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { POI_ICONS, getIconDefinition } from '../../constants/poi-icons';
import POIModeSelection from '../POIDrawer/POIModeSelection';
import POIIconSelection from '../POIDrawer/POIIconSelection';
import POIDetailsModal from '../POIDetailsModal/POIDetailsModal';

const POIModal = ({ isOpen, onClose }) => {
  const { addPOI, poiMode, setPoiMode, pois } = usePOIContext();
  const { currentRoute } = useRouteContext();
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [state, setState] = React.useState({
    step: 'mode-select',
    selectedCategory: null,
    selectedIcon: null,
    selectedLocation: null,
    selectedPlaceId: null,
    formData: null,
    isSubmitting: false,
    error: null,
  });
  
  // State to store draggable POI data that will be displayed and saved to MongoDB
  const [draggablePoiData, setDraggablePoiData] = React.useState([]);
  const [selectedPoi, setSelectedPoi] = React.useState(null);
  
  // Reset state when modal closes or initialize to icon-select when opened
  React.useEffect(() => {
    if (!isOpen) {
      setState({
        step: 'mode-select',
        selectedCategory: null,
        selectedIcon: null,
        selectedLocation: null,
        selectedPlaceId: null,
        formData: null,
        isSubmitting: false,
        error: null,
      });
      setPoiMode('none');
    } else {
      // Skip mode selection and go directly to icon selection with 'regular' mode
      setState(prev => ({
        ...prev,
        step: 'icon-select'
      }));
      setPoiMode('regular');
    }
  }, [isOpen]);
  
  const { map } = useMapContext();
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlace(null);
    }
  }, [isOpen]);
  
  const handleModeSelect = (newMode) => {
    setState(prev => ({
      ...prev,
      step: 'icon-select'
    }));
    // Update POI mode in context
    setPoiMode(newMode);
  };
  
  const handleIconSelect = (icon) => {
    const category = POI_ICONS.find((icon_def) => icon_def.name === icon)?.category;
    if (!icon || !category) return;
    
    console.log('[POIModal] Handling icon select:', { icon, category });
    
    console.log('[POIModal] Setting drag preview for map POI:', { icon, category });
    // Set drag preview for map POI
    setDragPreview({ icon, category });
    
    console.log('[POIModal] Drag preview set, waiting for user to drag and drop');
  };
  
  const { setDragPreview } = useMapContext();
  
  const handleStartDrag = (icon, category) => {
    if (!icon || !category) return;
    
    console.log('[POIModal] Starting drag for icon:', { icon, category });
    
    // Set drag preview with POI data
    const dragPreviewData = {
      icon,
      category,
      type: 'draggable',
      name: getIconDefinition(icon)?.label || 'New POI'
    };
    
    console.log('[POIModal] Setting drag preview data:', dragPreviewData);
    
    setDragPreview(dragPreviewData);
    
    // Add to draggable POI data array that will be displayed
    setDraggablePoiData(prev => [...prev, dragPreviewData]);
    
    console.log('[POIModal] Drag preview set, waiting for drop event');
  };
  
  // Handle when a draggable POI is dropped on the map
  useEffect(() => {
    const handleDrop = (e) => {
      console.log('[POIModal] POI drop event received:', e.detail);
      
      const { lat, lng } = e.detail;
      const lastPoi = draggablePoiData[draggablePoiData.length - 1];
      
      console.log('[POIModal] Last POI in draggable data:', lastPoi);
      
      if (lastPoi && lastPoi.type === 'draggable') {
        // Update the last POI with its final position
        const updatedPoi = {
          ...lastPoi,
          coordinates: [lng, lat]
        };
        
        console.log('[POIModal] Updated POI with coordinates:', {
          updatedPoi,
          coordinatesString: `${lng.toFixed(6)}, ${lat.toFixed(6)}`
        });
        
        setDraggablePoiData(prev => [...prev.slice(0, -1), updatedPoi]);
        
        // Don't set selectedPoi or change state to 'details' here
        // Let MapView handle the POI details drawer
        
        console.log('[POIModal] POI updated, letting MapView handle details entry');
      } else {
        console.log('[POIModal] No valid POI found for drop event');
      }
    };
    
    console.log('[POIModal] Adding poi-dropped event listener');
    window.addEventListener('poi-dropped', handleDrop);
    
    return () => {
      console.log('[POIModal] Removing poi-dropped event listener');
      window.removeEventListener('poi-dropped', handleDrop);
    };
  }, [draggablePoiData]);
  
  const handleIconBack = () => {
    setState(prev => ({
      ...prev,
      step: 'mode-select',
      selectedCategory: null,
      selectedIcon: null
    }));
    setPoiMode('none');
  };
  
  const renderContent = () => {
    switch (state.step) {
      case 'mode-select':
        return <POIModeSelection onModeSelect={handleModeSelect} />;
      case 'icon-select':
        return (
          <POIIconSelection 
            mode={poiMode} 
            selectedIcon={state.selectedIcon} 
            onIconSelect={handleIconSelect} 
            onBack={handleIconBack} 
            startDrag={handleStartDrag} 
          />
        );
      case 'details':
        if (selectedPoi) {
          return (
            <POIDetailsModal 
              isOpen={true} 
              onClose={() => {
                setState(prev => ({
                  ...prev,
                  step: 'mode-select'
                }));
                setSelectedPoi(null);
              }} 
              iconName={selectedPoi.icon} 
              category={selectedPoi.category} 
              onSave={(details) => {
                addPOI({
                  ...selectedPoi,
                  ...details
                });
                setState(prev => ({
                  ...prev,
                  step: 'mode-select',
                  selectedCategory: null,
                  selectedIcon: null
                }));
                setPoiMode('none');
                setSelectedPoi(null);
              }} 
            />
          );
        }
        return null;
      default:
        return <POIModeSelection onModeSelect={handleModeSelect} />;
    }
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableScrollLock={true}
      disableAutoFocus={true}
      keepMounted={true}
      PaperProps={{
        style: {
          backgroundColor: 'rgba(35, 35, 35, 0.8)',
          color: 'white',
          maxHeight: '80vh'
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          position: 'absolute'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            {state.step === 'mode-select' ? 'Add Point of Interest' : 
             state.step === 'icon-select' ? 'Choose POI Type' : 
             'POI Details'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ 
        padding: '16px', 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgb(45, 45, 45)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgb(100, 100, 100)',
          borderRadius: '4px',
        },
      }}>
        {renderContent()}
        
        {/* Hidden metadata display */}
        <div 
          id="poi-data-for-mongo" 
          style={{ display: 'none' }}
        >
          {JSON.stringify(draggablePoiData, null, 2)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POIModal;
