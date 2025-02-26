import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service.js';
import { PresentationMapView } from '../PresentationMapView';
import { Box, CircularProgress, Alert } from '@mui/material';
import { RouteProvider, useRouteContext } from '../../../map/context/RouteContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
export const RoutePresentation = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchRoute = async () => {
            if (!id)
                return;
            try {
                setLoading(true);
                setError(null);
                console.log('[RoutePresentation] Fetching route with ID:', id);
                const routeData = await publicRouteService.loadRoute(id);
                console.log('[RoutePresentation] Fetched route data:', routeData);
                console.log('[RoutePresentation] Route data type:', typeof routeData);
                console.log('[RoutePresentation] Is null?', routeData === null);
                console.log('[RoutePresentation] Is undefined?', routeData === undefined);
                
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
                console.log('[RoutePresentation] Using direct route data object');
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
        console.log('[RoutePresentation] Using server routes:', route.name);
        console.log('[RoutePresentation] Route data structure:', {
            persistentId: route.persistentId,
            routeCount: route.routes?.length,
            hasRoutes: !!route.routes,
            isRoutesArray: Array.isArray(route.routes)
        });
        
        if (!route.routes || !Array.isArray(route.routes) || route.routes.length === 0) {
            console.error('[RoutePresentation] Invalid routes array:', route.routes);
            return [];
        }
        
        return route.routes.map(routeData => {
            if (!routeData.routeId) {
                console.error('[RoutePresentation] Route data missing routeId:', routeData);
                return null;
            }
            
            console.log('[RoutePresentation] Processing route:', routeData.routeId);
            
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
        const { addRoute, setCurrentRoute } = useRouteContext();
        const { addPhoto } = usePhotoContext();
        const { loadPOIsFromRoute } = usePOIContext();
        const [initialized, setInitialized] = useState(false);
        // Initialize routes once when processed data is available
        useEffect(() => {
            if (initialized || !routes.length)
                return;
            // Batch route initialization
            const initializeRoutes = () => {
                // Add all routes in a single batch
                routes.forEach((route) => {
                    console.log('[RoutePresentation] Adding route to context:', route.routeId);
                    addRoute(route);
                });
                // Set initial route once all routes are added
                console.log('[RoutePresentation] Setting initial route:', routes[0].routeId);
                // Set initial route
                setCurrentRoute(routes[0]);
                // Load photos and POIs
                if (route.photos) {
                    addPhoto(route.photos.map(deserializePhoto));
                }
                if (route.pois) {
                    loadPOIsFromRoute(route.pois);
                }
                setInitialized(true);
            };
            initializeRoutes();
        }, [routes, initialized, addRoute, setCurrentRoute]);
        return routes.length > 0 ? _jsx(PresentationMapView, {}) : null;
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
    return (_jsx(RouteProvider, { children: _jsx(RouteContent, { route: route }) }));
};
