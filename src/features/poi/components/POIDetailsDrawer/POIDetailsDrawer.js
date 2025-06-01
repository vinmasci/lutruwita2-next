import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, ButtonBase, IconButton, Tooltip, CircularProgress, Rating, Link, Divider, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import StarIcon from '@mui/icons-material/Star';
import DeleteIcon from '@mui/icons-material/Delete';
import { StyledDrawer, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
import { usePOIContext } from '../../context/POIContext';

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

const POIDetailsDrawer = ({ isOpen, onClose, iconName, category, coordinates, onSave, existingPoi }) => {
    const { processGooglePlacesLink, searchPlaces, removePOI } = usePOIContext();
    // Get the icon definition for default name
    const iconDef = getIconDefinition(iconName);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[category]?.color || '#777777'; // Default gray color if category not found
    // State for form fields
    const [name, setName] = useState(existingPoi?.name || iconDef?.label || '');
    const [description, setDescription] = useState(existingPoi?.description || '');
    const [googlePlacesLink, setGooglePlacesLink] = useState(existingPoi?.googlePlaceUrl || existingPoi?.googlePlacesLink || '');
    const [googlePlacesData, setGooglePlacesData] = useState(existingPoi?.googlePlaces || null);
    const [isProcessingLink, setIsProcessingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);
    const [photos, setPhotos] = useState(existingPoi?.photos || []);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    
    // State for auto-search
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    
    // Reset form when drawer opens with new POI
    useEffect(() => {
        if (isOpen) {
            // If we have an existing POI, use its data
            if (existingPoi) {
                setName(existingPoi.name || iconDef?.label || '');
                setDescription(existingPoi.description || '');
                setGooglePlacesLink(existingPoi.googlePlaceUrl || existingPoi.googlePlacesLink || '');
                setGooglePlacesData(existingPoi.googlePlaces || null);
                setPhotos(existingPoi.photos || []);
            } else {
                // Otherwise use defaults for a new POI
                setName(iconDef?.label || '');
                setDescription('');
                setGooglePlacesLink('');
                setGooglePlacesData(null);
                setPhotos([]);
            }
            setIsProcessingLink(false);
            setLinkError(null);
            setSearchResults([]);
            setIsSearching(false);
            setSearchError(null);
        }
    }, [isOpen, iconDef, existingPoi]);
    
    // Auto-search for places when name changes
    const searchForPlaces = useCallback(async (searchName) => {
        if (!searchName || searchName.trim() === '' || !isOpen) {
            setSearchResults([]);
            return;
        }
        
        // Don't search if the name is just the default icon label
        if (searchName === iconDef?.label) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        setSearchError(null);
        
        try {
            // We need coordinates to search
            if (!coordinates) {
                console.warn('[POIDetailsDrawer] Cannot search without coordinates');
                setSearchError('Cannot search without coordinates');
                setIsSearching(false);
                return;
            }
            
            const results = await searchPlaces(searchName, coordinates);
            setSearchResults(results);
        } catch (error) {
            console.error('[POIDetailsDrawer] Error searching for places:', error);
            setSearchError('Error searching for places');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [isOpen, iconDef?.label, coordinates, searchPlaces]);
    
    // Debounced version of searchForPlaces
    const debouncedSearch = useCallback(debounce(searchForPlaces, 800), [searchForPlaces]);
    
    // Trigger search when name changes
    useEffect(() => {
        if (isOpen && name && name.trim() !== '' && coordinates) {
            console.log('[POIDetailsDrawer] Auto-searching for:', name, 'at coordinates:', coordinates);
            debouncedSearch(name);
        } else {
            setSearchResults([]);
            if (isOpen && name && name.trim() !== '' && !coordinates) {
                console.warn('[POIDetailsDrawer] Cannot search without coordinates');
            }
        }
    }, [isOpen, name, coordinates, debouncedSearch]);
    
    // Handle place selection from search results
    const handleSelectPlace = async (place) => {
        if (!place || !place.placeId) return;
        
        // Set the name from the selected place
        setName(place.name);
        
        // Set the Google Places link
        setGooglePlacesLink(place.url);
        
        // Process the link to get place details
        await processLink(place.url);
        
        // Clear search results after selection
        setSearchResults([]);
    };
    
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
                // If name is empty or default, use the place name
                if (!name || name === iconDef?.label) {
                    setName(data.name);
                }
            } else {
                setGooglePlacesData(null);
                setLinkError('Could not process Google Places link. Please check the format.');
            }
        } catch (error) {
            console.error('[POIDetailsDrawer] Error processing Google Places link:', error);
            setGooglePlacesData(null);
            setLinkError('Error processing link: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessingLink(false);
        }
    };
    
    // Debounced version of processLink to avoid too many API calls
    const debouncedProcessLink = debounce(processLink, 800);
    
    // Call processLink when googlePlacesLink changes
    useEffect(() => {
        if (googlePlacesLink) {
            debouncedProcessLink(googlePlacesLink);
        } else {
            setGooglePlacesData(null);
            setIsProcessingLink(false);
            setLinkError(null);
        }
    }, [googlePlacesLink]);
    
    const handlePhotoChange = (event) => {
        if (event.target.files) {
            setPhotos(Array.from(event.target.files));
        }
    };
    
    const handleDeletePhoto = (indexToDelete) => {
        setPhotos(prevPhotos => prevPhotos.filter((_, index) => index !== indexToDelete));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Get the Google Places ID from the UI element directly
        const placeIdElement = document.querySelector('[data-google-place-id]');
        const googlePlaceId = placeIdElement ? placeIdElement.getAttribute('data-google-place-id') : null;
        
        console.log('[POIDetailsDrawer] Saving POI with Google Place ID:', googlePlaceId);
        
        onSave({
            name,
            description,
            googlePlacesLink,
            photos,
            // Add Google Places ID directly as a property - prioritize the ID from the UI element
            ...(googlePlaceId && { googlePlaceId }),
            // Fallback to the ID from the googlePlacesData if the UI element is not available
            ...(!googlePlaceId && googlePlacesData?.placeId && { googlePlaceId: googlePlacesData.placeId }),
            // Include the Google Places data if available (for preview in the drawer)
            ...(googlePlacesData && { googlePlaces: googlePlacesData }),
            // Include the existing POI ID if we're editing
            ...(existingPoi && { id: existingPoi.id })
        });
    };
    
    return (_jsxs(NestedDrawer, { 
        anchor: "left", 
        open: isOpen, 
        onClose: onClose, 
        variant: "persistent", 
        sx: {
            zIndex: 1300, // Higher than POIDrawer
            '& .MuiDrawer-paper': {
                top: '64px', // Position below the header
                height: 'calc(100% - 64px)', // Adjust height to account for header
                marginLeft: '320px' // Account for the sidebar width + POIDrawer width
            }
        }, 
        children: [
            _jsxs(StyledDrawer, { 
                children: [
                    _jsx(DrawerHeader, { 
                            children: _jsx(Typography, { 
                                variant: "h6", 
                                children: existingPoi ? "Edit POI Details" : "Add POI Details" 
                            }) 
                    }), 
                    _jsx(DrawerContent, { 
                        children: _jsx("form", { 
                            onSubmit: handleSubmit, 
                            style: { height: '100%' }, 
                            children: _jsxs(Box, { 
                                sx: { display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }, 
                                children: [
                                    _jsxs(Box, { 
                                        sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            backgroundColor: 'rgb(45, 45, 45)',
                                            padding: '12px',
                                            borderRadius: '4px'
                                        }, 
                                        children: [
                                            _jsx("i", { 
                                                className: iconDef?.name, 
                                                style: {
                                                    color: categoryColor,
                                                    fontSize: '24px'
                                                } 
                                            }), 
                                            _jsx(Typography, { 
                                                variant: "body2", 
                                                color: "text.secondary", 
                                                children: POI_CATEGORIES[category]?.label || 'Unknown Category' 
                                            })
                                        ] 
                                    }), 
                                    _jsxs(Box, {
                                        sx: { position: 'relative' },
                                        children: [
                                            _jsx(TextField, { 
                                                label: "POI Name", 
                                                value: name, 
                                                onChange: (e) => setName(e.target.value), 
                                                fullWidth: true, 
                                                variant: "outlined", 
                                                size: "small", 
                                                sx: {
                                                    backgroundColor: 'rgb(35, 35, 35)',
                                                    '& .MuiOutlinedInput-root': {
                                                        '& fieldset': {
                                                            borderColor: 'rgb(255, 255, 255)',
                                                        },
                                                        '&:hover fieldset': {
                                                            borderColor: 'rgb(255, 255, 255)',
                                                        },
                                                        '&.Mui-focused fieldset': {
                                                            borderColor: 'rgb(255, 255, 255)',
                                                        }
                                                    },
                                                    '& .MuiInputLabel-root': {
                                                        color: 'rgb(255, 255, 255)'
                                                    },
                                                    '& .MuiOutlinedInput-input': {
                                                        color: 'rgb(255, 255, 255)'
                                                    }
                                                } 
                                            }),
                                            isSearching && (
                                                _jsx(CircularProgress, {
                                                    size: 20,
                                                    sx: {
                                                        position: 'absolute',
                                                        right: 12,
                                                        top: 12,
                                                        color: 'white'
                                                    }
                                                })
                                            ),
                                            
                                            // Search results dropdown - fixed to prevent vertical text issue
                                            searchResults.length > 0 && (
                                                _jsx(Box, {
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
                                                    children: searchResults.map((place, index) => (
                                                        _jsx(Box, {
                                                            onClick: () => handleSelectPlace(place),
                                                            sx: {
                                                                padding: '6px 10px',
                                                                borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                                },
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            },
                                                            children: place.name
                                                        }, place.placeId)
                                                    ))
                                                })
                                            )
                                        ]
                                    }),
                                    _jsx(TextField, { 
                                        label: "Description (optional)", 
                                        value: description, 
                                        onChange: (e) => setDescription(e.target.value), 
                                        multiline: true, 
                                        rows: 4, 
                                        fullWidth: true, 
                                        variant: "outlined", 
                                        size: "small", 
                                        sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: 'rgb(255, 255, 255)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'rgb(255, 255, 255)',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'rgb(255, 255, 255)',
                                                }
                                            },
                                            '& .MuiInputLabel-root': {
                                                color: 'rgb(255, 255, 255)'
                                            },
                                            '& .MuiOutlinedInput-input': {
                                                color: 'rgb(255, 255, 255)'
                                            }
                                        } 
                                    }),
                                    _jsxs(Box, {
                                        sx: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1
                                        },
                                        children: [
                                            _jsxs(Box, {
                                                sx: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1
                                                },
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
                                                                '& fieldset': {
                                                                    borderColor: 'rgb(255, 255, 255)',
                                                                },
                                                                '&:hover fieldset': {
                                                                    borderColor: 'rgb(255, 255, 255)',
                                                                },
                                                                '&.Mui-focused fieldset': {
                                                                    borderColor: 'rgb(255, 255, 255)',
                                                                }
                                                            },
                                                            '& .MuiInputLabel-root': {
                                                                color: 'rgb(255, 255, 255)'
                                                            },
                                                            '& .MuiOutlinedInput-input': {
                                                                color: 'rgb(255, 255, 255)'
                                                            },
                                                            '& .MuiFormHelperText-root': {
                                                                color: 'rgb(255, 99, 99)'
                                                            }
                                                        }
                                                    }),
                                                    isProcessingLink ? (
                                                        _jsx(CircularProgress, { size: 24, sx: { color: 'white' } })
                                                    ) : (
                                                        _jsx(Tooltip, {
                                                            title: "Add a Google Maps link to fetch additional information. For best results, use an embed link from the 'Share' menu in Google Maps.",
                                                            arrow: true,
                                                            placement: "top",
                                                            children: _jsx(IconButton, {
                                                                size: "small",
                                                                sx: { color: 'white' },
                                                                children: _jsx(HelpOutlineIcon, { fontSize: "small" })
                                                            })
                                                        })
                                                    )
                                                ]
                                            }),
                                            
                                            // Google Places Preview
                                            googlePlacesData && (
                                                _jsxs(Box, {
                                                    sx: {
                                                        mt: 1,
                                                        p: 2,
                                                        backgroundColor: 'rgb(45, 45, 45)',
                                                        borderRadius: '4px',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                                    },
                                                    children: [
                                                        _jsxs(Box, {
                                                            sx: { 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: 1,
                                                                mb: 1
                                                            },
                                                            children: [
                                                                _jsx(StarIcon, { 
                                                                    sx: { color: '#FFD700', fontSize: '20px' } 
                                                                }),
                                                                _jsx(Typography, {
                                                                    variant: "subtitle2",
                                                                    color: "white",
                                                                    fontWeight: "bold",
                                                                    children: "Google Places Preview"
                                                                })
                                                            ]
                                                        }),
                                                        
                                                        _jsx(Divider, { 
                                                            sx: { 
                                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                                my: 1
                                                            } 
                                                        }),
                                                        
                                                        // Place ID
                                                        googlePlacesData.placeId && (
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex', 
                                                                    mb: 1,
                                                                    alignItems: 'center'
                                                                },
                                                                children: [
                                                                    _jsx("i", {
                                                                        className: "lucide-hash",
                                                                        style: { 
                                                                            color: 'white', 
                                                                            marginRight: '8px',
                                                                            fontSize: '16px'
                                                                        }
                                                                    }),
                                                                    _jsx(Typography, {
                                                                        variant: "body2",
                                                                        color: "white",
                                                                        fontSize: "0.8rem",
                                                                        // Add data attribute to store the place ID for retrieval in handleSubmit
                                                                        "data-google-place-id": googlePlacesData.placeId,
                                                                        children: `Place ID: ${googlePlacesData.placeId}`
                                                                    })
                                                                ]
                                                            })
                                                        ),
                                                        
                                                        // Rating
                                                        googlePlacesData.rating && (
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    mb: 1
                                                                },
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
                                                            })
                                                        ),
                                                        
                                                        // Address
                                                        googlePlacesData.address && (
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex', 
                                                                    mb: 1,
                                                                    alignItems: 'flex-start'
                                                                },
                                                                children: [
                                                                    _jsx(LocationOnIcon, {
                                                                        sx: { 
                                                                            color: 'white', 
                                                                            mr: 1,
                                                                            fontSize: '16px',
                                                                            mt: '2px'
                                                                        }
                                                                    }),
                                                                    _jsx(Typography, {
                                                                        variant: "body2",
                                                                        color: "white",
                                                                        fontSize: "0.8rem",
                                                                        children: googlePlacesData.address
                                                                    })
                                                                ]
                                                            })
                                                        ),
                                                        
                                                        // Phone number
                                                        googlePlacesData.phoneNumber && (
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex', 
                                                                    mb: 1,
                                                                    alignItems: 'center'
                                                                },
                                                                children: [
                                                                    _jsx(PhoneIcon, {
                                                                        sx: { 
                                                                            color: 'white', 
                                                                            mr: 1,
                                                                            fontSize: '16px'
                                                                        }
                                                                    }),
                                                                    _jsx(Typography, {
                                                                        variant: "body2",
                                                                        color: "white",
                                                                        fontSize: "0.8rem",
                                                                        children: googlePlacesData.phoneNumber
                                                                    })
                                                                ]
                                                            })
                                                        ),
                                                        
                                                        // Website
                                                        googlePlacesData.website && (
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex', 
                                                                    mb: 1,
                                                                    alignItems: 'center'
                                                                },
                                                                children: [
                                                                    _jsx(LanguageIcon, {
                                                                        sx: { 
                                                                            color: 'white', 
                                                                            mr: 1,
                                                                            fontSize: '16px'
                                                                        }
                                                                    }),
                                                                    _jsx(Link, {
                                                                        href: googlePlacesData.website,
                                                                        target: "_blank",
                                                                        rel: "noopener noreferrer",
                                                                        sx: {
                                                                            color: '#90caf9',
                                                                            textDecoration: 'none',
                                                                            fontSize: "0.8rem",
                                                                            '&:hover': {
                                                                                textDecoration: 'underline'
                                                                            }
                                                                        },
                                                                        children: googlePlacesData.website
                                                                    })
                                                        ]
                                                    })
                                                ),
                                                
                                                // Opening Hours
                                                googlePlacesData.openingHours && (
                                                    _jsxs(Box, {
                                                        sx: { 
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            mb: 1
                                                        },
                                                        children: [
                                                            _jsxs(Box, {
                                                                sx: { 
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    mb: 0.5
                                                                },
                                                                children: [
                                                                    _jsx("i", {
                                                                        className: "lucide-clock",
                                                                        style: { 
                                                                            color: 'white', 
                                                                            marginRight: '8px',
                                                                            fontSize: '16px'
                                                                        }
                                                                    }),
                                                                    _jsx(Typography, {
                                                                        variant: "body2",
                                                                        color: "white",
                                                                        fontSize: "0.8rem",
                                                                        fontWeight: "bold",
                                                                        children: googlePlacesData.openingHours.isOpen !== null 
                                                                            ? (googlePlacesData.openingHours.isOpen ? "Open Now" : "Closed Now") 
                                                                            : "Hours"
                                                                    })
                                                                ]
                                                            }),
                                                            googlePlacesData.openingHours.weekdayText && googlePlacesData.openingHours.weekdayText.length > 0 && (
                                                                _jsx(Box, {
                                                                    sx: { 
                                                                        pl: 3,
                                                                        display: 'flex',
                                                                        flexDirection: 'column'
                                                                    },
                                                                    children: googlePlacesData.openingHours.weekdayText.map((day, index) => (
                                                                        _jsx(Typography, {
                                                                            variant: "body2",
                                                                            color: "white",
                                                                            fontSize: "0.75rem",
                                                                            children: day
                                                                        }, index)
                                                                    ))
                                                                })
                                                            )
                                                        ]
                                                    })
                                                )
                                            ]
                                        })
                                            )
                                        ]
                                    }),
                                    _jsxs(Button, { 
                                        component: "label", 
                                        variant: "outlined", 
                                        fullWidth: true, 
                                        sx: {
                                            backgroundColor: 'rgb(35, 35, 35)',
                                            borderColor: 'rgb(255, 255, 255)',
                                            color: 'rgb(255, 255, 255)',
                                            '&:hover': {
                                                borderColor: 'rgb(255, 255, 255)',
                                                backgroundColor: 'rgb(45, 45, 45)'
                                            }
                                        }, 
                                        children: [
                                            "Add Photos", 
                                            _jsx("input", { 
                                                type: "file", 
                                                hidden: true, 
                                                multiple: true, 
                                                accept: "image/*", 
                                                onChange: handlePhotoChange 
                                            })
                                        ] 
                                    }), 
                                    photos.length > 0 && (
                                        _jsx(Box, { 
                                            sx: {
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: 1
                                            }, 
                                            children: photos.map((photo, index) => (
                                                _jsx(Box, {
                                                    key: index,
                                                    sx: {
                                                        position: 'relative',
                                                        width: '100%',
                                                        aspectRatio: '1',
                                                        backgroundColor: 'rgb(35, 35, 35)',
                                                        borderRadius: 1,
                                                        overflow: 'hidden'
                                                    }
                                                }, [
                                                    _jsx(ButtonBase, { 
                                                        onClick: () => {
                                                            const url = URL.createObjectURL(photo);
                                                            const processedPhoto = {
                                                                id: String(index),
                                                                name: photo.name || `Photo ${index + 1}`,
                                                                url: url,
                                                                thumbnailUrl: url,
                                                                dateAdded: new Date(),
                                                                hasGps: false
                                                            };
                                                            setSelectedPhoto(processedPhoto);
                                                        }, 
                                                        sx: {
                                                            display: 'block',
                                                            width: '100%',
                                                            height: '100%'
                                                        }, 
                                                        children: _jsx("img", { 
                                                            src: URL.createObjectURL(photo), 
                                                            alt: `Upload ${index + 1}`, 
                                                            style: {
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            } 
                                                        }) 
                                                    }),
                                                    _jsx(IconButton, {
                                                        size: "small",
                                                        onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleDeletePhoto(index);
                                                        },
                                                        sx: {
                                                            position: 'absolute',
                                                            top: 4,
                                                            right: 4,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                            },
                                                            padding: '4px'
                                                        },
                                                        children: _jsx(ClearIcon, { fontSize: "small" })
                                                    })
                                                ])
                                            ))
                                        })
                                    ), 
                                    _jsxs(Box, {
                                        sx: {
                                            mt: 3,
                                            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                                            pt: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2
                                        },
                                        children: [
                                            // Cancel and Save buttons row
                                            _jsx(Box, {
                                                sx: {
                                                    width: '100%',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                },
                                                children: [
                                                    // Cancel button (left)
                                                    _jsx(Button, {
                                                        variant: "text",
                                                        onClick: onClose,
                                                        sx: { 
                                                            color: 'white',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 'bold'
                                                        },
                                                        children: "CANCEL"
                                                    }),
                                                    // Save button (right)
                                                    _jsx(Button, {
                                                        type: "submit",
                                                        variant: "contained",
                                                        sx: {
                                                            backgroundColor: '#ed8a19', // Orange color from screenshot
                                                            color: 'white',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 'bold',
                                                            '&:hover': {
                                                                backgroundColor: '#d67b0a' // Darker orange on hover
                                                            },
                                                            minWidth: '80px'
                                                        },
                                                        children: "SAVE"
                                                    })
                                                ]
                                            }),
                                            
                                            // Delete button (separate row below) - only shown when editing existing POI
                                            existingPoi && _jsxs(Button, {
                                                onClick: () => {
                                                    if (existingPoi && existingPoi.id) {
                                                        removePOI(existingPoi.id);
                                                        onClose();
                                                    }
                                                },
                                                sx: {
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '8px',
                                                    fontSize: '0.8rem',
                                                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                                                    paddingTop: '16px'
                                                },
                                                children: [
                                                    _jsx(DeleteIcon, { sx: { fontSize: '1.2rem', mr: 0.5 } }),
                                                    "DELETE"
                                                ]
                                            })
                                        ]
                                    })
                                ] 
                            }) 
                        }) 
                    })
                ] 
            }), 
            selectedPhoto && (
                _jsx(PhotoPreviewModal, { 
                    photo: selectedPhoto, 
                    onClose: () => setSelectedPhoto(null) 
                })
            )
        ] 
    }));
};

export default POIDetailsDrawer;
