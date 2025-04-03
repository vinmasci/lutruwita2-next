import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service.js';
import { PresentationMapView } from '../PresentationMapView';
import { Box, CircularProgress, Alert } from '@mui/material';
import { RouteProvider, useRouteContext } from '../../../map/context/RouteContext';
import { LineProvider, useLineContext } from '../../../lineMarkers/context/LineContext.jsx';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
import { useRef } from 'react'; // Import useRef
import logger from '../../../../utils/logger';

// Module-level Set to track initialized persistent IDs across mounts/sessions
const initializedPersistentIds = new Set();

// Module-level variable to track if we're currently in a loading state
// This prevents duplicate loading attempts if components remount
let isCurrentlyLoading = false;

export const RoutePresentation = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lineData, setLineData] = useState([]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (!id) return;
            
            // Check if we're already loading this route
            if (isCurrentlyLoading) {
                console.log('[RoutePresentation] ⏭️ Already loading a route, skipping duplicate fetch');
                return;
            }
            
            // Set the global loading flag
            isCurrentlyLoading = true;
            
            try {
                console.log('[RoutePresentation] 🔄 START: Fetching route data for ID:', id);
                setLoading(true);
                setError(null);
                
                const routeData = await publicRouteService.loadRoute(id);
                console.log('[RoutePresentation] ✅ Received route data:', {
                    hasData: !!routeData,
                    persistentId: routeData?.persistentId,
                    routesCount: routeData?.routes?.length || 0,
                    dataSize: JSON.stringify(routeData).length,
                });

                if (!routeData) {
                    console.error('[RoutePresentation] Route data is null or undefined');
                    setError('Route data is empty');
                    return;
                }

                if (!routeData.routes || !Array.isArray(routeData.routes)) {
                    console.error('[RoutePresentation] Missing routes array:', routeData.routes);
                    setError('Invalid route data structure');
                    return;
                }

                // Only update state if the route ID has changed or route is null
                if (!route || route.persistentId !== routeData.persistentId) {
                     console.log('[RoutePresentation] Setting new route state for persistentId:', routeData.persistentId);
                     setRoute(routeData);
                } else {
                     console.log('[RoutePresentation] Fetched route data has same persistentId, not updating state reference.');
                     // Optionally, update specific fields if needed without changing the object reference
                     // For now, we assume if ID is same, data is same for stability.
                }
            }
            catch (error) {
                setError('Failed to load route');
                console.error('[RoutePresentation] Error fetching route:', error);
            }
            finally {
                setLoading(false);
                isCurrentlyLoading = false; // Reset the global loading flag
                console.log('[RoutePresentation] 🏁 DONE: Route fetching completed');
            }
        };
        
        fetchRoute();
        
        // Cleanup function to reset loading state if component unmounts during fetch
        return () => {
            if (isCurrentlyLoading) {
                console.log('[RoutePresentation] 🛑 Component unmounted during fetch, resetting loading state');
                isCurrentlyLoading = false;
            }
        };
    }, [id]);

    // Just add required fields to server routes
    const routes = useMemo(() => {
        console.log('[RoutePresentation] 🔄 Processing routes from fetched data');
        if (!route)
            return [];

        if (!route.routes || !Array.isArray(route.routes) || route.routes.length === 0) {
            console.error('[RoutePresentation] Invalid routes array:', route.routes);
            return [];
        }

        console.log('[RoutePresentation] Processing', route.routes.length, 'routes');

        return route.routes.map(routeData => {
            if (!routeData.routeId) {
                console.error('[RoutePresentation] Route data missing routeId:', routeData);
                return null;
            }

            // Ensure the route object has the persistentId property
            return {
                ...routeData,
                _type: 'loaded',
                _loadedState: {
                    ...route,
                    // Ensure persistentId is explicitly set in _loadedState
                    persistentId: route.persistentId
                },
                // Also set persistentId directly on the route object
                persistentId: route.persistentId,
                id: routeData.routeId,
                isVisible: true,
                status: {
                    processingState: 'completed',
                    progress: 100
                }
            };
        }).filter((route) => route !== null);
    }, [route]);

    // Create a memoized component for route content with a more stable identity
    const RouteContent = React.memo(({ route, routeId, lineData }) => {
        // Destructure setCurrentLoadedState and setCurrentLoadedPersistentId
        const { addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId } = useRouteContext();
        const { addPhoto } = usePhotoContext();
        const { loadPOIsFromRoute } = usePOIContext();
        const { loadLinesFromRoute } = useLineContext();
        const isMountedRef = useRef(true); // Track component mount status
        const initializationStartedRef = useRef(false); // Track if initialization has started
        
        // Log mount/unmount for debugging
        logger.info('RouteContent', `Component mounted with route ID: ${routeId}`);
        console.log('[RouteContent] Component mounted with route ID:', routeId);
        
        // Set mount status to false on unmount
        useEffect(() => {
            isMountedRef.current = true;
            
            return () => {
                logger.info('RouteContent', `Component unmounting with route ID: ${routeId}`);
                console.log('[RouteContent] Component unmounting with route ID:', routeId);
                isMountedRef.current = false;
            };
        }, [routeId]);

        // Initialize routes once when processed data is available for a specific route ID
        useEffect(() => {
            // Skip if already started initialization for this component instance
            if (initializationStartedRef.current) {
                console.log('[RoutePresentation] ⏭️ Initialization already started for this component instance, skipping');
                return;
            }
            
            console.log('[RoutePresentation] 🔄 RouteContent useEffect triggered. Route ID:', routeId, 'Routes count:', routes.length, 'Already Initialized:', initializedPersistentIds.has(routeId));

            // Skip if no routes, invalid route ID, or if this persistent ID has already been initialized globally
            if (!routes.length || !routeId || initializedPersistentIds.has(routeId)) {
                console.log('[RoutePresentation] ⏭️ Skipping initialization - no routes, invalid route ID, or already initialized globally for this ID');
                return;
            }

            // Mark that initialization has started for this component instance
            initializationStartedRef.current = true;

            // Batch route initialization
            const initializeRoutes = () => {
                console.log('[RoutePresentation] 🚀 STARTING ROUTE INITIALIZATION');
                console.time('routeInitialization');

                try {
                    // Add all routes in a single batch
                    console.log('[RoutePresentation] Adding', routes.length, 'routes to RouteContext');
                    console.time('addRoutes');
                    routes.forEach((route) => {
                        addRoute(route);
                    });
                    console.timeEnd('addRoutes');
                    console.log('[RoutePresentation] ✅ Added all routes to RouteContext');

                    // Set initial route once all routes are added
                    console.log('[RoutePresentation] Setting current route:', routes[0]?.routeId);
                    setCurrentRoute(routes[0]);
                    console.log('[RoutePresentation] ✅ Current route set');

                    // Load photos and POIs
                    if (route.photos) {
                        console.log('[RoutePresentation] Loading photos:', route.photos.length);
                        console.time('addPhotos');
                        addPhoto(route.photos.map(deserializePhoto));
                        console.timeEnd('addPhotos');
                        console.log('[RoutePresentation] ✅ Photos loaded');
                    } else {
                        console.log('[RoutePresentation] No photos to load');
                    }

                    if (route.pois) {
                        console.log('[RoutePresentation] Loading POIs:',
                            route.pois.draggable?.length || 0, 'draggable POIs,',
                            route.pois.places?.length || 0, 'place POIs');
                        console.time('loadPOIs');
                        loadPOIsFromRoute(route.pois);
                        console.timeEnd('loadPOIs');
                        console.log('[RoutePresentation] ✅ POIs loaded');
                    } else {
                        console.log('[RoutePresentation] No POIs to load');
                    }

                    // Check for line data and load it directly
                    if (route.lines) {
                        console.log('[RoutePresentation] Found line data in route:', route.lines.length, 'lines');
                        console.time('loadLines');
                        loadLinesFromRoute(route.lines);
                        console.timeEnd('loadLines');

                        // Store the line data in the parent component's state for direct rendering
                        // Only set state if component is still mounted
                        if (isMountedRef.current) {
                            setLineData(route.lines);
                            console.log('[RoutePresentation] ✅ Lines loaded and stored for direct rendering');
                        } else {
                            console.log('[RoutePresentation] ⚠️ Component unmounted before setting line data');
                            // Early return if component is unmounted to prevent further processing
                            return;
                        }
                    } else {
                        console.log('[RoutePresentation] No line data found in route');
                    }
                    
                    // Set header settings if available
                    if (route.headerSettings) {
                        updateHeaderSettings(route.headerSettings);
                    } else {
                        console.warn('[RoutePresentation] No header settings found in route data');
                    }

                    // Set the overall loaded state and persistent ID
                    if (route && isMountedRef.current) {
                        console.log('[RoutePresentation] Setting currentLoadedState with fetched route data');
                        setCurrentLoadedState(route);
                        if (routeId) {
                            console.log('[RoutePresentation] Setting currentLoadedPersistentId:', routeId);
                            setCurrentLoadedPersistentId(routeId);
                        } else {
                            console.warn('[RoutePresentation] persistentId missing from fetched route data');
                        }
                    } else if (!route) {
                        console.warn('[RoutePresentation] Fetched route data is null, cannot set currentLoadedState');
                    } else {
                        console.warn('[RoutePresentation] Component unmounted, skipping currentLoadedState update');
                    }

                    // Mark this persistent ID as initialized globally, only if still mounted
                    if (isMountedRef.current && routeId) {
                        initializedPersistentIds.add(routeId);
                        console.timeEnd('routeInitialization');
                        console.log('[RoutePresentation] 🏁 ROUTE INITIALIZATION COMPLETED for ID:', routeId);
                    } else {
                        console.log('[RoutePresentation] ⚠️ Component unmounted during initialization, not adding ID to global initialized set:', routeId);
                    }
                } catch (error) {
                    console.error('[RoutePresentation] Error during route initialization:', error);
                    logger.error('RoutePresentation', 'Error during route initialization:', error);
                }
            };

            // Run initialization only if component is mounted
            if (isMountedRef.current) {
                initializeRoutes();
            } else {
                console.log('[RoutePresentation] ⚠️ Component unmounted before initialization could start for ID:', routeId);
            }
        // Dependencies: Only re-run if the specific route object with a valid persistentId changes, or the processed routes array changes.
        }, [route, routes, routeId, addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId, addPhoto, loadPOIsFromRoute, loadLinesFromRoute]);

        // Conditionally render PresentationMapView based on routes length
        // Loading/error handled by parent overlay
        if (!routes || routes.length === 0) {
             console.log('[RouteContent] No routes available to render MapView.');
             return null; // Don't render map if no routes
        }

        return _jsx(PresentationMapView, { lineData: lineData });
    });

    // Set display name for debugging
    RouteContent.displayName = 'RouteContent';

    // Always render the providers and RouteContent structure
    // Handle loading/error states inside or overlayed
    return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children:
        _jsx(Box, { sx: { position: 'relative', width: '100%', height: '100vh' }, children: [
            // Conditionally render RouteContent only when route data is loaded and valid
            !loading && !error && route && routes.length > 0 ? (
                _jsx(RouteContent, { 
                    route: route, 
                    routeId: route.persistentId,
                    lineData: lineData,
                    key: `route-content-${route.persistentId}` 
                })
            ) : null,

            // Loading overlay - Show only during initial load
            loading && (
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
                    },
                    children: _jsx(CircularProgress, {})
                })
            ),

            // Error overlay - Show if there's an error OR if loading finished but route is still invalid
            !loading && (error || !route || routes.length === 0) && (
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
                    },
                    children: _jsx(Alert, {
                        severity: "error",
                        sx: { maxWidth: 'sm' },
                        children: error || (routes.length === 0 ? 'No valid routes found in data' : 'Route not found')
                    })
                })
            )
        ] })
    }) }));
};
