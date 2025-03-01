import React, { useEffect, useState } from 'react';
import { Drawer } from '@mui/material';
import { usePOIContext } from '../../context/POIContext';
import { POIType, POIMode } from '../../types/poi.types';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { POIDrawerProps, POIDrawerState } from './types';
import { StyledDrawer } from './POIDrawer.styles';
import { POI_ICONS, getIconDefinition } from '../../constants/poi-icons';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';
import PlacePOIIconSelection from '../PlacePOIIconSelection';
import PlacePOIInstructions from './PlacePOIInstructions';
import { PlaceLabel, getPlaceLabelAtPoint } from '../../utils/placeDetection';
import POIDetailsDrawer from '../POIDetailsDrawer/POIDetailsDrawer';

const POIDrawer: React.FC<POIDrawerProps> = ({ isOpen, onClose }) => {
  const { addPOI, poiMode, setPoiMode, pois } = usePOIContext();
  const { currentRoute } = useRouteContext();
  const [selectedPlace, setSelectedPlace] = useState<PlaceLabel | null>(null);
  const [state, setState] = React.useState<Omit<POIDrawerState, 'mode'>>({
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
  const [draggablePoiData, setDraggablePoiData] = React.useState<any[]>([]);
  const [selectedPoi, setSelectedPoi] = React.useState<any>(null);

  // Reset state when drawer closes
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
    }
  }, [isOpen]);

  const { map } = useMapContext();

  // Handle map click events for place selection
  useEffect(() => {
    if (!map || poiMode !== 'place') {
      setSelectedPlace(null);
      return;
    }

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const place = getPlaceLabelAtPoint(map, e.point);
      if (place) {
        // Get existing icons for this place
        const placeIcons = pois
          .filter((poi: POIType) => 
            poi.type === 'place' && 
            poi.placeId === place.id
          )
          .map((poi: POIType) => poi.icon);

        // Add icons to place object
        const placeWithIcons = {
          ...place,
          icons: placeIcons.length > 0 ? placeIcons : undefined
        };

        // If place has icons and we're in place mode, don't open drawer
        if (poiMode === 'place' && placeIcons.length > 0) {
          setSelectedPlace(placeWithIcons);
          // Open PlacePOIIconSelection directly
          setState(prev => ({
            ...prev,
            step: 'icon-select'
          }));
        } else {
          setSelectedPlace(placeWithIcons);
          setState(prev => ({
            ...prev,
            step: 'icon-select'
          }));
        }
      } else {
        setSelectedPlace(null);
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, poiMode, pois]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlace(null);
    }
  }, [isOpen]);

  const handleModeSelect = (newMode: POIMode) => {
    setState(prev => ({
      ...prev,
      step: 'icon-select'
    }));
    
    // Update POI mode in context
    setPoiMode(newMode);
  };

  const handlePlaceSelect = (placeId: string) => {
    // In place mode, check if place has icons
    if (poiMode === 'place') {
      const place = selectedPlace;
      if (place?.icons && place.icons.length > 0) {
        // Don't open drawer if place has icons
        return;
      }
    }
    
    setState(prev => ({
      ...prev,
      selectedPlaceId: placeId,
      step: 'icon-select'
    }));
  };

  const handleIconSelect = (icon: POIDrawerState['selectedIcon']) => {
    const category = POI_ICONS.find((icon_def) => icon_def.name === icon)?.category;
    if (!icon || !category) return;

    console.log('[POIDrawer] Handling icon select:', { icon, category });

    if (poiMode === 'place' && selectedPlace) {
      // If place has icons, don't handle icon selection here
      if (selectedPlace.icons && selectedPlace.icons.length > 0) {
        return;
      }
      // Place POIs are handled by PlacePOIDetailsDrawer
      return;
    } else {
      console.log('[POIDrawer] Setting drag preview for map POI:', { icon, category });
      // Set drag preview for map POI
      setDragPreview({ icon, category });
    }
  };

  const { setDragPreview } = useMapContext();

  const handleStartDrag = (icon: POIDrawerState['selectedIcon'], category: POIDrawerState['selectedCategory']) => {
    if (!icon || !category) return;
    // Set drag preview with POI data
    const dragPreviewData = {
      icon,
      category,
      type: 'draggable' as const,
      name: getIconDefinition(icon)?.label || 'New POI'
    };
    setDragPreview(dragPreviewData);

    // Add to draggable POI data array that will be displayed
    setDraggablePoiData(prev => [...prev, dragPreviewData]);
  };

  // Handle when a draggable POI is dropped on the map
  useEffect(() => {
    const handleDrop = (e: CustomEvent) => {
      const { lat, lng } = e.detail;
      const lastPoi = draggablePoiData[draggablePoiData.length - 1];
      if (lastPoi && lastPoi.type === 'draggable') {
        // Update the last POI with its final position
        const updatedPoi = {
          ...lastPoi,
          coordinates: [lng, lat] as [number, number]
        };
        setDraggablePoiData(prev => [...prev.slice(0, -1), updatedPoi]);
        setSelectedPoi(updatedPoi);
        setState(prev => ({
          ...prev,
          step: 'details'
        }));
      }
    };

    window.addEventListener('poi-dropped', handleDrop as EventListener);
    return () => {
      window.removeEventListener('poi-dropped', handleDrop as EventListener);
    };
  }, [draggablePoiData, addPOI]);

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
        if (poiMode === 'place') {
          return selectedPlace ? (
            <PlacePOIIconSelection
              place={selectedPlace}
              onBack={handleIconBack}
            />
          ) : (
            <PlacePOIInstructions />
          );
        }
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
            <POIDetailsDrawer
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
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="persistent"
      sx={(theme) => ({
        '& .MuiDrawer-paper': {
          width: {
            xs: '100%',
            sm: '320px',
            md: '320px'
          },
          height: {
            xs: '100%',
            sm: '100%'
          },
          border: 'none',
          backgroundColor: 'transparent',
          overflow: 'hidden',
          padding: {
            xs: theme.spacing(1),
            sm: theme.spacing(2)
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // Lower z-index to be behind elevation profile (which is 102)
          zIndex: 90
        }
      })}
    >
      <StyledDrawer>
        {renderContent()}
        
        {/* Display draggable POI data that will be saved to MongoDB */}
        <div 
          id="poi-data-for-mongo"
          style={{
            display: 'none' // Hide the metadata display
          }}
        >
          {JSON.stringify(draggablePoiData, null, 2)}
        </div>

      </StyledDrawer>
    </Drawer>
  );
};

export default POIDrawer;
