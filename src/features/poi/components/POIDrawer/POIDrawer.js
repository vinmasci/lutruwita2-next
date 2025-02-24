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
import PlacePOIIconSelection from '../PlacePOIIconSelection';
import PlacePOIInstructions from './PlacePOIInstructions';
import { getPlaceLabelAtPoint } from '../../utils/placeDetection';
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
    const handleIconSelect = (icon) => {
        const category = POI_ICONS.find((icon_def) => icon_def.name === icon)?.category;
        if (!icon || !category)
            return;
        console.log('[POIDrawer] Handling icon select:', { icon, category });
        if (poiMode === 'place' && selectedPlace) {
            // If place has icons, don't handle icon selection here
            if (selectedPlace.icons && selectedPlace.icons.length > 0) {
                return;
            }
            // Place POIs are handled by PlacePOIDetailsDrawer
            return;
        }
        else {
            console.log('[POIDrawer] Setting drag preview for map POI:', { icon, category });
            // Set drag preview for map POI
            setDragPreview({ icon, category });
        }
    };
    const { setDragPreview } = useMapContext();
    const handleStartDrag = (icon, category) => {
        if (!icon || !category)
            return;
        // Set drag preview with POI data
        const dragPreviewData = {
            icon,
            category,
            type: 'draggable',
            name: getIconDefinition(icon)?.label || 'New POI'
        };
        setDragPreview(dragPreviewData);
        // Add to draggable POI data array that will be displayed
        setDraggablePoiData(prev => [...prev, dragPreviewData]);
    };
    // Handle when a draggable POI is dropped on the map
    useEffect(() => {
        const handleDrop = (e) => {
            const { lat, lng } = e.detail;
            const lastPoi = draggablePoiData[draggablePoiData.length - 1];
            if (lastPoi && lastPoi.type === 'draggable') {
                // Update the last POI with its final position
                const updatedPoi = {
                    ...lastPoi,
                    coordinates: [lng, lat]
                };
                setDraggablePoiData(prev => [...prev.slice(0, -1), updatedPoi]);
                setSelectedPoi(updatedPoi);
                setState(prev => ({
                    ...prev,
                    step: 'details'
                }));
            }
        };
        window.addEventListener('poi-dropped', handleDrop);
        return () => {
            window.removeEventListener('poi-dropped', handleDrop);
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
                return _jsx(POIModeSelection, { onModeSelect: handleModeSelect });
            case 'icon-select':
                if (poiMode === 'place') {
                    return selectedPlace ? (_jsx(PlacePOIIconSelection, { place: selectedPlace, onBack: handleIconBack })) : (_jsx(PlacePOIInstructions, {}));
                }
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
                overflow: 'hidden'
            }
        }, children: _jsxs(StyledDrawer, { children: [renderContent(), _jsx("div", { id: "poi-data-for-mongo", style: {
                        display: 'none' // Hide the metadata display
                    }, children: JSON.stringify(draggablePoiData, null, 2) })] }) }));
};
export default POIDrawer;
