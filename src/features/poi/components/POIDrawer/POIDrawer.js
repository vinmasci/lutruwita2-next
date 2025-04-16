import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Drawer } from '@mui/material';
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { StyledDrawer } from './POIDrawer.styles';
import { POI_ICONS, getIconDefinition } from '../../constants/poi-icons';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';
// Place POI functionality is commented out
// import PlacePOIIconSelection from '../PlacePOIIconSelection';
// import PlacePOIInstructions from './PlacePOIInstructions';
// import { getPlaceLabelAtPoint } from '../../utils/placeDetection';
import POIDetailsDrawer from '../POIDetailsDrawer/POIDetailsDrawer';
const POIDrawer = ({ isOpen, onClose }) => {
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
    // Reset state when drawer closes or initialize to icon-select when opened
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
    // Place POI functionality is commented out
    /*
    // Handle map click events for place selection
    useEffect(() => {
        if (!map || poiMode !== 'place') {
            setSelectedPlace(null);
            return;
        }
        const handleClick = (e) => {
            const place = getPlaceLabelAtPoint(map, e.point);
            if (place) {
                // Get existing icons for this place
                const placeIcons = pois
                    .filter((poi) => poi.type === 'place' &&
                    poi.placeId === place.id)
                    .map((poi) => poi.icon);
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
                }
                else {
                    setSelectedPlace(placeWithIcons);
                    setState(prev => ({
                        ...prev,
                        step: 'icon-select'
                    }));
                }
            }
            else {
                setSelectedPlace(null);
            }
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, poiMode, pois]);
    */
    // Reset state when drawer closes
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
    // Place POI functionality is commented out
    /*
    const handlePlaceSelect = (placeId) => {
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
    */
    const handleIconSelect = (icon) => {
        const category = POI_ICONS.find((icon_def) => icon_def.name === icon)?.category;
        if (!icon || !category)
            return;
        console.log('[POIDrawer] Handling icon select:', { icon, category });
        // Place POI functionality is commented out
        /*
        if (poiMode === 'place' && selectedPlace) {
            // If place has icons, don't handle icon selection here
            if (selectedPlace.icons && selectedPlace.icons.length > 0) {
                return;
            }
            // Place POIs are handled by PlacePOIDetailsDrawer
            return;
        }
        else {
        */
            console.log('[POIDrawer] Setting drag preview for map POI:', { icon, category });
            // Set drag preview for map POI
            setDragPreview({ icon, category });
            
            console.log('[POIDrawer] Drag preview set, waiting for user to drag and drop');
        /*
        }
        */
    };
    const { setDragPreview } = useMapContext();
    const handleStartDrag = (icon, category) => {
        if (!icon || !category)
            return;
            
        console.log('[POIDrawer] Starting drag for icon:', { icon, category });
        
        // Set drag preview with POI data
        const dragPreviewData = {
            icon,
            category,
            type: 'draggable',
            name: getIconDefinition(icon)?.label || 'New POI'
        };
        
        console.log('[POIDrawer] Setting drag preview data:', dragPreviewData);
        
        setDragPreview(dragPreviewData);
        
        // Add to draggable POI data array that will be displayed
        setDraggablePoiData(prev => [...prev, dragPreviewData]);
        
        console.log('[POIDrawer] Drag preview set, waiting for drop event');
    };
    // Use a ref to store the latest draggablePoiData without causing re-renders
    const draggablePoiDataRef = React.useRef(draggablePoiData);
    
    // Update the ref whenever draggablePoiData changes
    useEffect(() => {
        draggablePoiDataRef.current = draggablePoiData;
    }, [draggablePoiData]);
    
    // Handle when a draggable POI is dropped on the map
    // This effect should only run once when the component mounts
    useEffect(() => {
        const handleDrop = (e) => {
            console.log('[POIDrawer] POI drop event received:', e.detail);
            
            const { lat, lng } = e.detail;
            // Use the ref to access the latest draggablePoiData
            const currentDraggablePoiData = draggablePoiDataRef.current;
            const lastPoi = currentDraggablePoiData[currentDraggablePoiData.length - 1];
            
            console.log('[POIDrawer] Last POI in draggable data:', lastPoi);
            
            if (lastPoi && lastPoi.type === 'draggable') {
                // Update the last POI with its final position
                const updatedPoi = {
                    ...lastPoi,
                    coordinates: [lng, lat]
                };
                
                console.log('[POIDrawer] Updated POI with coordinates:', {
                    updatedPoi,
                    coordinatesString: `${lng.toFixed(6)}, ${lat.toFixed(6)}`
                });
                
                setDraggablePoiData(prev => [...prev.slice(0, -1), updatedPoi]);
                
                // Don't set selectedPoi or change state to 'details' here
                // Let MapView handle the POI details drawer
                
                console.log('[POIDrawer] POI updated, letting MapView handle details entry');
            } else {
                console.log('[POIDrawer] No valid POI found for drop event');
            }
        };
        
        console.log('[POIDrawer] Adding poi-dropped event listener');
        window.addEventListener('poi-dropped', handleDrop);
        
        return () => {
            console.log('[POIDrawer] Removing poi-dropped event listener');
            window.removeEventListener('poi-dropped', handleDrop);
        };
    }, []); // Empty dependency array ensures this only runs once on mount
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
                return _jsx(POIModeSelection, { onModeSelect: handleModeSelect });
            case 'icon-select':
                // Place POI functionality is commented out
                /*
                if (poiMode === 'place') {
                    return selectedPlace ? (_jsx(PlacePOIIconSelection, { place: selectedPlace, onBack: handleIconBack })) : (_jsx(PlacePOIInstructions, {}));
                }
                */
                return (_jsx(POIIconSelection, { mode: poiMode, selectedIcon: state.selectedIcon, onIconSelect: handleIconSelect, onBack: handleIconBack, startDrag: handleStartDrag }));
      case 'details':
        if (selectedPoi) {
          return (_jsx(POIDetailsDrawer, { isOpen: true, onClose: () => {
            setState(prev => ({
              ...prev,
              step: 'mode-select'
            }));
            setSelectedPoi(null);
          }, iconName: selectedPoi.icon, category: selectedPoi.category, onSave: (details) => {
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
          } }));
        }
        return null;
            default:
                return _jsx(POIModeSelection, { onModeSelect: handleModeSelect });
        }
    };
    return (_jsx(Drawer, { anchor: "left", open: isOpen, onClose: onClose, variant: "persistent", sx: {
            '& .MuiDrawer-paper': {
                width: '264px',
                border: 'none',
                backgroundColor: 'transparent',
                overflowY: 'auto',
                height: '100%'
            }
        }, children: _jsxs(StyledDrawer, { children: [renderContent(), _jsx("div", { id: "poi-data-for-mongo", style: {
                        display: 'none' // Hide the metadata display
                    }, children: JSON.stringify(draggablePoiData, null, 2) })] }) }));
};
export default POIDrawer;
