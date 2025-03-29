import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react'; // Import useCallback
// Add imports needed for Google Places link/preview
import { Box, IconButton, Typography, Dialog, DialogContent, TextField, Button, Modal, Link, Rating, CircularProgress } from '@mui/material';
import { Close, Edit, Save, Cancel, Delete, LocationOn, Phone, Language, Star } from '@mui/icons-material'; // Add necessary icons
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { createPOIPhotos } from '../../utils/photo';
import { usePOIContext } from '../../context/POIContext';
// Import fetchBasicPlaceDetails if it's used for preview (it's used by processGooglePlacesLink in context)

export const POIViewer = ({ poi: initialPoi, onClose, onUpdate }) => {
    const { pois, removePOI, processGooglePlacesLink } = usePOIContext(); // Get processGooglePlacesLink from context
    const [poi, setPoi] = useState(initialPoi);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(initialPoi?.name || '');
    const [editedDescription, setEditedDescription] = useState(initialPoi?.description || '');
    const [editedGooglePlacesLink, setEditedGooglePlacesLink] = useState(initialPoi?.googlePlaceUrl || ''); // State for link input
    const [newPhotos, setNewPhotos] = useState([]);
    // State for link processing and preview
    const [isProcessingLink, setIsProcessingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);
    const [linkPreviewData, setLinkPreviewData] = useState(null);
    // State for view mode Google Places data
    const [viewModePlaceData, setViewModePlaceData] = useState(null);
    const [isLoadingViewData, setIsLoadingViewData] = useState(false);


    // Initialize edited states
    useEffect(() => {
        if (initialPoi) {
            setEditedName(initialPoi.name);
            setEditedDescription(initialPoi.description || '');
            setEditedGooglePlacesLink(initialPoi.googlePlaceUrl || ''); // Initialize link field
            // Clear link processing state on new POI
            setIsProcessingLink(false);
            setLinkError(null);
            setLinkPreviewData(null);
            // Clear view mode data on new POI
            setViewModePlaceData(null);
            setIsLoadingViewData(false);
        }
    }, [initialPoi]);

    // Keep POI data in sync with context
    useEffect(() => {
        if (initialPoi) {
            const updatedPoi = pois.find(p => p.id === initialPoi.id);
            if (updatedPoi) {
                setPoi(updatedPoi);
                // Update edited states if not in edit mode
                if (!isEditing) {
                    setEditedName(updatedPoi.name);
                    setEditedDescription(updatedPoi.description || '');
                    // Update link field only if not editing, to reflect saved state
                    setEditedGooglePlacesLink(updatedPoi.googlePlaceUrl || '');
                }
            }
        }
    }, [pois, initialPoi, isEditing]); // Rerun if isEditing changes too

    if (!poi) return null;

    const handleSave = () => {
        if (onUpdate) {
            const updates = {};
            if (editedName !== poi.name) updates.name = editedName;
            if (editedDescription !== poi.description) updates.description = editedDescription;

            // Always include photos in updates to handle both additions and deletions
            updates.photos = [...(poi.photos || []), ...newPhotos];
            // Include the potentially updated Google Places link
            if (editedGooglePlacesLink !== (poi.googlePlaceUrl || '')) {
                updates.googlePlacesLink = editedGooglePlacesLink;
            }

            onUpdate(poi.id, updates);
        }
        setIsEditing(false);
        setNewPhotos([]);
        // Don't reset link field on save
    };

    const handleStartEditing = () => {
        setEditedName(poi.name);
        setEditedDescription(poi.description || '');
        setEditedGooglePlacesLink(poi.googlePlaceUrl || ''); // Set link field from current POI state
        setIsProcessingLink(false); // Reset processing state
        setLinkError(null);
        setLinkPreviewData(null); // Clear preview when starting edit
        setViewModePlaceData(null); // Clear view mode data when entering edit
        setIsLoadingViewData(false);
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
        // Reset fields to original POI state
        setEditedName(poi.name);
        setEditedDescription(poi.description || '');
        setEditedGooglePlacesLink(poi.googlePlaceUrl || '');
        setNewPhotos([]);
        // Reset link processing and preview state
        setIsProcessingLink(false);
        setLinkError(null);
        setLinkPreviewData(null);
        // Also clear view mode data on cancel (it will refetch if needed)
        setViewModePlaceData(null);
        setIsLoadingViewData(false);
    };

    const handleAddPhotos = async (files) => {
        const photos = await createPOIPhotos(files);
        setNewPhotos(prev => [...prev, ...photos]);
    };

    const handleRemoveNewPhoto = (index) => {
        const updatedPhotos = [...newPhotos];
        updatedPhotos.splice(index, 1);
        setNewPhotos(updatedPhotos);
    };

    // Debounce function (memoized)
    const debounce = useCallback((func, delay) => {
        let timeoutId;
        return (...args) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func(...args);
            }, delay);
        };
    }, []); // Empty dependency array as debounce itself doesn't depend on component state/props

    // Function to process link input (memoized)
    const processLinkInput = useCallback(async (link) => {
        const iconDef = getIconDefinition(poi.icon); // Get iconDef inside function scope
        if (!link) {
            setIsProcessingLink(false);
            setLinkError(null);
            setLinkPreviewData(null); // Clear preview if link is cleared
            return;
        }
        setIsProcessingLink(true);
        setLinkError(null);
        setLinkPreviewData(null); // Clear previous preview
        try {
            const data = await processGooglePlacesLink(link); // Use context function
            if (data) {
                setLinkPreviewData(data); // Set preview data
                if (!editedName || editedName === iconDef?.label) {
                    setEditedName(data.name);
                }
            } else {
                setLinkError('Could not process Google Places link. Please check the format.');
            }
        } catch (error) {
            console.error('[POIViewer] Error processing Google Places link input:', error);
            setLinkError('Error processing link: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessingLink(false);
        }
    }, [processGooglePlacesLink, poi.icon, editedName]); // Dependencies for useCallback


    // Debounced version (memoized)
    const debouncedProcessLinkInput = useCallback(debounce(processLinkInput, 800), [debounce, processLinkInput]); // Memoize the debounced function itself

    // Effect to process link input when editing
    useEffect(() => {
        if (isEditing && editedGooglePlacesLink) {
            debouncedProcessLinkInput(editedGooglePlacesLink);
        } else if (isEditing && !editedGooglePlacesLink) {
            setLinkError(null);
            setLinkPreviewData(null);
        }
        // No need to include debouncedProcessLinkInput in deps if it's memoized correctly
    }, [isEditing, editedGooglePlacesLink, debouncedProcessLinkInput]); // Added debouncedProcessLinkInput just in case

    // Effect to fetch Google Places data for VIEW mode
    useEffect(() => {
        const fetchViewData = async () => {
            // Only fetch if not editing AND there's a URL
            if (!isEditing && poi?.googlePlaceUrl) {
                setIsLoadingViewData(true);
                setViewModePlaceData(null); // Clear previous data before fetching
                try {
                    // Use the same context function as the preview
                    const data = await processGooglePlacesLink(poi.googlePlaceUrl);
                    setViewModePlaceData(data); // Store fetched data
                } catch (error) {
                    console.error('[POIViewer] Error fetching view mode Google Places data:', error);
                    setViewModePlaceData(null); // Ensure it's null on error
                } finally {
                    setIsLoadingViewData(false);
                }
            } else {
                // Clear data if we switch to editing or if the URL is removed/missing
                setViewModePlaceData(null);
                setIsLoadingViewData(false);
            }
        };

        fetchViewData();
        // Rerun when URL changes or when switching between edit/view modes
    }, [poi?.googlePlaceUrl, isEditing, processGooglePlacesLink]);


    const iconDef = getIconDefinition(poi.icon);
    // Add fallback color in case the category doesn't exist in POI_CATEGORIES
    const categoryColor = POI_CATEGORIES[poi.category]?.color || '#777777'; // Default gray color if category not found

    return _jsxs(_Fragment, { children: [
        _jsx(Modal, {
            open: Boolean(poi),
            onClose: onClose,
            "aria-labelledby": "poi-viewer-modal",
            children: _jsxs(Box, {
                sx: {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(30, 136, 229, 0.5)',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                },
                children: [
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
                                    isEditing ? (
                                        _jsx(TextField, {
                                            value: editedName,
                                            onChange: (e) => setEditedName(e.target.value),
                                            variant: "standard",
                                            sx: {
                                                input: { color: 'white', fontSize: '1.25rem' },
                                                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.42)' },
                                                '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255, 255, 255, 0.87)' },
                                            }
                                        })
                                    ) : (
                                        _jsx(Typography, { variant: "h6", color: "white", children: poi.name })
                                    )
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
                    _jsxs(Box, {
                        children: [
                            _jsx(Box, {
                                sx: {
                                    mb: 3,
                                    p: 2,
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(45, 45, 45, 0.9)',
                                },
                                children: isEditing ? (
                                    _jsx(TextField, {
                                        fullWidth: true,
                                        multiline: true,
                                        minRows: 3,
                                        value: editedDescription,
                                        onChange: (e) => setEditedDescription(e.target.value),
                                        variant: "outlined",
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                color: 'white',
                                                bgcolor: 'rgba(0, 0, 0, 0.2)',
                                                '& fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                                },
                                            },
                                        }
                                    })
                                ) : (
                                    _jsx(Typography, {
                                        variant: "body1",
                                        color: "white",
                                        sx: { whiteSpace: 'pre-wrap' },
                                        children: poi.description || 'No description'
                                    })
                                )
                            }),

                            // Display Google Places Info in View Mode
                            /* Corrected JSX conditional rendering */
                            (!isEditing && (isLoadingViewData || viewModePlaceData || poi?.googlePlaceUrl)) && ( // Show box if loading, has data, or has URL (to show loading/error)
                                _jsxs(Box, { sx: { mb: 3, p: 2, backgroundColor: 'rgb(45, 45, 45)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }, children: [
                                    _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 }, children: [
                                        _jsx(Star, { sx: { color: '#FFD700', fontSize: '20px' } }),
                                        _jsx(Typography, { variant: "subtitle2", color: "white", fontWeight: "bold", children: "Google Place Info" }),
                                        isLoadingViewData && _jsx(CircularProgress, { size: 16, sx: { color: 'white', ml: 1 } })
                                    ]}),
                                    _jsx(Box, { sx: { borderTop: '1px solid rgba(255, 255, 255, 0.1)', my: 1 } }),
                                    (!isLoadingViewData && viewModePlaceData) && _jsxs(_Fragment, { children: [
                                        viewModePlaceData.name && _jsx(Typography, { variant: "body2", color: "white", mb: 0.5, children: viewModePlaceData.name }),
                                        viewModePlaceData.address && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [
                                            _jsx(LocationOn, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }),
                                            _jsx(Typography, { variant: "caption", color: "grey.400", children: viewModePlaceData.address })
                                        ]}),
                                        viewModePlaceData.rating && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [
                                            _jsx(Rating, { value: viewModePlaceData.rating, precision: 0.1, readOnly: true, size: "small", sx: { mr: 0.5 } }),
                                            _jsx(Typography, { variant: "caption", color: "grey.400", children: `${viewModePlaceData.rating} / 5` })
                                        ]}),
                                        viewModePlaceData.phoneNumber && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [
                                            _jsx(Phone, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }),
                                            _jsx(Typography, { variant: "caption", color: "grey.400", children: viewModePlaceData.phoneNumber })
                                        ]}),
                                        viewModePlaceData.website && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [
                                            _jsx(Language, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }),
                                            _jsx(Link, { href: viewModePlaceData.website, target: "_blank", rel: "noopener noreferrer", sx: { color: '#90caf9', fontSize: '0.75rem', '&:hover': { textDecoration: 'underline' } }, children: viewModePlaceData.website })
                                        ]})
                                    ]}),
                                    (!isLoadingViewData && !viewModePlaceData && poi?.googlePlaceUrl) && (
                                         _jsx(Typography, { variant: "caption", color: "grey.500", children: "Could not load Google Place information." })
                                    )
                                     /* Don't show anything if not loading, no data, and no URL */
                                ]})
                            ),

                            // Add Google Places Link Input (only when editing)
                            isEditing && _jsxs(Box, {
                                sx: { mb: linkPreviewData ? 1 : 3, display: 'flex', alignItems: 'center', gap: 1 }, // Adjust margin based on preview
                                children: [
                                     _jsx(TextField, {
                                        label: "Google Places Link (optional)",
                                        value: editedGooglePlacesLink,
                                        onChange: (e) => setEditedGooglePlacesLink(e.target.value),
                                        fullWidth: true,
                                        variant: "outlined",
                                        size: "small",
                                        placeholder: "Paste Google Maps Embed link...",
                                        error: !!linkError,
                                        helperText: linkError,
                                        sx: {
                                            backgroundColor: 'rgb(35, 35, 35)', // Match other fields
                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgb(255, 255, 255)' }, '&:hover fieldset': { borderColor: 'rgb(255, 255, 255)' }, '&.Mui-focused fieldset': { borderColor: 'rgb(255, 255, 255)' } },
                                            '& .MuiInputLabel-root': { color: 'rgb(255, 255, 255)' },
                                            '& .MuiOutlinedInput-input': { color: 'rgb(255, 255, 255)' },
                                            '& .MuiFormHelperText-root': { color: 'rgb(255, 99, 99)' }
                                        }
                                    }),
                                    isProcessingLink && _jsx(CircularProgress, { size: 24, sx: { color: 'white' } })
                                ]
                            }),
                            // Add Google Places Preview (only when editing and preview data exists)
                            isEditing && linkPreviewData && _jsxs(Box, {
                                sx: { // Style copied from POIDetailsDrawer preview
                                    mb: 3, p: 2, // Use mb: 3 to match spacing
                                    backgroundColor: 'rgb(45, 45, 45)', borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                },
                                children: [
                                     _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 }, children: [ _jsx(Star, { sx: { color: '#FFD700', fontSize: '20px' } }), _jsx(Typography, { variant: "subtitle2", color: "white", fontWeight: "bold", children: "Google Places Preview" }) ] }),
                                     _jsx(Box, { sx: { borderTop: '1px solid rgba(255, 255, 255, 0.1)', my: 1 } }), // Divider
                                     linkPreviewData.name && _jsx(Typography, { variant: "body2", color: "white", mb: 0.5, children: linkPreviewData.name }),
                                     linkPreviewData.address && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [ _jsx(LocationOn, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }), _jsx(Typography, { variant: "caption", color: "grey.400", children: linkPreviewData.address }) ] }),
                                     linkPreviewData.rating && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [ _jsx(Rating, { value: linkPreviewData.rating, precision: 0.1, readOnly: true, size: "small", sx:{ mr: 0.5 } }), _jsx(Typography, { variant: "caption", color: "grey.400", children: `${linkPreviewData.rating} / 5` }) ] }),
                                     linkPreviewData.phoneNumber && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [ _jsx(Phone, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }), _jsx(Typography, { variant: "caption", color: "grey.400", children: linkPreviewData.phoneNumber }) ] }),
                                     linkPreviewData.website && _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 0.5 }, children: [ _jsx(Language, { sx: { color: 'white', mr: 0.5, fontSize: '16px'} }), _jsx(Link, { href: linkPreviewData.website, target: "_blank", rel: "noopener noreferrer", sx: { color: '#90caf9', fontSize: '0.75rem', '&:hover': { textDecoration: 'underline' } }, children: linkPreviewData.website }) ] }),
                                ]
                            }),
                            // Original Photo Section
                            _jsxs(Box, {
                                children: [
                                    _jsxs(Box, {
                                        sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 },
                                        children: [
                                            _jsxs(Typography, {
                                                variant: "subtitle2",
                                                color: "white",
                                                children: ["Photos (", (poi.photos?.length || 0) + newPhotos.length, ")"]
                                            }),
                                            isEditing && (
                                                _jsxs(Button, {
                                                    component: "label",
                                                    variant: "outlined",
                                                    size: "small",
                                                    sx: { color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)' },
                                                    children: [
                                                        "Add Photos",
                                                        _jsx("input", {
                                                            type: "file",
                                                            hidden: true,
                                                            multiple: true,
                                                            accept: "image/*",
                                                            onChange: (e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                handleAddPhotos(files);
                                                            }
                                                        })
                                                    ]
                                                })
                                            )
                                        ]
                                    }),
                                    _jsxs(Box, {
                                        sx: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 1
                                        },
                                        children: [
                                            poi.photos?.map((photo, index) => (
                                                _jsxs(Box, {
                                                    onClick: () => setSelectedPhoto(photo.url),
                                                    sx: {
                                                        aspectRatio: '1',
                                                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        position: 'relative',
                                                        '&:hover': {
                                                            transform: 'scale(1.02)'
                                                        }
                                                    },
                                                    children: [
                                                        _jsx("img", {
                                                            src: photo.url,
                                                            alt: photo.caption || `Photo ${index + 1}`,
                                                            style: {
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }
                                                        }),
                                                        isEditing && (
                                                            _jsx(IconButton, {
                                                                size: "small",
                                                                onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    if (poi.photos) {
                                                                        const updatedPhotos = [...poi.photos];
                                                                        updatedPhotos.splice(index, 1);
                                                                        // Update local state only, save happens on Save button click
                                                                        setPoi({ ...poi, photos: updatedPhotos });
                                                                    }
                                                                },
                                                                sx: {
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                                    color: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                                    }
                                                                },
                                                                children: _jsx(Close, { fontSize: "small" })
                                                            })
                                                        )
                                                    ]
                                                }, index)
                                            )),
                                            newPhotos.map((photo, index) => (
                                                _jsxs(Box, {
                                                    sx: {
                                                        aspectRatio: '1',
                                                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    },
                                                    children: [
                                                        _jsx("img", {
                                                            src: photo.url,
                                                            alt: photo.caption || `New photo ${index + 1}`,
                                                            style: {
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }
                                                        }),
                                                        isEditing && (
                                                            _jsx(IconButton, {
                                                                size: "small",
                                                                onClick: () => handleRemoveNewPhoto(index),
                                                                sx: {
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                                    color: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                                                    }
                                                                },
                                                                children: _jsx(Close, { fontSize: "small" })
                                                            })
                                                        )
                                                    ]
                                                }, `new-${index}`)
                                            ))
                                        ]
                                    })
                                ]
                            }),
                            // Footer
                            _jsx(Box, {
                                sx: {
                                    mt: 3,
                                    display: 'flex',
                                    gap: 1,
                                    justifyContent: 'flex-end',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                                    pt: 2
                                },
                                children: !isEditing ? (
                                    _jsxs(_Fragment, {
                                        children: [
                                            _jsx(Button, {
                                                variant: "outlined",
                                                startIcon: _jsx(Delete, {}),
                                                onClick: () => {
                                                    removePOI(poi.id);
                                                    onClose();
                                                },
                                                sx: {
                                                    color: 'white',
                                                    borderColor: 'white',
                                                    '&:hover': {
                                                        borderColor: 'white',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                                    }
                                                },
                                                children: "Delete"
                                            }),
                                            _jsx(Button, {
                                                variant: "contained",
                                                startIcon: _jsx(Edit, {}),
                                                onClick: handleStartEditing,
                                                sx: {
                                                    backgroundColor: 'white',
                                                    color: 'black',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                                                    }
                                                },
                                                children: "Edit"
                                            })
                                        ]
                                    })
                                ) : (
                                    _jsxs(_Fragment, {
                                        children: [
                                            _jsx(Button, {
                                                variant: "outlined",
                                                startIcon: _jsx(Cancel, {}),
                                                onClick: handleCancelEditing,
                                                sx: {
                                                    color: 'white',
                                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                                    '&:hover': {
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    }
                                                },
                                                children: "Cancel"
                                            }),
                                            _jsx(Button, {
                                                variant: "contained",
                                                startIcon: _jsx(Save, {}),
                                                onClick: handleSave,
                                                color: "primary",
                                                children: "Save"
                                            })
                                        ]
                                    })
                                )
                            })
                        ]
                    })
                ]
            })
        }),
        _jsx(Modal, {
            open: Boolean(selectedPhoto),
            onClose: () => setSelectedPhoto(null),
            sx: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000, // Higher than the POI viewer modal
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)'
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
    ]});
};

export default POIViewer;
