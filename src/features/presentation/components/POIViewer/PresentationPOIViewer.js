import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Modal, Link, Rating, CircularProgress } from '@mui/material';
import { Close, LocationOn, Phone, Language, Star } from '@mui/icons-material';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { fetchBasicPlaceDetails } from '../../../poi/services/googlePlacesService';

export const PresentationPOIViewer = ({ poi, onClose }) => {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [googlePlacesData, setGooglePlacesData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Fetch Google Places data if the POI has a place ID
    useEffect(() => {
        const fetchGooglePlacesData = async () => {
            console.log('[PresentationPOIViewer] POI data:', poi);
            
            // Get the Google Place ID directly from the POI
            const placeId = poi?.googlePlaceId;
            
            if (!placeId) {
                console.log('[PresentationPOIViewer] No Google Places ID found in POI');
                return;
            }
            
            try {
                setLoading(true);
                setError(null);
                console.log('[PresentationPOIViewer] Fetching Google Places data for ID:', placeId);
                
                const placeDetails = await fetchBasicPlaceDetails(placeId);
                if (placeDetails) {
                    console.log('[PresentationPOIViewer] Fetched Google Places data:', placeDetails);
                    setGooglePlacesData({
                        ...placeDetails,
                        placeId: placeId
                    });
                } else {
                    console.error('[PresentationPOIViewer] Failed to fetch Google Places data');
                    setError('Failed to fetch Google Places data');
                }
            } catch (err) {
                console.error('[PresentationPOIViewer] Error fetching Google Places data:', err);
                setError(err.message || 'An error occurred while fetching Google Places data');
            } finally {
                setLoading(false);
            }
        };
        
        fetchGooglePlacesData();
    }, [poi?.googlePlaceId]);
    
    if (!poi)
        return null;
        
    const iconDef = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[poi.category]?.color || '#777777'; // Default gray color if category not found
    
    // Prepare photos for the image slider
    // Map Google photo URLs to the backend proxy endpoint
    const googlePhotos = (googlePlacesData?.photos || []).map(googlePhotoUrl => ({
      url: `/api/poi/photo?url=${encodeURIComponent(googlePhotoUrl)}`,
      source: 'google' // Optional: Add source identifier
    }));
    // Ensure poi.photos is an array and contains objects with a 'url' property
    const userPhotos = (poi.photos || []).filter(p => p && p.url).map(p => ({
        ...p, // Keep original properties if needed
        url: p.url, // Ensure url property exists
        source: 'user' // Optional: Add source identifier
    }));

    // Combine user photos and Google photos, respecting the slider's max limit (5)
    const combinedPhotos = [
        ...userPhotos,
        ...googlePhotos
    ].slice(0, 5); // Apply slice to limit total photos passed to the slider

    // Construct a simple Google Maps Embed URL (/v1/view) for minimal controls
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    const [lng, lat] = poi.coordinates;
    // Revert to Static Map URL with hybrid type
    const mapWidth = 600;
    const mapHeight = 400;
    const staticMapUrl = apiKey ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${mapWidth}x${mapHeight}&maptype=hybrid&markers=color:red%7C${lat},${lng}&key=${apiKey}` : null;
    console.log('[PresentationPOIViewer] Static Hybrid Map URL:', staticMapUrl);
    const embedMapUrl = null; // Ensure embedMapUrl is null


    // Always show the image slider (will show map or photos)
    const showImageSlider = true;
    
    // Determine if we should show Google Places section
    const showGooglePlaces = (poi.googlePlaceId) && (googlePlacesData || loading);
    
    return _jsxs(_Fragment, { children: [
        _jsx(Modal, { 
            open: Boolean(poi), 
            onClose: onClose,
            "aria-labelledby": "poi-viewer-modal",
            disableScrollLock: true,
            disableAutoFocus: true,
            keepMounted: true,
            sx: {
                zIndex: 9999,
                overflow: 'scroll', // Make the entire modal scrollable
                // Ensure modal doesn't affect other fixed elements
                '& .MuiBackdrop-root': {
                    position: 'absolute'
                }
            },
            children: _jsxs(Box, {
                sx: {
                    position: 'absolute',
                    top: '5%', // Position near the top
                    left: '50%',
                    transform: 'translateX(-50%)', // Center horizontally only
                    width: '90%',
                    maxWidth: '500px',
                    height: 'auto', // Let height grow with content
                    maxHeight: 'none', // Remove max height constraint
                    bgcolor: 'rgba(35, 35, 35, 0.95)',
                    border: '1px solid rgba(30, 136, 229, 0.5)',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    // overflowY: 'auto', // Remove overflow from inner box
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 9999,
                    // minHeight: 0 // No longer needed here
                    mb: '5%' // Add bottom margin for scroll space
                },
                children: [
                    // Header with name and close button
                    _jsxs(Box, {
                        sx: { 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 3
                        },
                        children: [
                            _jsxs(Box, { 
                                sx: { display: 'flex', alignItems: 'center', gap: 1 }, 
                                children: [
                                    _jsx("i", { 
                                        className: `lucide-${iconDef?.name}`, 
                                        style: {
                                            color: categoryColor,
                                            fontSize: '24px'
                                        } 
                                    }), 
                                    _jsx(Typography, { variant: "h6", color: "white", children: poi.name })
                                ]
                            }),
                            _jsx(IconButton, {
                                onClick: onClose,
                                sx: {
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                },
                                children: _jsx(Close, {})
                            })
                        ]
                    }),
                    
                    // Image slider - always show regardless of photos
                    _jsx(Box, { 
                        sx: { 
                            height: '250px', 
                            mb: 3,
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        },
                        children: _jsx(ImageSlider, {
                            photos: combinedPhotos, // Use the combined array
                            maxPhotos: 5, // Limit slider to 5 photos max
                            // mapPreviewProps: mapPreviewProps,
                            staticMapUrl: staticMapUrl, // Pass static map URL again
                            // embedMapUrl: embedMapUrl, // Remove embed map URL
                            alwaysShowMap: true // Keep this to ensure map/image area is shown
                        })
                    }),

                    // Description
                    _jsx(Box, { 
                        sx: {
                            mb: 3,
                            p: 2,
                            borderRadius: '4px',
                            backgroundColor: 'rgba(45, 45, 45, 0.9)',
                        }, 
                        children: _jsx(Typography, { 
                            variant: "body1", 
                            color: "white",
                            sx: { whiteSpace: 'pre-wrap' }, 
                            children: poi.description || 'No description' 
                        })
                    }),
                    
                    // Google Places information (if available)
                    showGooglePlaces && _jsxs(Box, {
                        sx: {
                            mb: 3,
                            p: 2,
                            borderRadius: '4px',
                            backgroundColor: 'rgba(45, 45, 45, 0.9)',
                        },
                        children: [
                            _jsxs(Box, {
                                sx: { 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    mb: 2
                                },
                                children: [
                                    _jsxs(Box, {
                                        sx: { 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1
                                        },
                                        children: [
                                            _jsx(Star, { 
                                                sx: { color: '#FFD700' } 
                                            }),
                                            _jsx(Typography, {
                                                variant: "subtitle1",
                                                color: "white",
                                                fontWeight: "bold",
                                                children: "Google Places Information"
                                            })
                                        ]
                                    }),
                                    
                                    // Show loading indicator if fetching data
                                    loading && _jsx(CircularProgress, { 
                                        size: 20, 
                                        sx: { color: 'white' } 
                                    })
                                ]
                            }),
                            
                            // Show error message if there was an error
                            error && _jsx(Typography, {
                                variant: "body2",
                                color: "error",
                                mb: 1.5,
                                children: error
                            }),
                            
                            // Only show details if we have data
                            googlePlacesData && _jsxs(_Fragment, {
                                children: [
                                    // Rating
                                    googlePlacesData.rating && _jsxs(Box, {
                                        sx: { 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            mb: 1.5 
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
                                                children: `${googlePlacesData.rating} / 5`
                                            })
                                        ]
                                    }),
                                    
                                    // Address
                                    googlePlacesData.address && _jsxs(Box, {
                                        sx: { 
                                            display: 'flex', 
                                            mb: 1.5 
                                        },
                                        children: [
                                            _jsx(LocationOn, {
                                                sx: { 
                                                    color: 'white', 
                                                    mr: 1,
                                                    fontSize: '20px',
                                                    mt: '2px'
                                                }
                                            }),
                                            _jsx(Typography, {
                                                variant: "body2",
                                                color: "white",
                                                children: googlePlacesData.address
                                            }),
                                            // Add Street View Link/Button here
                                            _jsx(Link, {
                                                href: `https://www.google.com/maps?q&layer=c&cbll=${lat},${lng}`, // Basic Street View URL
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                sx: {
                                                    ml: 1,
                                                    color: '#90caf9',
                                                    fontSize: '0.8rem',
                                                    verticalAlign: 'middle',
                                                    '&:hover': { textDecoration: 'underline' }
                                                },
                                                children: "(Street View)"
                                            })
                                        ]
                                    }),

                                    // Phone number
                                    googlePlacesData.phoneNumber && _jsxs(Box, {
                                        sx: { 
                                            display: 'flex', 
                                            mb: 1.5 
                                        },
                                        children: [
                                            _jsx(Phone, {
                                                sx: { 
                                                    color: 'white', 
                                                    mr: 1,
                                                    fontSize: '20px',
                                                    mt: '2px'
                                                }
                                            }),
                                            _jsx(Typography, {
                                                variant: "body2",
                                                color: "white",
                                                children: googlePlacesData.phoneNumber
                                            })
                                        ]
                                    }),
                                    
                                    // Website
                                    googlePlacesData.website && _jsxs(Box, {
                                        sx: { 
                                            display: 'flex', 
                                            mb: 1.5 
                                        },
                                        children: [
                                            _jsx(Language, {
                                                sx: { 
                                                    color: 'white', 
                                                    mr: 1,
                                                    fontSize: '20px',
                                                    mt: '2px'
                                                }
                                            }),
                                            _jsx(Link, {
                                                href: googlePlacesData.website,
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                sx: {
                                                    color: '#90caf9',
                                                    textDecoration: 'none',
                                                    '&:hover': {
                                                        textDecoration: 'underline'
                                                    }
                                                },
                                                children: googlePlacesData.website
                                            })
                                        ]
                                    }),
                                    
                                    // Opening Hours
                                    googlePlacesData.openingHours && _jsxs(Box, {
                                        sx: { 
                                            display: 'flex',
                                            flexDirection: 'column',
                                            mb: 1.5 
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
                                                            fontSize: '20px'
                                                        }
                                                    }),
                                                    _jsx(Typography, {
                                                        variant: "body2",
                                                        color: "white",
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
                                                        pl: 4,
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    },
                                                    children: googlePlacesData.openingHours.weekdayText.map((day, index) => (
                                                        _jsx(Typography, {
                                                            variant: "body2",
                                                            color: "white",
                                                            fontSize: "0.8rem",
                                                            children: day
                                                        }, index)
                                                    ))
                                                })
                                            )
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ] 
            }) 
        }), 
        
        // Photo lightbox modal
        _jsx(Modal, {
            open: Boolean(selectedPhoto),
            onClose: () => setSelectedPhoto(null),
            disableScrollLock: true,
            disableAutoFocus: true,
            keepMounted: true,
            sx: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000, // Higher than the POI viewer modal
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    position: 'absolute'
                }
            },
            children: _jsxs(Box, {
                sx: {
                    position: 'relative',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    outline: 'none'
                },
                children: [
                    selectedPhoto && _jsx("img", {
                        src: selectedPhoto,
                        alt: "Full size photo",
                        style: {
                            maxWidth: '100%',
                            maxHeight: '90vh',
                            objectFit: 'contain'
                        }
                    }),
                    _jsx(IconButton, {
                        onClick: () => setSelectedPhoto(null),
                        sx: {
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            }
                        },
                        children: _jsx(Close, {})
                    })
                ]
            })
        })
    ] });
};

export default PresentationPOIViewer;
