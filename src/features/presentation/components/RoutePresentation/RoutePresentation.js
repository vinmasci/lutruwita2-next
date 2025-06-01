import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicRoute } from '../../../../services/firebasePublicRouteService';
import { PresentationMapView } from '../PresentationMapView';
import { Box, CircularProgress, Alert } from '@mui/material';
import { RouteProvider, useRouteContext } from '../../../map/context/RouteContext';
import { LineProvider, useLineContext } from '../../../lineMarkers/context/LineContext.jsx';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { useAutoSave } from '../../../../context/AutoSaveContext';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
import { useRef } from 'react'; // Import useRef
import logger from '../../../../utils/logger';
import { normalizeRoute } from '../../../map/utils/routeUtils';

// Module-level Set to track initialized persistent IDs across mounts/sessions
const initializedPersistentIds = new Set();

// Module-level variable to track if we're currently in a loading state
// This prevents duplicate loading attempts if components remount
let isCurrentlyLoading = false;

export const RoutePresentation = ({ routeId: propRouteId }) => {
    const { id: paramId } = useParams();
    const id = propRouteId || paramId; // Use prop if provided, otherwise use URL param
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lineData, setLineData] = useState([]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (!id) {
                setRoute(null); // Clear route if ID is gone
                setLoading(false);
                setError(null);
                return;
            }

            // If we already have the correct route loaded and are not in an error state, don't re-fetch.
            if (route && route.persistentId === id && !error) {
                console.log(`[RoutePresentation] ✅ Route ID ${id} already loaded and no error. Skipping fetch.`);
                setLoading(false); // Ensure loading is false if we skip.
                return;
            }
            
            // Check if a global fetch is already in progress
            if (isCurrentlyLoading) {
                console.log(`[RoutePresentation] ⏭️ A global fetch is already in progress. Skipping duplicate fetch for ID: ${id}`);
                return;
            }
            
            console.log(`[RoutePresentation] Initiating data fetch for route ID: ${id}`);
            isCurrentlyLoading = true; // Set the global loading flag
            
            try {
                setLoading(true);
                setError(null); // Clear previous errors for this new attempt
                
                let routeData = await getPublicRoute(id);
                
                if (routeData) {
                    console.log('[RoutePresentation] Successfully loaded route from Firebase for ID:', id);
                    // Ensure routes array exists and is valid before setting
                    if (routeData.routes && Array.isArray(routeData.routes)) {
                        setRoute(routeData);
                    } else {
                        console.error('[RoutePresentation] Invalid route data structure received for ID:', id, routeData);
                        setError('Invalid route data structure');
                        setRoute(null);
                    }
                } else {
                    console.log('[RoutePresentation] Route not found in Firebase for ID:', id);
                    setError('Route not found');
                    setRoute(null); // Clear any old route data
                }
            }
            catch (fetchErr) { // Renamed to avoid conflict with outer error state
                console.error(`[RoutePresentation] Error fetching route ID ${id}:`, fetchErr);
                setError(`Failed to load route: ${fetchErr.message}`);
                setRoute(null); // Clear any old route data on error
            }
            finally {
                setLoading(false);
                isCurrentlyLoading = false; // Reset the global loading flag
            }
        };
        
        fetchRoute();
        
        // Cleanup function to reset loading state if component unmounts during fetch
        return () => {
            // This cleanup for a module-level flag can be tricky.
            // If this specific effect instance initiated the load that is 'isCurrentlyLoading',
            // then it should reset it on unmount if the load didn't complete.
            // For now, keeping the original behavior, but it's an area for potential refinement
            // if race conditions with the global flag are observed.
            if (isCurrentlyLoading) {
                isCurrentlyLoading = false;
            }
        };
    }, [id]); // Fixed: Only depend on id, not route or error which cause infinite loops

    // Process routes using normalizeRoute function
    const routes = useMemo(() => {
        if (!route)
            return [];

        if (!route.routes || !Array.isArray(route.routes) || route.routes.length === 0) {
            return [];
        }

        return route.routes.map(routeData => {
            if (!routeData.routeId) {
                return null;
            }

            try {
                // Create a route object that matches the format expected by normalizeRoute
                const routeForNormalization = {
                    ...route,
                    routes: [routeData]
                };
                
                // Use normalizeRoute to properly format the route data
                const normalizedRoute = normalizeRoute(routeForNormalization);
                
                // Add persistentId to the normalized route
                normalizedRoute.persistentId = route.persistentId;
                
                // Log the normalized route for debugging
                console.log('[RoutePresentation] Normalized route:', {
                    routeId: normalizedRoute.routeId,
                    hasGeojson: !!normalizedRoute.geojson,
                    geojsonType: normalizedRoute.geojson?.type,
                    featuresCount: normalizedRoute.geojson?.features?.length || 0
                });
                
                return normalizedRoute;
            } catch (error) {
                console.error('[RoutePresentation] Error normalizing route:', error);
                
                // Fallback to the original approach if normalization fails
                return {
                    ...routeData,
                    _type: 'loaded',
                    _loadedState: {
                        ...route,
                        persistentId: route.persistentId
                    },
                    persistentId: route.persistentId,
                    id: routeData.routeId,
                    isVisible: true,
                    status: {
                        processingState: 'completed',
                        progress: 100
                    }
                };
            }
        }).filter((route) => route !== null);
    }, [route]);

    // Create a memoized component for route content with a more stable identity
    const RouteContent = React.memo(({ route, routeId, lineData }) => {
        // Destructure setCurrentLoadedState and setCurrentLoadedPersistentId
        const { addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId } = useRouteContext();
        const { addPhoto } = usePhotoContext();
        const { loadPOIsFromRoute } = usePOIContext();
        const { loadLinesFromRoute } = useLineContext();
        const { setLoadedPermanentRoute } = useAutoSave();
        const isMountedRef = useRef(true); // Track component mount status
        const initializationStartedRef = useRef(false); // Track if initialization has started
        
        // Log mount/unmount for debugging
        logger.info('RouteContent', `Component mounted with route ID: ${routeId}`);
        
        // Set mount status to false on unmount
        useEffect(() => {
            isMountedRef.current = true;
            
            return () => {
                logger.info('RouteContent', `Component unmounting with route ID: ${routeId}`);
                isMountedRef.current = false;
            };
        }, [routeId]);

        // Initialize routes once when processed data is available for a specific route ID
        useEffect(() => {
            // Skip if already started initialization for this component instance
            if (initializationStartedRef.current) {
                return;
            }

            // Skip if no routes, invalid route ID, or if this persistent ID has already been initialized globally
            if (!routes.length || !routeId || initializedPersistentIds.has(routeId)) {
                return;
            }

            // Mark that initialization has started for this component instance
            initializationStartedRef.current = true;

            // Batch route initialization
            const initializeRoutes = () => {
                try {
                    // Add all routes in a single batch
                    routes.forEach((route) => {
                        addRoute(route);
                    });

                    // Set initial route once all routes are added
                    setCurrentRoute(routes[0]);

                    // Load photos and POIs
                    if (route.photos) {
                        addPhoto(route.photos.map(deserializePhoto));
                    }

                    if (route.pois) {
                        loadPOIsFromRoute(route.pois);
                    }

                    // Check for line data and load it directly
                    if (route.lines) {
                        loadLinesFromRoute(route.lines);

                        // Store the line data in the parent component's state for direct rendering
                        // Only set state if component is still mounted
                        if (isMountedRef.current) {
                            setLineData(route.lines);
                        } else {
                            // Early return if component is unmounted to prevent further processing
                            return;
                        }
                    }
                    
                    // Set header settings if available
                    if (route.headerSettings) {
                        updateHeaderSettings(route.headerSettings);
                    }

                    // Set the overall loaded state and persistent ID
                    if (route && isMountedRef.current) {
                        // Make sure mapOverview is included in the loaded state
                        if (route.mapOverview) {
                            console.log('[RoutePresentation] Found mapOverview data in route:', route.mapOverview);
                        } else {
                            console.log('[RoutePresentation] No mapOverview data found in route');
                         }
                         
                         // Use the original top-level route object for setCurrentLoadedState
                         // This ensures properties like routeType, headerSettings, mapOverview are available
                         setCurrentLoadedState(route); 
                         if (routeId) {
                             setCurrentLoadedPersistentId(routeId);
                             // Also set the loaded permanent route in AutoSaveContext
                             setLoadedPermanentRoute(routeId);
                             console.log('[RoutePresentation] Set loaded permanent route in AutoSaveContext:', routeId);
                        }
                    }

                    // Mark this persistent ID as initialized globally, only if still mounted
                    if (isMountedRef.current && routeId) {
                        initializedPersistentIds.add(routeId);
                    }
                } catch (error) {
                    logger.error('RoutePresentation', 'Error during route initialization:', error);
                }
            };

            // Run initialization only if component is mounted
            if (isMountedRef.current) {
                initializeRoutes();
            }
        // Dependencies: Only re-run if the specific route object with a valid persistentId changes, or the processed routes array changes.
        }, [route, routes, routeId, addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId, setLoadedPermanentRoute, addPhoto, loadPOIsFromRoute, loadLinesFromRoute]);

        // Conditionally render PresentationMapView based on routes length
        // Loading/error handled by parent overlay
        if (!routes || routes.length === 0) {
             return null; // Don't render map if no routes
        }

        return _jsx(PresentationMapView, { lineData: lineData });
    });

    // Set display name for debugging
    RouteContent.displayName = 'RouteContent';

    // Always render the providers and RouteContent structure
    // Handle loading/error states inside or overlayed
    // Create an array of children with proper keys
    const boxChildren = [];
    
    // Conditionally add RouteContent
    if (!loading && !error && route && routes.length > 0) {
        boxChildren.push(
            _jsx(RouteContent, { 
                route: route, 
                routeId: route.persistentId,
                lineData: lineData
            }, `route-content-${route.persistentId}`)
        );
    }
    
    // Conditionally add loading overlay
    if (loading) {
        boxChildren.push(
            _jsx(Box, {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                sx: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 10
                }
            }, "loading-overlay", _jsx(CircularProgress, {}))
        );
    }
    
    // Conditionally add error overlay
    if (!loading && (error || !route || routes.length === 0)) {
        boxChildren.push(
            _jsx(Box, {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                sx: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 10,
                    p: 2 // Add padding for the alert
                }
            }, "error-overlay", _jsx(Alert, {
                severity: "error",
                sx: { maxWidth: 'sm' },
                children: error || (routes.length === 0 ? 'No valid routes found in data' : 'Route not found')
            }))
        );
    }
    
    return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children:
        _jsx(Box, { 
            sx: { position: 'relative', width: '100%', height: '100vh' }, 
            children: boxChildren
        })
    }) }));
};
