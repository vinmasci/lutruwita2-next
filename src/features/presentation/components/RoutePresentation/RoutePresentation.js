import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
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
                const routeData = await publicRouteService.loadRoute(id);
                console.log('Fetched route data:', routeData);
                setRoute(routeData.route);
            }
            catch (error) {
                setError('Failed to load route');
                console.error('Error fetching route:', error);
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
        return route.routes.map(routeData => {
            if (!routeData.routeId) {
                console.error('Route data missing routeId:', routeData);
                return null;
            }
            return {
                ...routeData,
                _type: 'loaded',
                _loadedState: route,
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
