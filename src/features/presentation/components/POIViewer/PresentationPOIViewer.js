import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Box, IconButton, Typography, Modal, Link, Rating, CircularProgress } from '@mui/material';
import { Close, LocationOn, Phone, Language, Star } from '@mui/icons-material';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { fetchBasicPlaceDetails } from '../../../poi/services/googlePlacesService';
import logger from '../../../../utils/logger';

export const PresentationPOIViewer = ({ poi, onClose }) => {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [googlePlacesData, setGooglePlacesData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shouldLoadGoogleData, setShouldLoadGoogleData] = useState(true); // Set to true by default to auto-load
    const [isMobile, setIsMobile] = useState(false);
    
    // Check if we're on a mobile device
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768 || 
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);
    
    // Lazy load Google Places data only when needed
    const loadGooglePlacesData = useCallback(async () => {
        if (!poi?.googlePlaceId || googlePlacesData || loading) return;
        
        const placeId = poi.googlePlaceId;
        
        if (!placeId) {
            logger.info('PresentationPOIViewer', 'No Google Places ID found in POI');
            return;
        }
        
        // Set loading state immediately to prevent multiple attempts
        setLoading(true);
        
        // No additional delay needed since we already delay in the isContentReady effect
        const fetchDelay = 0; // No delay needed here anymore
        
        // Use setTimeout to delay the fetch on mobile
        setTimeout(async () => {
            try {
                setError(null);
                logger.info('PresentationPOIViewer', 'Fetching Google Places data for ID:', placeId);
                
                const placeDetails = await fetchBasicPlaceDetails(placeId);
                if (placeDetails) {
                    logger.info('PresentationPOIViewer', 'Fetched Google Places data successfully');
                    setGooglePlacesData({
                        ...placeDetails,
                        placeId: placeId
                    });
                } else {
                    logger.error('PresentationPOIViewer', 'Failed to fetch Google Places data');
                    setError('Failed to fetch Google Places data');
                }
            } catch (err) {
                logger.error('PresentationPOIViewer', 'Error fetching Google Places data:', err);
                setError(err.message || 'An error occurred while fetching Google Places data');
            } finally {
                setLoading(false);
            }
        }, fetchDelay);
    }, [poi?.googlePlaceId, googlePlacesData, loading, isMobile]);
    
    // Use a single state to track if content is ready to display
    const [isContentReady, setIsContentReady] = useState(false);
    
    // Update content loading with a single delay
    useEffect(() => {
        if (!isMobile) {
            // On desktop, show everything immediately
            setIsContentReady(true);
            return;
        }
        
        // On mobile, use a single delay for all content
        setIsContentReady(false); // Start with loading state
        
        // After a single delay, show all content and load Google Places data
        const timer = setTimeout(() => {
            setIsContentReady(true);
            loadGooglePlacesData(); // Load Google Places data after the delay
        }, 600); // Use 600ms delay as requested to prevent mobile crashes
        
        return () => {
            clearTimeout(timer);
        };
    }, [isMobile, loadGooglePlacesData]);
    
    // On desktop, load Google Places data immediately
    useEffect(() => {
        if (!isMobile) {
            loadGooglePlacesData();
        }
    }, [loadGooglePlacesData, isMobile, poi?.googlePlaceId]); // Re-run when POI changes
    
    if (!poi)
        return null;
        
    const iconDef = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[poi.category]?.color || '#777777'; // Default gray color if category not found
    
// Prepare photos for the image slider
// Process Google photo URLs to make them compatible with the ImageSlider component
const googlePhotos = (googlePlacesData?.photos || []).map(googlePhotoUrl => {
    // For Google photos, we need to create both url and thumbnailUrl properties
    // since the getTinyThumbnailUrl function only works with Cloudinary URLs
    return {
        url: googlePhotoUrl, // Use the Google URL directly
        thumbnailUrl: googlePhotoUrl, // Use the same URL for thumbnail to bypass getTinyThumbnailUrl
        source: 'google', // Optional: Add source identifier
        isGooglePhoto: true // Flag to identify Google photos
    };
});

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

// Log the combined photos for debugging
if (googlePlacesData?.photos?.length > 0) {
    logger.info('PresentationPOIViewer', 'Combined photos for slider:', combinedPhotos.length);
}

    // Construct a simple Google Maps Embed URL (/v1/view) for minimal controls
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    const [lng, lat] = poi.coordinates;
    
    // Use smaller map size on mobile to reduce data usage
    const mapWidth = isMobile ? 300 : 600;
    const mapHeight = isMobile ? 200 : 400;
    
    // Only create the static map URL if we need it (not on mobile unless explicitly requested)
    const staticMapUrl = apiKey && (!isMobile || userPhotos.length === 0) 
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${mapWidth}x${mapHeight}&maptype=hybrid&markers=color:red%7C${lat},${lng}&key=${apiKey}` 
        : null;
    
    // Use logger instead of console.log
    if (staticMapUrl) {
        logger.debug('PresentationPOIViewer', 'Static Hybrid Map URL created');
    }
    
    const embedMapUrl = null; // Ensure embedMapUrl is null

    // Always show the image slider (will show map or photos)
    const showImageSlider = true;
    
    // Determine if we should show Google Places section
    const showGooglePlaces = (poi.googlePlaceId) && (googlePlacesData || loading);
    
    // Handle Google Places data loading
    const handleLoadGoogleData = useCallback(() => {
        setShouldLoadGoogleData(true);
    }, []);
    
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
                    // Header with name and close button - always show
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
                    
                    // Show loading indicator on mobile during initial load
                    isMobile && !isContentReady && (
                        _jsx(Box, {
                            sx: {
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '200px'
                            },
                            children: _jsx(CircularProgress, { 
                                size: 40, 
                                sx: { color: 'white' } 
                            })
                        })
                    ),
                    
                    // Image slider - show after content is ready
                    isContentReady && _jsx(Box, { 
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

                    // Description - show after content is ready
                    isContentReady && _jsx(Box, { 
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
                    
                    // Loading indicator when fetching Google Places data
                    isContentReady && poi.googlePlaceId && !googlePlacesData && loading && (
                        _jsx(Box, {
                            sx: {
                                mb: 3,
                                display: 'flex',
                                justifyContent: 'center'
                            },
                            children: _jsx(CircularProgress, { 
                                size: 30, 
                                sx: { color: 'white' } 
                            })
                        })
                    ),
                    
                    // Google Places information - show when content is ready
                    isContentReady && showGooglePlaces && _jsxs(Box, {
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
