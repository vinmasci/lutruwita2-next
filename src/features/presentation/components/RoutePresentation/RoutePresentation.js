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
                setLoading(true);
                setError(null);
                const routeData = await publicRouteService.loadRoute(id);
                
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
                
                // The API now returns the route data directly
                setRoute(routeData);
            }
            catch (error) {
                setError('Failed to load route');
                console.error('[RoutePresentation] Error fetching route:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchRoute();
    }, [id]);

    // Just add required fields to server routes
    const routes = useMemo(() => {
        if (!route)
            return [];
        
        if (!route.routes || !Array.isArray(route.routes) || route.routes.length === 0) {
            console.error('[RoutePresentation] Invalid routes array:', route.routes);
            return [];
        }
        
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
        const [initialized, setInitialized] = useState(false);

        // Initialize routes once when processed data is available
        useEffect(() => {
            if (initialized || !routes.length)
                return;
            
            // Check if we're already initialized to prevent double initialization
            if (document.querySelector('[data-route-initialized="true"]')) {
                // console.log('[RoutePresentation] Skipping initialization - already initialized');
                setInitialized(true);
                return;
            }
            
            // Batch route initialization
            const initializeRoutes = () => {
                // console.log('[RoutePresentation] Starting route initialization');

                // Mark as initialized to prevent double initialization
                document.body.setAttribute('data-route-initialized', 'true');
                
                // Add all routes in a single batch
                routes.forEach((route) => {
                    addRoute(route);
                });
                // console.log('[RoutePresentation] Added all routes to RouteContext');

                // Set initial route once all routes are added
                setCurrentRoute(routes[0]);
                // console.log('[RoutePresentation] Set current route:', routes[0].routeId);

                // Load photos and POIs
                if (route.photos) {
                    // console.log('[RoutePresentation] Loading photos:', route.photos.length);
                    addPhoto(route.photos.map(deserializePhoto));
                } else {
                    // console.log('[RoutePresentation] No photos to load');
                }

                if (route.pois) {
                    // console.log('[RoutePresentation] Loading POIs:',
                    //     route.pois.draggable?.length || 0, 'draggable POIs,',
                    //     route.pois.places?.length || 0, 'place POIs');
                    loadPOIsFromRoute(route.pois);
                } else {
                    // console.log('[RoutePresentation] No POIs to load');
                }

                // Check for line data and load it directly
                if (route.lines) {
                    // console.log('[RoutePresentation] Found line data in route:', route.lines.length, 'lines');
                    // Removed detailed line data logging to improve performance in presentation mode
                    // console.log('[RoutePresentation] Provider structure: LineProvider → RouteProvider → RouteContent');
                    // console.log('[RoutePresentation] Loading lines directly into LineContext');
                    loadLinesFromRoute(route.lines);

                    // Store the line data in the parent component's state for direct rendering
                    setLineData(route.lines);
                    // console.log('[RoutePresentation] Stored line data for direct rendering:', route.lines.length, 'lines');

                    // console.log('[RoutePresentation] Lines loaded directly into LineContext');
                } else {
                    // console.log('[RoutePresentation] No line data found in route');
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
                    // console.log('[RoutePresentation] Setting currentLoadedState with fetched route data:', route);
                    setCurrentLoadedState(route);
                    if (route.persistentId) {
                        // console.log('[RoutePresentation] Setting currentLoadedPersistentId:', route.persistentId);
                        setCurrentLoadedPersistentId(route.persistentId);
                    } else {
                         console.warn('[RoutePresentation] persistentId missing from fetched route data');
                    }
                } else {
                     console.warn('[RoutePresentation] Fetched route data is null, cannot set currentLoadedState');
                }
                // *** END ADDED ***

                setInitialized(true);
                // console.log('[RoutePresentation] Route initialization completed');
            };
            initializeRoutes();
        }, [route, routes, initialized, addRoute, setCurrentRoute, updateHeaderSettings, loadPOIsFromRoute, loadLinesFromRoute, setCurrentLoadedState, setCurrentLoadedPersistentId]); // Added route, setCurrentLoadedState, setCurrentLoadedPersistentId to dependencies

        // Add additional logging for lineData
        // Only log count of lines being passed to avoid excessive logging
        // console.log('[RoutePresentation] Passing lineData to PresentationMapView:', {
        //     lineDataLength: lineData?.length || 0,
        //     firstLine: lineData?.length > 0 ? "Line data available" : 'No lines'
        // });

        return routes.length > 0 ? _jsx(PresentationMapView, { lineData: lineData }) : null;
    });

    // Set display name for debugging
    RouteContent.displayName = 'RouteContent';

    // Loading state
    if (loading) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", children: _jsx(CircularProgress, {}) }));
    }

    // Error state
    if (error || !route) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", children: _jsx(Alert, { severity: "error", sx: { maxWidth: 'sm' }, children: error || 'Route not found' }) }));
    }

    return (_jsx(LineProvider, { children: _jsx(RouteProvider, { children: _jsx(RouteContent, { route: route }) }) }));
};
