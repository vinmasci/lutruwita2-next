import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
import { useRouteService } from "../services/routeService";
import { useMapContext } from "./MapContext";
import { usePOIContext } from "../../poi/context/POIContext";
import { usePhotoContext } from "../../photo/context/PhotoContext";
import { usePlaceContext } from "../../place/context/PlaceContext";
import { normalizeRoute } from "../utils/routeUtils";
import { AuthAlert } from "@/features/auth/components/AuthAlert/AuthAlert";
// Type guard to check if a route is a LoadedRoute
const isLoadedRoute = (route) => {
    return route._type === 'loaded';
};
const RouteContext = createContext(null);
export const RouteProvider = ({ children, }) => {
    // Local route state
    const [routes, setRoutes] = useState([]);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [showAuthAlert, setShowAuthAlert] = useState(false);
    const focusRoute = useCallback((routeId) => {
        setRoutes(prev => prev.map(route => ({
            ...route,
            isFocused: route.routeId === routeId
        })));
    }, []);
    const unfocusRoute = useCallback((routeId) => {
        setRoutes(prev => prev.map(route => ({
            ...route,
            isFocused: route.routeId === routeId ? false : route.isFocused
        })));
    }, []);
    const handleAuthError = useCallback(() => {
        setShowAuthAlert(true);
    }, []);
    const setCurrentRouteWithDebug = useCallback((route) => {
        console.debug('[RouteContext] Setting current route:', {
            from: currentRoute ? {
                routeId: currentRoute.routeId,
                type: currentRoute._type,
                hasLoadedState: isLoadedRoute(currentRoute) && !!currentRoute._loadedState,
                hasGeojson: !!currentRoute.geojson,
                loadedStateId: isLoadedRoute(currentRoute) ? currentRoute._loadedState?.persistentId : undefined
            } : 'none',
            to: route ? {
                routeId: route.routeId,
                type: route._type,
                hasLoadedState: isLoadedRoute(route) && !!route._loadedState,
                hasGeojson: !!route.geojson,
                loadedStateId: isLoadedRoute(route) ? route._loadedState?.persistentId : undefined
            } : 'none'
        });
        setCurrentRoute(route);
    }, [currentRoute]);
    // Saved routes state
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadedMap, setIsLoadedMap] = useState(false);
    const [currentLoadedState, setCurrentLoadedState] = useState(null);
    const [currentLoadedPersistentId, setCurrentLoadedPersistentId] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Update route properties
    const updateRoute = useCallback((routeId, updates) => {
        setRoutes(prev => prev.map(route => {
            if (route.routeId === routeId) {
                return {
                    ...route,
                    ...updates
                };
            }
            return route;
        }));
        setHasUnsavedChanges(true);
    }, []);
    // Context hooks
    const routeService = useRouteService();
    const { map } = useMapContext();
    const { pois, getPOIsForRoute, loadPOIsFromRoute } = usePOIContext();
    const { photos, addPhoto } = usePhotoContext();
    const { places, updatePlace } = usePlaceContext();
    const addRoute = useCallback((route) => {
        console.debug('[RouteContext] Adding route:', {
            routeId: route.routeId,
            type: route._type,
            hasLoadedState: !!currentLoadedState,
            existingRoutes: routes.length,
            hasGeojson: !!route.geojson
        });
        setRoutes((prev) => {
            // Process the new route
            const processedRoute = currentLoadedState ? {
                ...route,
                _type: 'loaded',
                _loadedState: currentLoadedState
            } : {
                ...route,
                _type: 'fresh'
            };
            // Keep all existing routes that don't have the same ID
            const existingRoutes = prev.filter(r => r.routeId !== route.routeId);
            // Add the new route
            const updatedRoutes = [...existingRoutes, processedRoute];
            console.debug('[RouteContext] Updated routes:', {
                previousCount: prev.length,
                newCount: updatedRoutes.length,
                routeIds: updatedRoutes.map(r => r.routeId)
            });
            return updatedRoutes;
        });
        setHasUnsavedChanges(true);
    }, [currentLoadedState]);
    const deleteRoute = useCallback((routeId) => {
        console.debug('[RouteContext][DELETE] Starting deletion process for route:', routeId);
        // Clean up map layers first if we have access to the map
        if (map) {
            console.debug('[RouteContext][DELETE] Cleaning up map layers for route:', routeId);
            const cleanupLayers = (routeId) => {
                const style = map.getStyle();
                if (!style)
                    return;
                // Find and remove all layers for this route
                const routeLayers = style.layers
                    ?.filter(layer => layer.id.startsWith(routeId))
                    .map(layer => layer.id) || [];
                routeLayers.forEach(layerId => {
                    if (map.getLayer(layerId)) {
                        try {
                            console.debug('[RouteContext][DELETE] Removing layer:', layerId);
                            map.removeLayer(layerId);
                        }
                        catch (error) {
                            console.error('[RouteContext][DELETE] Error removing layer:', layerId, error);
                        }
                    }
                });
                // Remove associated sources
                const routeSources = [`${routeId}-main`];
                routeSources.forEach(sourceId => {
                    if (map.getSource(sourceId)) {
                        try {
                            console.debug('[RouteContext][DELETE] Removing source:', sourceId);
                            map.removeSource(sourceId);
                        }
                        catch (error) {
                            console.error('[RouteContext][DELETE] Error removing source:', sourceId, error);
                        }
                    }
                });
            };
            cleanupLayers(routeId);
        }
        setRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
        setCurrentRoute((prev) => prev?.routeId === routeId ? null : prev);
        setHasUnsavedChanges(true);
    }, [map]);
    // Clear current work
    const clearCurrentWork = useCallback(() => {
        console.debug('[RouteContext] Clearing current work');
        // Clean up map layers for all routes first
        if (map) {
            routes.forEach(route => {
                const routeId = route.routeId || route.id;
                console.debug('[RouteContext] Cleaning up map layers for route:', routeId);
                const style = map.getStyle();
                if (!style)
                    return;
                // Find and remove all layers for this route
                const routeLayers = style.layers
                    ?.filter(layer => layer.id.startsWith(routeId))
                    .map(layer => layer.id) || [];
                routeLayers.forEach(layerId => {
                    if (map.getLayer(layerId)) {
                        map.removeLayer(layerId);
                    }
                });
                // Remove associated sources
                const routeSources = [`${routeId}-main`];
                routeSources.forEach(sourceId => {
                    if (map.getSource(sourceId)) {
                        map.removeSource(sourceId);
                    }
                });
            });
        }
        setRoutes([]);
        setCurrentRoute(null);
        setCurrentLoadedState(null);
        setCurrentLoadedPersistentId(null);
        setHasUnsavedChanges(false);
        setIsLoadedMap(false);
    }, [map, routes]);
    // Save current state to backend
    const roundCoordinate = (value) => {
        return Number(value.toFixed(5));
    };
    const roundRouteCoordinates = (route) => {
        const roundedRoute = { ...route };
        if (roundedRoute.unpavedSections) {
            roundedRoute.unpavedSections = roundedRoute.unpavedSections.map(section => ({
                ...section,
                coordinates: section.coordinates.map(coord => [roundCoordinate(coord[0]), roundCoordinate(coord[1])])
            }));
        }
        return roundedRoute;
    };
    const saveCurrentState = useCallback(async (name, type, isPublic) => {
        try {
            console.log('[RouteContext] Starting save with:', { name, type, isPublic });
            const pois = getPOIsForRoute();
            if (!routes.length) {
                throw new Error('No route data to save');
            }
            setIsSaving(true);
            const routeState = {
                id: "", // Will be set by backend
                persistentId: currentLoadedPersistentId || "", // Will be set by backend for new routes
                name,
                type,
                isPublic,
                mapState: map ? {
                    zoom: map.getZoom(),
                    center: [map.getCenter().lng, map.getCenter().lat],
                    bearing: map.getBearing(),
                    pitch: map.getPitch(),
                    padding: { top: 0, bottom: 0, left: 0, right: 0 },
                    bbox: [-180, -90, 180, 90],
                    style: map.getStyle()?.name || 'default'
                } : {
                    zoom: 0,
                    center: [0, 0],
                    bearing: 0,
                    pitch: 0,
                    padding: { top: 0, bottom: 0, left: 0, right: 0 },
                    bbox: [-180, -90, 180, 90],
                    style: 'default'
                },
                routes: routes.map(roundRouteCoordinates),
                photos,
                pois,
            };
            let result;
            if (currentLoadedPersistentId) {
                // This is an update to an existing route
                result = await routeService.saveRoute(routeState);
                setCurrentLoadedState(routeState);
            }
            else {
                // This is a new route
                result = await routeService.saveRoute(routeState);
                setCurrentLoadedPersistentId(result.persistentId);
            }
            // Update the existing routes array in place if this was an update
            if (currentLoadedPersistentId) {
                setRoutes(prevRoutes => prevRoutes.map(route => {
                    if (isLoadedRoute(route) && route._loadedState?.persistentId === currentLoadedPersistentId) {
                        return {
                            ...route,
                            _type: 'loaded',
                            _loadedState: {
                                ...currentLoadedState,
                                ...routeState,
                                persistentId: currentLoadedPersistentId
                            }
                        };
                    }
                    return route;
                }));
            }
            setHasUnsavedChanges(false);
            await listRoutes();
        }
        catch (error) {
            console.error('[RouteContext] Save failed:', error);
            if (error instanceof Error && error.message === 'Authentication required') {
                handleAuthError();
            }
            throw new Error(error instanceof Error ? error.message : 'Failed to save route');
        }
        finally {
            setIsSaving(false);
        }
    }, [map, routes, photos, getPOIsForRoute, places, routeService, handleAuthError]);
    // Load a saved route
    const loadRoute = useCallback(async (persistentId) => {
        try {
            if (hasUnsavedChanges) {
                console.warn('Unsaved changes will be lost');
            }
            setIsLoading(true);
            clearCurrentWork();
            console.debug('[RouteContext] Starting to load route:', persistentId);
            const { route } = await routeService.loadRoute(persistentId);
            console.debug('[RouteContext] Route loaded from DB:', {
                persistentId: route.persistentId,
                name: route.name,
                routeCount: route.routes.length,
                hasGeojson: route.routes[0]?.geojson != null
            });
            setIsLoadedMap(true);
            setCurrentLoadedState(route);
            setCurrentLoadedPersistentId(persistentId);
            const loadedRoutes = route.routes.map(r => ({
                ...r,
                _type: 'loaded',
                _loadedState: route
            }));
            setRoutes(loadedRoutes);
            if (route.routes[0]) {
                const normalizedRoute = normalizeRoute(route);
                setCurrentRouteWithDebug(normalizedRoute);
            }
            else {
                setCurrentRouteWithDebug(null);
            }
            if (map && route.mapState) {
                map.setZoom(route.mapState.zoom);
                map.setCenter(route.mapState.center);
                map.setBearing(route.mapState.bearing);
                map.setPitch(route.mapState.pitch);
                if (route.mapState.style) {
                    map.setStyle(route.mapState.style);
                }
            }
            if (route.photos) {
                photos.forEach(photo => URL.revokeObjectURL(photo.url));
                addPhoto(route.photos);
            }
            if (route.pois) {
                loadPOIsFromRoute(route.pois);
            }
            if (route.places) {
                for (const place of route.places) {
                    await updatePlace(place.id, place);
                }
            }
        }
        catch (error) {
            console.error("Failed to load route:", error);
            if (error instanceof Error && error.message === 'Authentication required') {
                handleAuthError();
            }
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [routeService, map, addPhoto, loadPOIsFromRoute, updatePlace, setCurrentRouteWithDebug, handleAuthError]);
    // List saved routes
    const listRoutes = useCallback(async (filters) => {
        try {
            const { routes } = await routeService.listRoutes(filters);
            setSavedRoutes(routes);
        }
        catch (error) {
            console.error("Failed to list routes:", error);
            if (error instanceof Error && error.message === 'Authentication required') {
                handleAuthError();
            }
            throw error;
        }
    }, [routeService, handleAuthError]);
    // Delete a saved route
    const deleteSavedRoute = useCallback(async (persistentId) => {
        try {
            await routeService.deleteRoute(persistentId);
            setSavedRoutes((prev) => prev.filter((route) => route.persistentId !== persistentId));
        }
        catch (error) {
            console.error("Failed to delete route:", error);
            if (error instanceof Error && error.message === 'Authentication required') {
                handleAuthError();
            }
            throw error;
        }
    }, [routeService, handleAuthError]);
    return (_jsxs(_Fragment, { children: [_jsx(AuthAlert, { show: showAuthAlert, onClose: () => setShowAuthAlert(false) }), _jsx(RouteContext.Provider, { value: {
                    // Local route state
                    routes,
                    currentRoute,
                    addRoute,
                    deleteRoute,
                    setCurrentRoute: setCurrentRouteWithDebug,
                    focusRoute,
                    unfocusRoute,
                    updateRoute,
                    // Saved routes state
                    savedRoutes,
                    isSaving,
                    isLoading,
                    isLoadedMap,
                    currentLoadedState,
                    currentLoadedPersistentId,
                    hasUnsavedChanges,
                    // Save/Load operations
                    saveCurrentState,
                    loadRoute,
                    listRoutes,
                    deleteSavedRoute,
                    clearCurrentWork,
                }, children: children })] }));
};
export const useRouteContext = () => {
    const context = useContext(RouteContext);
    if (!context) {
        throw new Error('useRouteContext must be used within a RouteProvider');
    }
    return context;
};
