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
                setLoading(true);
                setError(null);
                
                const routeData = await publicRouteService.loadRoute(id);

                if (!routeData) {
                    setError('Route data is empty');
                    return;
                }

                if (!routeData.routes || !Array.isArray(routeData.routes)) {
                    setError('Invalid route data structure');
                    return;
                }

                // Only update state if the route ID has changed or route is null
                if (!route || route.persistentId !== routeData.persistentId) {
                     setRoute(routeData);
                }
            }
            catch (error) {
                setError('Failed to load route');
                console.error('[RoutePresentation] Error fetching route:', error);
            }
            finally {
                setLoading(false);
                isCurrentlyLoading = false; // Reset the global loading flag
            }
        };
        
        fetchRoute();
        
        // Cleanup function to reset loading state if component unmounts during fetch
        return () => {
            if (isCurrentlyLoading) {
                isCurrentlyLoading = false;
            }
        };
    }, [id]);

    // Just add required fields to server routes
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
                        
                        setCurrentLoadedState(route);
                        if (routeId) {
                            setCurrentLoadedPersistentId(routeId);
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
        }, [route, routes, routeId, addRoute, setCurrentRoute, updateHeaderSettings, setCurrentLoadedState, setCurrentLoadedPersistentId, addPhoto, loadPOIsFromRoute, loadLinesFromRoute]);

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
