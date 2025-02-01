import React, { useEffect, useState } from 'react';
import { Drawer } from '@mui/material';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { POIDrawerProps, POIDrawerState, POIFormData } from './types';
import { StyledDrawer } from './POIDrawer.styles';
import { createPOIPhotos } from '../../utils/photo';
import { POI_ICONS } from '../../constants/poi-icons';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';
import PlacePOIIconSelection from '../PlacePOIIconSelection';
import PlacePOIInstructions from './PlacePOIInstructions';
import { PlaceLabel, getPlaceLabelAtPoint } from '../../utils/placeDetection';

const POIDrawer: React.FC<POIDrawerProps> = ({ isOpen, onClose }) => {
  const { addPOI } = usePOIContext();
  const [selectedPlace, setSelectedPlace] = useState<PlaceLabel | null>(null);
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

  const { map, setPoiPlacementMode, setPoiPlacementClick } = useMapContext();

  // Handle map click events for place selection
  useEffect(() => {
    if (!map || state.mode !== 'place') {
      setSelectedPlace(null);
      return;
    }

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      setSelectedPlace(place);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, state.mode]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPoiPlacementMode(false);
      setPoiPlacementClick(undefined);
      setSelectedPlace(null);
    }
  }, [isOpen, setPoiPlacementMode, setPoiPlacementClick]);

  const handleModeSelect = (mode: POIDrawerState['mode']) => {
    setState(prev => ({
      ...prev,
      mode,
      // Skip location-select, go straight to icon selection
      step: 'icon-select'
    }));
    
    // Enable place mode highlighting when "Add POI to Place" is selected
    setPoiPlacementMode(mode === 'place');
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

    if (state.mode === 'place' && selectedPlace) {
      // Create place POI
      addPOI({
        type: 'place',
        placeId: selectedPlace.id,
        name: selectedPlace.name,
        position: {
          lat: selectedPlace.coordinates[1],
          lng: selectedPlace.coordinates[0]
        },
        category,
        icon,
      });
    } else {
      // Set drag preview for map POI
      setDragPreview({ icon, category });
    }
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
    // Reset place mode when going back to mode selection
    setPoiPlacementMode(false);
  };

  const renderContent = () => {
    switch (state.step) {
      case 'mode-select':
        return <POIModeSelection onModeSelect={handleModeSelect} />;
      case 'icon-select':
        if (state.mode === 'place') {
          return selectedPlace ? (
            <PlacePOIIconSelection
              place={selectedPlace}
              onBack={handleIconBack}
            />
          ) : (
            <PlacePOIInstructions />
          );
        }
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
