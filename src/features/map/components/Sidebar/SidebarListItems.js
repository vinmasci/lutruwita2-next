import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, Tooltip, Divider, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { useRouteContext } from '../../context/RouteContext';
import { useMapContext } from '../../context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePlaceContext } from '../../../place/context/PlaceContext';
import { useLineContext } from '../../../lineMarkers/context/LineContext';
import { useMapOverview } from '../../../presentation/context/MapOverviewContext';
import { useAuth } from '../../../auth/context/AuthContext';
import { useAuthModal } from '../../../auth/context/AuthModalContext.jsx';
import { useSidebar } from './useSidebar';
import { SidebarIcons, RefreshIcon } from './icons';
import { SaveDialog } from './SaveDialog.jsx';
import { LoadDialog } from './LoadDialog';
import { EmbedDialog } from './EmbedDialog.jsx';
import { removeAllMapboxMarkers } from '../../utils/mapCleanup';

export const SidebarListItems = ({ onUploadGpx, onAddPhotos, onAddPOI, onAddLine, onAddMapOverview, onItemClick }) => {
    const { routes, savedRoutes, listRoutes, loadRoute, deleteSavedRoute, currentLoadedState, currentLoadedPersistentId, hasUnsavedChanges, isSaving, clearCurrentWork, setChangedSections } = useRouteContext();
    const { map } = useMapContext();
    const { clearPOIs, setPoiMode, clearPOIChanges } = usePOIContext();
    const { clearPhotos, clearPhotoChanges } = usePhotoContext();
    const { clearPlaces } = usePlaceContext();
    const { setIsDrawing, saveRoute, stopDrawing, lines, setLines, clearLineChanges } = useLineContext();
    const { clearMapOverviewChanges } = useMapOverview();
    const { isAuthenticated } = useAuth();
    const { showAuthModal } = useAuthModal();
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [activeItem, setActiveItem] = useState(null);
    const [clearConfirmDialogOpen, setClearConfirmDialogOpen] = useState(false);

    const handleEmbedClick = () => {
        console.log('Embed map clicked');
        setEmbedDialogOpen(true);
    };

    const handleSaveClick = () => {
        console.log('Save clicked, current routes:', routes);
        if (routes.length === 0) {
            console.warn('No routes to save');
            return;
        }
        setSaveDialogOpen(true);
    };

    const handleLoadClick = () => {
        console.log('Load clicked');
        // Open the modal immediately with loading state
        setIsLoadingRoutes(true);
        setLoadDialogOpen(true);
        // Show the snackbar notification
        setSnackbarOpen(true);
        setSnackbarMessage('Loading routes, this may take a moment...');
        setSnackbarSeverity('info');
        
        // Fetch routes in the background with metadataOnly=true for better performance
        listRoutes(undefined, true)
            .then(() => {
                // Update the loading state when routes are fetched
                setIsLoadingRoutes(false);
                // Close the snackbar
                setSnackbarOpen(false);
            })
            .catch(error => {
                console.error('Failed to list routes:', error);
                setIsLoadingRoutes(false);
                // Close the snackbar
                setSnackbarOpen(false);
            });
    };

    const handleClearClick = () => {
        console.log('Clear map clicked');
        if (routes.length === 0) {
            console.warn('No routes to clear');
            return;
        }
        
        // Show confirmation dialog instead of immediately clearing
        setClearConfirmDialogOpen(true);
    };
    
    const performClearMap = () => {
        console.log('Performing map clear');
        
        // Show confirmation snackbar
        setSnackbarMessage('Map cleared');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Clean up line-related map layers first
        if (map) {
            try {
                // First, remove all mapboxgl markers (including text and icon markers)
                removeAllMapboxMarkers(map);
                
                const style = map.getStyle();
                if (style && style.layers) {
                    console.log('[SidebarListItems] Cleaning up line-related map layers');
                    
                    // Find all line-related layers
                    const lineLayers = style.layers
                        .map(layer => layer.id)
                        .filter(id => 
                            id.startsWith('line-') || 
                            id.includes('circle-') || 
                            id.includes('inner-circle-')
                        );
                    
                    console.log('[SidebarListItems] Found line layers to remove:', lineLayers);
                    
                    // Remove each line layer
                    lineLayers.forEach(layerId => {
                        if (map.getLayer(layerId)) {
                            try {
                                console.log('[SidebarListItems] Removing line layer:', layerId);
                                map.removeLayer(layerId);
                            } catch (error) {
                                console.error('[SidebarListItems] Error removing line layer:', layerId, error);
                            }
                        }
                    });
                    
                    // Find all line-related sources
                    const lineSources = Object.keys(style.sources || {})
                        .filter(id => 
                            id.startsWith('line-') || 
                            id.includes('circle-source-')
                        );
                    
                    console.log('[SidebarListItems] Found line sources to remove:', lineSources);
                    
                    // Remove each line source
                    setTimeout(() => {
                        lineSources.forEach(sourceId => {
                            if (map.getSource(sourceId)) {
                                try {
                                    console.log('[SidebarListItems] Removing line source:', sourceId);
                                    map.removeSource(sourceId);
                                } catch (error) {
                                    console.error('[SidebarListItems] Error removing line source:', sourceId, error);
                                }
                            }
                        });
                    }, 100);
                }
            } catch (error) {
                console.error('[SidebarListItems] Error cleaning up line layers:', error);
            }
        }
        
        // Force cleanup of each route individually with enhanced layer/source detection
        routes.forEach(route => {
            const routeId = route.routeId || `route-${route.id}`;
            console.log('[SidebarListItems] Explicitly cleaning up route:', routeId);
            
            // If we have access to the map, try to remove all layers and sources for this route
            if (map) {
                try {
                    const style = map.getStyle();
                    if (!style || !style.layers) {
                        console.warn('[SidebarListItems] Map style not available');
                        return;
                    }
                    
                    // Normalize routeId to handle different formats
                    // Some components might use 'route-123' while others use just '123'
                    const normalizedRouteId = routeId.startsWith('route-') ? routeId : `route-${routeId}`;
                    const baseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
                    
                    // Create an array of possible ID formats to search for
                    const possibleRouteIds = [
                        routeId,
                        normalizedRouteId,
                        baseRouteId
                    ];
                    
                    console.log('[SidebarListItems] Searching for layers with possible IDs:', possibleRouteIds);
                    
                    // Find all layers associated with this route using all possible ID formats
                    const allLayers = style.layers
                        .map(layer => layer.id)
                        .filter(id => 
                            // Check if layer ID contains any of the possible route IDs
                            possibleRouteIds.some(possibleId => id.includes(possibleId)) ||
                            // Check for unpaved section layers with any possible ID format
                            possibleRouteIds.some(possibleId => id.startsWith(`unpaved-section-layer-${possibleId}`)) ||
                            possibleRouteIds.some(possibleId => id.startsWith(`unpaved-sections-layer-${possibleId}`))
                        );
                    
                    console.log('[SidebarListItems] Found map style layers:', allLayers);
                    
                    // Add known layer patterns for all possible ID formats
                    const knownLayerPatterns = [];
                    
                    // Generate patterns for each possible ID format
                    possibleRouteIds.forEach(id => {
                        knownLayerPatterns.push(
                            `${id}-main-border`,
                            `${id}-main-line`,
                            `${id}-hover`,
                            `${id}-hover-line`,
                            `${id}-surface`,
                            `${id}-unpaved-line`,
                            `unpaved-section-layer-${id}`,
                            `unpaved-sections-layer-${id}`
                        );
                    });
                    
                    // Also check for RouteLayer.js specific naming patterns
                    possibleRouteIds.forEach(id => {
                        knownLayerPatterns.push(
                            `${id}-main-line`,
                            `${id}-main-border`,
                            `${id}-hover-line`,
                            `unpaved-sections-layer-${id}`
                        );
                    });
                    
                    console.log('[SidebarListItems] Added known layer patterns:', knownLayerPatterns);
                    
                    // Combine all layer IDs and remove duplicates
                    const layersToRemove = [...new Set([...allLayers, ...knownLayerPatterns])];
                    console.log('[SidebarListItems] Final layers to remove:', layersToRemove);
                    
                    // Remove all layers first
                    console.log('[SidebarListItems] Starting layer removal process');
                    layersToRemove.forEach(layerId => {
                        if (map.getLayer(layerId)) {
                            try {
                                console.log('[SidebarListItems] Removing layer:', layerId);
                                map.removeLayer(layerId);
                                console.log('[SidebarListItems] Successfully removed layer:', layerId);
                            }
                            catch (error) {
                                console.error('[SidebarListItems] Error removing layer:', layerId, error);
                            }
                        }
                    });
                    
                    // Find all sources associated with this route using all possible ID formats
                    const sourcesToRemove = [];
                    
                    // Generate source patterns for each possible ID format
                    possibleRouteIds.forEach(id => {
                        sourcesToRemove.push(
                            `${id}-main`,
                            `${id}-unpaved`,
                            `unpaved-section-${id}`,
                            `unpaved-sections-${id}`
                        );
                    });
                    
                    // Get all source IDs from the style that match any of our patterns
                    const allSources = Object.keys(style.sources || {})
                        .filter(id => 
                            sourcesToRemove.includes(id) || 
                            possibleRouteIds.some(routeId => id.startsWith(`unpaved-section-${routeId}-`)) ||
                            possibleRouteIds.some(routeId => id.startsWith(`unpaved-sections-${routeId}-`))
                        );
                    
                    console.log('[SidebarListItems] Found sources to remove:', allSources);
                    
                    // Remove all sources after a brief delay to ensure layers are fully removed
                    setTimeout(() => {
                        allSources.forEach(sourceId => {
                            if (map.getSource(sourceId)) {
                                try {
                                    console.log('[SidebarListItems] Removing source:', sourceId);
                                    map.removeSource(sourceId);
                                    console.log('[SidebarListItems] Successfully removed source:', sourceId);
                                }
                                catch (error) {
                                    console.error('[SidebarListItems] Error removing source:', sourceId, error);
                                }
                            }
                        });
                    }, 200); // Increased delay to ensure layers are fully removed
                } catch (error) {
                    console.error('[SidebarListItems] Error cleaning up map layers:', error);
                }
            }
        });
        
        // Reset line drawing mode and stop drawing BEFORE clearing contexts
        // This ensures the line tool is properly reset
        setIsDrawing(false);
        
        if (typeof stopDrawing === 'function') {
            console.log('[SidebarListItems] Calling stopDrawing to reset line drawing state');
            stopDrawing();
        }
        
        // Clear lines array directly
        try {
            console.log('[SidebarListItems] Clearing lines array');
            setLines([]);
        } catch (error) {
            console.error('[SidebarListItems] Error clearing lines array:', error);
        }
        
        // Clear all data from contexts
        clearCurrentWork(); // Clear routes and loadedLineData
        clearPOIs(); // Clear POIs
        clearPhotos(); // Clear photos
        clearPlaces(); // Clear places
        setPoiMode('none'); // Reset POI mode
        
        // Clear change tracking in all contexts to ensure CommitChangesButton is reset
        if (typeof clearPhotoChanges === 'function') {
            console.log('[SidebarListItems] Clearing photo changes');
            clearPhotoChanges();
        }
        
        if (typeof clearPOIChanges === 'function') {
            console.log('[SidebarListItems] Clearing POI changes');
            clearPOIChanges();
        }
        
        if (typeof clearLineChanges === 'function') {
            console.log('[SidebarListItems] Clearing line changes');
            clearLineChanges();
        }
        
        if (typeof clearMapOverviewChanges === 'function') {
            console.log('[SidebarListItems] Clearing map overview changes');
            clearMapOverviewChanges();
        }
        
        // Reset the changedSections state in RouteContext to ensure the CommitChangesButton is reset
        setChangedSections({});
        console.log('[SidebarListItems] Reset changedSections in RouteContext');
        
        // Force a refresh of the map by triggering a style reload
        refreshMapStyle();
        
        // Force a refresh of the UI
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
        
        // Close the snackbar after a delay
        setTimeout(() => {
            setSnackbarOpen(false);
        }, 3000);
    };
    
    const handleRefreshClick = () => {
        console.log('Refresh map clicked');
        if (routes.length === 0) {
            console.warn('No routes to refresh');
            return;
        }
        
        // Show confirmation snackbar
        setSnackbarMessage('Map refreshed');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Force a refresh of the map by triggering a style reload
        refreshMapStyle();
        
        // Force a refresh of the UI
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
        
        // Close the snackbar after a delay
        setTimeout(() => {
            setSnackbarOpen(false);
        }, 3000);
    };
    
    // Helper function to refresh the map style
    const refreshMapStyle = () => {
        if (map) {
            try {
                // First, remove all mapboxgl markers to ensure they don't persist
                removeAllMapboxMarkers(map);
                
                // Get the current style
                const currentStyle = map.getStyle();
                if (currentStyle) {
                    // Force a style reload to refresh everything
                    const currentStyleUrl = currentStyle.sprite.split('/sprites')[0];
                    console.log('[SidebarListItems] Reloading map style:', currentStyleUrl);
                    
                    // Save current view state
                    const center = map.getCenter();
                    const zoom = map.getZoom();
                    const bearing = map.getBearing();
                    const pitch = map.getPitch();
                    
                    // Set the style again to force a complete reload
                    map.setStyle(currentStyleUrl);
                    
                    // Restore view state after style loads
                    map.once('style.load', () => {
                        map.setCenter(center);
                        map.setZoom(zoom);
                        map.setBearing(bearing);
                        map.setPitch(pitch);
                    });
                }
            } catch (error) {
                console.error('[SidebarListItems] Error reloading map style:', error);
            }
        }
    };

    // Show saving notification when isSaving changes
    useEffect(() => {
        if (isSaving) {
            setSnackbarMessage('Your route is saving, this may take a moment...');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
        } else if (snackbarMessage === 'Your route is saving, this may take a moment...') {
            setSnackbarOpen(false);
        }
    }, [isSaving, snackbarMessage]);

    // Wrapper function to check authentication before performing an action
    const withAuthCheck = (action, featureName) => {
        return () => {
            // Check if user is authenticated
            if (!isAuthenticated) {
                // If not authenticated, show auth modal
                showAuthModal(`You need to be signed in to ${featureName || 'access this feature'}.`);
                return;
            }
            
            // If authenticated, proceed with the action
            action();
        };
    };

    const handleItemClick = (id, onClick) => {
        setActiveItem(id === activeItem ? null : id);
        onClick();
    };

    const topItems = [
        {
            id: 'gpx',
            icon: SidebarIcons.actions.gpx,
            text: 'Add GPX',
            onClick: withAuthCheck(() => {
                onItemClick('gpx');
                onUploadGpx();
            }, 'add GPX files')
        },
        {
            id: 'mapOverview',
            icon: SidebarIcons.actions.mapOverview,
            text: 'Map Overview',
            onClick: withAuthCheck(() => {
                onItemClick('mapOverview');
                onAddMapOverview();
            }, 'add map overview')
        },
        {
            id: 'photos',
            icon: SidebarIcons.actions.photos,
            text: 'Add Photos',
            onClick: withAuthCheck(onAddPhotos, 'add photos')
        },
        {
            id: 'poi',
            icon: SidebarIcons.actions.poi,
            text: 'Add POI',
            onClick: withAuthCheck(onAddPOI, 'add points of interest')
        },
        {
            id: 'line',
            icon: SidebarIcons.actions.line,
            text: 'Add Line',
            onClick: withAuthCheck(() => {
                onItemClick('line');
                onAddLine();
            }, 'add lines')
        }
    ];

    const bottomItems = [
        {
            id: 'clear',
            icon: SidebarIcons.actions.clear,
            text: 'Clear Map',
            onClick: handleClearClick,
            disabled: routes.length === 0
        },
        {
            id: 'load',
            icon: SidebarIcons.actions.load,
            text: 'Load GPX',
            onClick: withAuthCheck(handleLoadClick, 'load saved routes')
        },
        {
            id: 'embed',
            icon: SidebarIcons.actions.embed,
            text: 'Embed Map',
            onClick: withAuthCheck(handleEmbedClick, 'create embeddable maps'),
            disabled: routes.length === 0
        }
    ];

    return (_jsxs(_Fragment, { 
        children: [
            // Snackbar notification for loading/saving routes
            _jsx(Snackbar, {
                open: snackbarOpen,
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                children: _jsx(Alert, {
                    severity: snackbarSeverity,
                    sx: { width: '100%', backgroundColor: 'rgb(35, 35, 35)', color: 'white' },
                    children: snackbarMessage
                })
            }),
            _jsx(List, { 
                sx: { display: 'flex', flexDirection: 'column', height: '100%' },
                children: [
                    ...topItems.map((item) => (
                        _jsx(Tooltip, { 
                            title: item.text, 
                            placement: "right", 
                            children: _jsx(ListItem, { 
                                disablePadding: true, 
                                children: _jsx(ListItemButton, { 
                                    onClick: () => handleItemClick(item.id, item.onClick),
                                    disabled: item.disabled,
                                    'data-active': activeItem === item.id,
                                    sx: {
                                        opacity: item.disabled ? 0.5 : 1,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        },
                                        '&:hover .MuiListItemIcon-root svg, &[data-active="true"] .MuiListItemIcon-root svg': {
                                            color: '#ff4d4f'
                                        }
                                    }, 
                                    children: _jsx(ListItemIcon, { 
                                        children: _jsx(item.icon, { strokeWidth: 1.5 }) 
                                    }) 
                                }) 
                            }) 
                        }, item.text)
                    )),
                    _jsx(Divider, { sx: { my: 1, borderColor: '#333' } }),
                    ...bottomItems.map((item) => (
                        _jsx(Tooltip, { 
                            title: item.text, 
                            placement: "right", 
                            children: _jsx(ListItem, { 
                                disablePadding: true, 
                                children: _jsx(ListItemButton, { 
                                    onClick: () => handleItemClick(item.id, item.onClick),
                                    disabled: item.disabled,
                                    'data-active': activeItem === item.id,
                                    sx: {
                                        opacity: item.disabled ? 0.5 : 1,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        },
                                        '&:hover .MuiListItemIcon-root svg, &[data-active="true"] .MuiListItemIcon-root svg': {
                                            color: '#ff4d4f'
                                        }
                                    }, 
                                    children: _jsx(ListItemIcon, { 
                                        children: _jsx(item.icon, { strokeWidth: 1.5 }) 
                                    }) 
                                }) 
                            }) 
                        }, item.text)
                    ))
                ]
            }), 
            _jsx(SaveDialog, { 
                open: saveDialogOpen, 
                onClose: () => setSaveDialogOpen(false), 
                onSave: (formData) => {
                    // Don't close the dialog immediately, let it stay open while saving
                    // The isSaving prop will show the spinner
                    saveRoute(formData.name, formData.type, formData.isPublic, formData.eventDate)
                        .then(() => {
                            setSaveDialogOpen(false);
                        })
                        .catch(error => {
                            console.error('Failed to save:', error);
                        });
                }, 
                initialValues: currentLoadedState ? {
                    name: currentLoadedState.name,
                    type: currentLoadedState.type || 'tourism',
                    isPublic: currentLoadedState.isPublic || false,
                    eventDate: currentLoadedState.eventDate || null
                } : undefined, 
                isEditing: !!currentLoadedPersistentId,
                isSaving: isSaving
            }), 
            _jsx(LoadDialog, { 
                open: loadDialogOpen, 
                onClose: () => setLoadDialogOpen(false), 
                routes: savedRoutes,
                isLoading: isLoadingRoutes,
                onLoad: async (id) => {
                    try {
                        await loadRoute(id);
                        setLoadDialogOpen(false);
                    }
                    catch (error) {
                        console.error('Failed to load:', error);
                    }
                }, 
                onDelete: deleteSavedRoute, 
                hasUnsavedChanges: hasUnsavedChanges 
            }),
            _jsx(EmbedDialog, {
                open: embedDialogOpen,
                onClose: () => setEmbedDialogOpen(false)
            }),
            // Confirmation dialog for clearing the map
            _jsx(Dialog, {
                open: clearConfirmDialogOpen,
                onClose: () => setClearConfirmDialogOpen(false),
                "aria-labelledby": "clear-map-dialog-title",
                children: _jsxs(_Fragment, {
                    children: [
                        _jsx(DialogTitle, { 
                            id: "clear-map-dialog-title",
                            children: "Clear Map"
                        }),
                        _jsx(DialogContent, {
                            children: _jsx(DialogContentText, {
                                children: "Are you sure you want to clear the map? This action cannot be undone."
                            })
                        }),
                        _jsx(DialogActions, {
                            children: _jsxs(_Fragment, {
                                children: [
                                    _jsx(Button, {
                                        onClick: () => setClearConfirmDialogOpen(false),
                                        children: "No"
                                    }),
                                    _jsx(Button, {
                                        onClick: () => {
                                            setClearConfirmDialogOpen(false);
                                            performClearMap();
                                        },
                                        color: "primary",
                                        variant: "contained",
                                        children: "Yes"
                                    })
                                ]
                            })
                        })
                    ]
                })
            })
        ] 
    }));
};
