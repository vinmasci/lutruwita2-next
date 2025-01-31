import React, { useEffect } from 'react';
import { Drawer } from '@mui/material';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { POIDrawerProps, POIDrawerState, POIFormData } from './types';
import { StyledDrawer } from './POIDrawer.styles';
import { createPOIPhotos } from '../../utils/photo';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';
import POIDetailsForm from './POIDetailsForm';

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

  const handleCategorySelect = (category: POIDrawerState['selectedCategory']) => {
    setState(prev => ({
      ...prev,
      selectedCategory: category,
      selectedIcon: null
    }));
  };

  const handleIconSelect = (icon: POIDrawerState['selectedIcon']) => {
    setState(prev => ({
      ...prev,
      selectedIcon: icon
    }));
  };

  const { setDragPreview } = useMapContext();

  const handleStartDrag = (icon: POIDrawerState['selectedIcon'], category: POIDrawerState['selectedCategory']) => {
    if (!icon || !category) return;
    // Set drag preview and close drawer
    setDragPreview({ icon, category });
    onClose();
  };

  const handleIconBack = () => {
    setState(prev => ({
      ...prev,
      step: 'mode-select',
      selectedCategory: null,
      selectedIcon: null
    }));
  };

  const handleIconNext = () => {
    if (!state.selectedIcon || !state.selectedCategory) return;

    setState(prev => ({
      ...prev,
      step: 'details',
      formData: {
        name: '',
        description: '',
        category: prev.selectedCategory!,
        icon: prev.selectedIcon!,
        photos: []
      }
    }));
  };

  const handleDetailsBack = () => {
    setState(prev => ({
      ...prev,
      step: 'icon-select',
      formData: null
    }));
  };

  const handleDetailsSubmit = async (data: POIFormData) => {
    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Convert photos to base64 URLs
      const photos = data.photos?.length 
        ? await createPOIPhotos(data.photos)
        : undefined;

      const baseData = {
        ...data,
        photos,
        category: data.category,
        icon: data.icon
      };

      if (state.mode === 'map' && state.selectedLocation) {
        await addPOI({
          ...baseData,
          type: 'draggable',
          position: state.selectedLocation,
        });
      } else if (state.mode === 'place' && state.selectedPlaceId) {
        await addPOI({
          ...baseData,
          type: 'place',
          placeId: state.selectedPlaceId,
          position: state.selectedLocation!, // Position from place
        });
      }

      onClose();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create POI'
      }));
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const renderContent = () => {
    switch (state.step) {
      case 'mode-select':
        return <POIModeSelection onModeSelect={handleModeSelect} />;
      case 'icon-select':
        return state.mode && (
          <POIIconSelection
            mode={state.mode}
            selectedCategory={state.selectedCategory}
            selectedIcon={state.selectedIcon}
            onCategorySelect={handleCategorySelect}
            onIconSelect={handleIconSelect}
            onBack={handleIconBack}
            onNext={handleIconNext}
            startDrag={handleStartDrag}
          />
        );
      case 'details':
        return state.mode && state.formData && (
          <POIDetailsForm
            mode={state.mode}
            initialData={state.formData}
            onSubmit={handleDetailsSubmit}
            onBack={handleDetailsBack}
            isSubmitting={state.isSubmitting}
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
