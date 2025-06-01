import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, TextField, Box, Typography, CircularProgress, Rating, List, ListItem, ListItemText, ListItemIcon, Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import StarIcon from '@mui/icons-material/Star';

// Debounce function to limit API calls
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};
import { usePOIContext } from '../../context/POIContext';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { StyledDrawer } from './POIDrawer.styles';
import { POI_ICONS, getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { Button, Divider } from '@mui/material';
import POIModeSelection from './POIModeSelection';
import POIIconSelection from './POIIconSelection';
// Place POI functionality is commented out
// import PlacePOIIconSelection from '../PlacePOIIconSelection';
// import PlacePOIInstructions from './PlacePOIInstructions';
// import { getPlaceLabelAtPoint } from '../../utils/placeDetection';
import POIDetailsDrawer from '../POIDetailsDrawer/POIDetailsDrawer';
const POIDrawer = ({ isOpen, onClose }) => {
    const { addPOI, poiMode, setPoiMode, pois, searchPlaces, processGooglePlacesLink } = usePOIContext();
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
    
    // State for Google Places search functionality
    const [searchName, setSearchName] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [googlePlacesLink, setGooglePlacesLink] = useState('');
    const [googlePlacesData, setGooglePlacesData] = useState(null);
    const [isProcessingLink, setIsProcessingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);
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
            
            // Reset Google Places search state
            setSearchName('');
            setSearchResults([]);
            setIsSearching(false);
            setSearchError(null);
            setGooglePlacesLink('');
            setGooglePlacesData(null);
            setIsProcessingLink(false);
            setLinkError(null);
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
    
    // Auto-search for places when name changes
    const searchForPlaces = useCallback(async (searchName) => {
        if (!searchName || searchName.trim() === '' || !isOpen) {
            setSearchResults([]);
            return;
        }
        
        // Don't search if the name is just the default icon label
        if (draggablePoiData.length > 0) {
            const lastPoi = draggablePoiData[draggablePoiData.length - 1];
            const iconDef = getIconDefinition(lastPoi.icon);
            if (searchName === iconDef?.label) {
                setSearchResults([]);
                return;
            }
        }
        
        setIsSearching(true);
        setSearchError(null);
        
        try {
            // We need coordinates for the search
            if (draggablePoiData.length === 0 || !draggablePoiData[draggablePoiData.length - 1].coordinates) {
                console.warn('[POIDrawer] Cannot search without coordinates');
                setSearchError('Cannot search without coordinates');
                setIsSearching(false);
                return;
            }
            
            const coordinates = draggablePoiData[draggablePoiData.length - 1].coordinates;
            const results = await searchPlaces(searchName, coordinates);
            setSearchResults(results);
        } catch (error) {
            console.error('[POIDrawer] Error searching for places:', error);
            setSearchError('Error searching for places');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [isOpen, draggablePoiData, searchPlaces]);
    
    // Debounced version of searchForPlaces
    const debouncedSearch = useCallback(debounce(searchForPlaces, 800), [searchForPlaces]);
    
    // Process Google Places link when it changes
    const processLink = async (link) => {
        if (!link) {
            setGooglePlacesData(null);
            setIsProcessingLink(false);
            setLinkError(null);
            return;
        }
        
        setIsProcessingLink(true);
        setLinkError(null);
        
        try {
            const data = await processGooglePlacesLink(link);
            if (data) {
                setGooglePlacesData(data);
                // If we're manually updating a POI, set the name
                if (draggablePoiData.length > 0) {
                    // Get the default name based on the icon
                    const lastPoi = draggablePoiData[draggablePoiData.length - 1];
                    const iconDef = getIconDefinition(lastPoi.icon);
                    // If name is empty or default, use the place name
                    if (!searchName || searchName === iconDef?.label) {
                        setSearchName(data.name);
                    }
                }
            } else {
                setGooglePlacesData(null);
                setLinkError('Could not process Google Places link. Please check the format.');
            }
        } catch (error) {
            console.error('[POIDrawer] Error processing Google Places link:', error);
            setGooglePlacesData(null);
            setLinkError('Error processing link: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessingLink(false);
        }
    };
    
    // Debounced version of processLink
    const debouncedProcessLink = debounce(processLink, 800);
    
    // Handle place selection from search results
    const handleSelectPlace = async (place) => {
        if (!place || !place.placeId) return;
        
        // Set the name from the selected place
        setSearchName(place.name);
        
        // Set the Google Places link
        setGooglePlacesLink(place.url);
        
        // Process the link to get place details
        await processLink(place.url);
        
        // Clear search results after selection
        setSearchResults([]);
    };
    
    // Trigger search when searchName changes
    useEffect(() => {
        if (isOpen && searchName && searchName.trim() !== '') {
            debouncedSearch(searchName);
        } else {
            setSearchResults([]);
        }
    }, [isOpen, searchName, debouncedSearch]);
    
    // Process Google Places link when it changes
    useEffect(() => {
        if (googlePlacesLink) {
            debouncedProcessLink(googlePlacesLink);
        } else {
            setGooglePlacesData(null);
            setIsProcessingLink(false);
            setLinkError(null);
        }
    }, [googlePlacesLink]);
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
    // Handle POI save when using the Google Places functionality
    const handlePOISave = () => {
        if (draggablePoiData.length === 0 || !draggablePoiData[draggablePoiData.length - 1].coordinates) {
            console.error('[POIDrawer] Cannot save POI without coordinates');
            return;
        }
        
        const lastPoi = draggablePoiData[draggablePoiData.length - 1];
        
        // Get the Google Place ID from the data
        const googlePlaceId = googlePlacesData?.placeId;
        
        // Create POI with all details
        const poiDetails = {
            ...lastPoi,
            name: searchName || lastPoi.name,
            googlePlacesLink,
            // Add Google Places ID and data if available
            ...(googlePlaceId && { googlePlaceId }),
            ...(googlePlacesData && { googlePlaces: googlePlacesData })
        };
        
        // Add POI to context
        addPOI(poiDetails);
        
        // Clear form state
        setSearchName('');
        setGooglePlacesLink('');
        setGooglePlacesData(null);
        
        // Close the drawer
        onClose();
    };
    
    const renderContent = () => {
        switch (state.step) {
            case 'mode-select':
                return _jsx(POIModeSelection, { onModeSelect: handleModeSelect });
            case 'icon-select':
                // First, render the POI icon selection
                const selection = _jsx(POIIconSelection, { 
                    mode: poiMode, 
                    selectedIcon: state.selectedIcon, 
                    onIconSelect: handleIconSelect, 
                    onBack: handleIconBack, 
                    startDrag: handleStartDrag 
                });
                
                // If we have a POI with coordinates, also show the Google Places search form
                const hasPOIWithCoordinates = draggablePoiData.length > 0 && 
                                             draggablePoiData[draggablePoiData.length - 1].coordinates;
                
                if (hasPOIWithCoordinates) {
                    const lastPoi = draggablePoiData[draggablePoiData.length - 1];
                    
                    // Return both components - first the icon selection, then the details form
                    return _jsxs(Box, {
                        sx: { display: 'flex', flexDirection: 'column', gap: 2 },
                        children: [
                            selection,
                            _jsx(Divider, { sx: { my: 2 } }),
                            _jsx(Typography, { 
                                variant: "h6", 
                                sx: { mb: 1, mt: 2 },
                                children: "POI Details" 
                            }),
                            // Name field with search functionality
                            _jsxs(Box, {
                                sx: { position: 'relative', mb: 2 },
                                children: [
                                    _jsx(TextField, {
                                        label: "Name",
                                        value: searchName || lastPoi.name,
                                        onChange: (e) => setSearchName(e.target.value),
                                        fullWidth: true,
                                        variant: "outlined",
                                        size: "small",
                                        sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: 'rgb(255, 255, 255)' },
                                                '&:hover fieldset': { borderColor: 'rgb(255, 255, 255)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(255, 255, 255)' }
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgb(255, 255, 255)' },
                                            '& .MuiOutlinedInput-input': { color: 'rgb(255, 255, 255)' }
                                        }
                                    }),
                                    isSearching && _jsx(CircularProgress, {
                                        size: 20,
                                        sx: { position: 'absolute', right: 12, top: 12, color: 'white' }
                                    }),
                                    
                                    // Search results dropdown
                                    searchResults.length > 0 && _jsx(List, {
                                        sx: {
                                            position: 'absolute',
                                            width: '100%',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            backgroundColor: 'rgb(45, 45, 45)',
                                            color: 'white',
                                            zIndex: 1000,
                                            borderRadius: '4px',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
                                            mt: 0.5
                                        },
                                        children: searchResults.map((place) => _jsxs(ListItem, {
                                            button: true,
                                            onClick: () => handleSelectPlace(place),
                                            sx: {
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                            },
                                            children: [
                                                place.icon && _jsx(ListItemIcon, {
                                                    sx: { minWidth: '36px' },
                                                    children: _jsx("img", {
                                                        src: place.icon,
                                                        alt: "",
                                                        style: { width: '20px', height: '20px' }
                                                    })
                                                }),
                                                _jsx(ListItemText, {
                                                    primary: place.name,
                                                    secondary: place.address || place.vicinity,
                                                    primaryTypographyProps: { color: 'white', fontSize: '0.9rem' },
                                                    secondaryTypographyProps: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }
                                                }),
                                                place.rating && _jsxs(Box, {
                                                    sx: { display: 'flex', alignItems: 'center', ml: 1 },
                                                    children: [
                                                        _jsx(Rating, {
                                                            value: place.rating,
                                                            readOnly: true,
                                                            size: "small",
                                                            precision: 0.1
                                                        }),
                                                        _jsx(Typography, {
                                                            variant: "caption",
                                                            sx: { ml: 0.5, color: 'rgba(255, 255, 255, 0.7)' },
                                                            children: place.rating.toFixed(1)
                                                        })
                                                    ]
                                                })
                                            ]
                                        }, place.placeId))
                                    })
                                ]
                            }),
                            
                            // Google Places Link field
                            _jsxs(Box, {
                                sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 2 },
                                children: [
                                    _jsx(TextField, {
                                        label: "Google Places Link (optional)",
                                        value: googlePlacesLink,
                                        onChange: (e) => setGooglePlacesLink(e.target.value),
                                        fullWidth: true,
                                        variant: "outlined",
                                        size: "small",
                                        placeholder: "Paste Google Maps link or embed code...",
                                        error: !!linkError,
                                        helperText: linkError,
                                        sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: 'rgb(255, 255, 255)' },
                                                '&:hover fieldset': { borderColor: 'rgb(255, 255, 255)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(255, 255, 255)' }
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgb(255, 255, 255)' },
                                            '& .MuiOutlinedInput-input': { color: 'rgb(255, 255, 255)' },
                                            '& .MuiFormHelperText-root': { color: 'rgb(255, 99, 99)' }
                                        }
                                    }),
                                    isProcessingLink
                                        ? _jsx(CircularProgress, { size: 24, sx: { color: 'white' } })
                                        : _jsx(Tooltip, {
                                            title: "Add a Google Maps link to fetch additional information. For best results, use an embed link from the 'Share' menu in Google Maps.",
                                            arrow: true,
                                            placement: "top",
                                            children: _jsx(IconButton, {
                                                size: "small",
                                                sx: { color: 'white' },
                                                children: _jsx(HelpOutlineIcon, { fontSize: "small" })
                                            })
                                        })
                                ]
                            }),
                            
                            // Google Places Preview
                            googlePlacesData && _jsxs(Box, {
                                sx: {
                                    mt: 1, mb: 2,
                                    p: 2,
                                    backgroundColor: 'rgb(45, 45, 45)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                },
                                children: [
                                    _jsxs(Box, {
                                        sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 },
                                        children: [
                                            _jsx(StarIcon, { sx: { color: '#FFD700', fontSize: '20px' } }),
                                            _jsx(Typography, {
                                                variant: "subtitle2",
                                                color: "white",
                                                fontWeight: "bold",
                                                children: "Google Places Preview"
                                            })
                                        ]
                                    }),
                                    
                                    _jsx(Divider, { sx: { borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 } }),
                                    
                                    // Place ID
                                    googlePlacesData.placeId && _jsx(Box, {
                                        sx: { display: 'flex', mb: 1, alignItems: 'center' },
                                        "data-google-place-id": googlePlacesData.placeId,
                                        children: _jsx(Typography, {
                                            variant: "body2",
                                            color: "white",
                                            fontSize: "0.8rem",
                                            children: `Place ID: ${googlePlacesData.placeId}`
                                        })
                                    }),
                                    
                                    // Rating
                                    googlePlacesData.rating && _jsxs(Box, {
                                        sx: { display: 'flex', alignItems: 'center', mb: 1 },
                                        children: [
                                            _jsx(Rating, {
                                                value: googlePlacesData.rating,
                                                precision: 0.1,
                                                readOnly: true,
                                                size: "small"
                                            }),
                                            _jsx(Typography, {
                                                variant: "body2",
                                                color: "white",
                                                ml: 1,
                                                fontSize: "0.8rem",
                                                children: `${googlePlacesData.rating} / 5`
                                            })
                                        ]
                                    }),
                                    
                                    // Address
                                    googlePlacesData.address && _jsxs(Box, {
                                        sx: { display: 'flex', mb: 1, alignItems: 'flex-start' },
                                        children: [
                                            _jsx(LocationOnIcon, {
                                                sx: { color: 'white', mr: 1, fontSize: '16px', mt: '2px' }
                                            }),
                                            _jsx(Typography, {
                                                variant: "body2",
                                                color: "white",
                                                fontSize: "0.8rem",
                                                children: googlePlacesData.address
                                            })
                                        ]
                                    }),
                                    
                                    // Phone number
                                    googlePlacesData.phoneNumber && _jsxs(Box, {
                                        sx: { display: 'flex', mb: 1, alignItems: 'center' },
                                        children: [
                                            _jsx(PhoneIcon, {
                                                sx: { color: 'white', mr: 1, fontSize: '16px' }
                                            }),
                                            _jsx(Typography, {
                                                variant: "body2",
                                                color: "white",
                                                fontSize: "0.8rem",
                                                children: googlePlacesData.phoneNumber
                                            })
                                        ]
                                    }),
                                    
                                    // Website
                                    googlePlacesData.website && _jsxs(Box, {
                                        sx: { display: 'flex', mb: 1, alignItems: 'center' },
                                        children: [
                                            _jsx(LanguageIcon, {
                                                sx: { color: 'white', mr: 1, fontSize: '16px' }
                                            }),
                                            _jsx(Link, {
                                                href: googlePlacesData.website,
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                sx: {
                                                    color: '#90caf9',
                                                    textDecoration: 'none',
                                                    fontSize: "0.8rem",
                                                    '&:hover': { textDecoration: 'underline' }
                                                },
                                                children: googlePlacesData.website
                                            })
                                        ]
                                    })
                                ]
                            }),
                            
                            // Save button
                            _jsx(Button, {
                                variant: "contained",
                                fullWidth: true,
                                onClick: handlePOISave,
                                sx: {
                                    mt: 2,
                                    backgroundColor: POI_CATEGORIES[lastPoi.category]?.color || '#777777',
                                    '&:hover': {
                                        backgroundColor: POI_CATEGORIES[lastPoi.category]?.color || '#777777',
                                        opacity: 0.9
                                    }
                                },
                                children: "Save POI"
                            })
                        ]
                    });
                }
                
                // If no POI with coordinates, just show the icon selection
                return selection;
                
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
