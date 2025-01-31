import React, { useEffect } from 'react';
import { Drawer } from '@mui/material';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { POIDrawerProps, POIDrawerState, POIFormData } from './types';
import { StyledDrawer } from './POIDrawer.styles';
import { createPOIPhotos } from '../../utils/photo';
import { POI_ICONS } from '../../constants/poi-icons';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';

const POIDrawer: React.FC<POIDrawerProps> = ({ isOpen, onClose }) => {
  const { addPOI } = usePOIContext();
  const [state, setState] = React.useState<POIDrawerState>({
    mode: null,
    step: 'mode-select',
    selectedCategory: null,
    selectedIcon: null,
    selectedLocation: null,
    selectedPlaceId: null,
    formData: null,
    isSubmitting: false,
    error: null,
  });

  // Reset state when drawer closes
  React.useEffect(() => {
    if (!isOpen) {
      setState({
        mode: null,
        step: 'mode-select',
        selectedCategory: null,
        selectedIcon: null,
        selectedLocation: null,
        selectedPlaceId: null,
        formData: null,
        isSubmitting: false,
        error: null,
      });
    }
  }, [isOpen]);

  const { setPoiPlacementMode, setPoiPlacementClick } = useMapContext();

  // Reset placement mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPoiPlacementMode(false);
      setPoiPlacementClick(undefined);
    }
  }, [isOpen, setPoiPlacementMode, setPoiPlacementClick]);

  const handleModeSelect = (mode: POIDrawerState['mode']) => {
    setState(prev => ({
      ...prev,
      mode,
      // Skip location-select, go straight to icon selection
      step: 'icon-select'
    }));
  };

  const handlePlaceSelect = (placeId: string) => {
    setState(prev => ({
      ...prev,
      selectedPlaceId: placeId,
      step: 'icon-select'
    }));
  };

  const handleIconSelect = (icon: POIDrawerState['selectedIcon']) => {
    const category = POI_ICONS.find((icon_def) => icon_def.name === icon)?.category;
    if (!icon || !category) return;

    // Set drag preview and let MapView handle the details
    setDragPreview({ icon, category });
  };

  const { setDragPreview } = useMapContext();

  const handleStartDrag = (icon: POIDrawerState['selectedIcon'], category: POIDrawerState['selectedCategory']) => {
    if (!icon || !category) return;
    // Set drag preview
    setDragPreview({ icon, category });
  };

  const handleIconBack = () => {
    setState(prev => ({
      ...prev,
      step: 'mode-select',
      selectedCategory: null,
      selectedIcon: null
    }));
  };

  const renderContent = () => {
    switch (state.step) {
      case 'mode-select':
        return <POIModeSelection onModeSelect={handleModeSelect} />;
      case 'icon-select':
        return state.mode && (
          <POIIconSelection
            mode={state.mode}
            selectedIcon={state.selectedIcon}
            onIconSelect={handleIconSelect}
            onBack={handleIconBack}
            startDrag={handleStartDrag}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: 'auto',
          border: 'none',
          backgroundColor: 'transparent'
        }
      }}
    >
      <StyledDrawer>
        {renderContent()}
      </StyledDrawer>
    </Drawer>
  );
};

export default POIDrawer;
