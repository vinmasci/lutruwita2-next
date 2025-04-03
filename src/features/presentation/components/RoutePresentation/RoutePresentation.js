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

// Module-level flag to track initialization across remounts
let isRoutePresentationInitialized = false;

export const RoutePresentation = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lineData, setLineData] = useState([]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (!id)
                return;
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
                console.log('[RoutePresentation] 🏁 DONE: Route fetching completed');
            }
        };
        fetchRoute();
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

    // Create a memoized component for route content
    const RouteContent = React.memo(({ route }) => {
        // Destructure setCurrentLoadedState and setCurrentLoadedPersistentId
        const { addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId } = useRouteContext();
        const { addPhoto } = usePhotoContext();
        const { loadPOIsFromRoute } = usePOIContext();
        const { loadLinesFromRoute } = useLineContext();
        const isInitializedRef = useRef(false); // Use ref for initialization flag
        const isMountedRef = useRef(true); // Track component mount status

        // Set mount status to false on unmount
        useEffect(() => {
            isMountedRef.current = true;
            return () => {
                isMountedRef.current = false;
            };
        }, []);

        // Initialize routes once when processed data is available
        useEffect(() => {
            console.log('[RoutePresentation] 🔄 RouteContent useEffect triggered. Module Initialized:', isRoutePresentationInitialized, 'Routes count:', routes.length);

            // Skip if already initialized (using module flag) or no routes
            if (isRoutePresentationInitialized || !routes.length) {
                console.log('[RoutePresentation] ⏭️ Skipping initialization - already initialized or no routes');
                return;
            }

            // Batch route initialization
            const initializeRoutes = () => {
                console.log('[RoutePresentation] 🚀 STARTING ROUTE INITIALIZATION');
                console.time('routeInitialization');

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
                    }
                } else {
                    console.log('[RoutePresentation] No line data found in route');
                }
                // Set header settings if available
                if (route.headerSettings) {
                    // console.log('[RoutePresentation] Setting header settings:', route.headerSettings);
                    updateHeaderSettings(route.headerSettings);
                } else {
                    console.warn('[RoutePresentation] No header settings found in route data');
                }

                // *** ADDED: Set the overall loaded state and persistent ID ***
                if (route) {
                    console.log('[RoutePresentation] Setting currentLoadedState with fetched route data');
                    setCurrentLoadedState(route);
                    if (route.persistentId) {
                        console.log('[RoutePresentation] Setting currentLoadedPersistentId:', route.persistentId);
                        setCurrentLoadedPersistentId(route.persistentId);
                    } else {
                         console.warn('[RoutePresentation] persistentId missing from fetched route data');
                    }
                } else {
                     console.warn('[RoutePresentation] Fetched route data is null, cannot set currentLoadedState');
                }
                // *** END ADDED ***

                // Mark as initialized using the module-level flag
                isRoutePresentationInitialized = true;
                console.timeEnd('routeInitialization');
                console.log('[RoutePresentation] 🏁 ROUTE INITIALIZATION COMPLETED');
            };

            // Run initialization only if component is mounted
            if (isMountedRef.current) {
                initializeRoutes();
            } else {
                console.log('[RoutePresentation] ⚠️ Component unmounted before initialization could start');
            }
        // Simplify dependencies: only re-run if the main route object or the processed routes array changes
        }, [route, routes]);

        // Add additional logging for lineData
        // Only log count of lines being passed to avoid excessive logging
        // console.log('[RoutePresentation] Passing lineData to PresentationMapView:', {
        //     lineDataLength: lineData?.length || 0,
        //     firstLine: lineData?.length > 0 ? "Line data available" : 'No lines'
        // });

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
            // Render RouteContent unconditionally (it will handle empty routes internally)
             // Add a stable key based on persistentId if route exists
             route ? _jsx(RouteContent, { route: route }, route.persistentId) : _jsx(RouteContent, { route: null }),

            // Loading overlay
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

            // Error overlay (only show if not loading)
            !loading && (error || !route) && (
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
                        children: error || 'Route not found'
                    })
                })
            )
            // No need for the final else block, RouteContent is always rendered now
        ] })
    }) }));
};
