import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouteService } from "../services/routeService";
import { useMapContext } from "./MapContext";
import { queueMapOperation } from "../utils/mapOperationsQueue";
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from "../../poi/context/POIContext";
import { usePhotoContext } from "../../photo/context/PhotoContext";
import { usePhotoService } from "../../photo/services/photoService";
import { usePlaceContext } from "../../place/context/PlaceContext";
import { normalizeRoute } from "../utils/routeUtils";
import { getRouteLocationData } from "../../../utils/geocoding";
import { getRouteDistance, getUnpavedPercentage, getElevationGain } from "../../gpx/utils/routeUtils";
import { AuthAlert } from "@/features/auth/components/AuthAlert/AuthAlert";
// Type guard to check if a route is a LoadedRoute
const isLoadedRoute = (route) => {
    return route._type === 'loaded';
};

// Function to calculate route summary data
const calculateRouteSummary = (routes) => {
    if (!routes || routes.length === 0) return null;

    // Initialize summary data
    let totalDistance = 0;
    let totalAscent = 0;
    let totalUnpavedDistance = 0;
    let totalRouteDistance = 0;
    let isLoop = true;
    const countries = new Set(['Australia']); // Default country
    const states = new Set();
    const lgas = new Set();

    // Variables to store first and last points for overall loop check
    let firstRouteStart = null;
    let lastRouteEnd = null;

    // Calculate totals from all routes
    routes.forEach((route, index) => {
        // Distance
        const distance = getRouteDistance(route);
        totalDistance += distance;
        totalRouteDistance += distance;

        // Elevation
        const ascent = getElevationGain(route);
        totalAscent += ascent;

        // Unpaved sections
        const unpavedPercentage = getUnpavedPercentage(route);
        totalUnpavedDistance += (distance * unpavedPercentage / 100);

        // Get coordinates for loop check
        if (route.geojson?.features?.[0]?.geometry?.coordinates) {
            const coordinates = route.geojson.features[0].geometry.coordinates;
            if (coordinates.length > 1) {
                // Store first route's start point
                if (index === 0) {
                    firstRouteStart = coordinates[0];
                }
                
                // Store last route's end point
                if (index === routes.length - 1) {
                    lastRouteEnd = coordinates[coordinates.length - 1];
                }
                
                // Individual route loop check
                const start = coordinates[0];
                const end = coordinates[coordinates.length - 1];
                
                // Calculate distance between start and end points
                const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
                const dy = end[1] - start[1];
                const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
                
                // Check if this individual route is a loop (using 5km threshold)
                const isRouteLoop = distance < 5000;
                
                // For a single route, set isLoop based on this route's loop status
                if (routes.length === 1) {
                    isLoop = isRouteLoop;
                } 
                // For multiple routes, only set isLoop to false if this route isn't a loop
                // (we'll check multi-route loops later)
                else if (!isRouteLoop) {
                    isLoop = false;
                }
            }
        }

        // Location data
        if (route.metadata) {
            if (route.metadata.country) countries.add(route.metadata.country);
            if (route.metadata.state) states.add(route.metadata.state);
            if (route.metadata.lga) lgas.add(route.metadata.lga);
        }
    });

    // Check if the entire collection forms a loop (first route start connects to last route end)
    if (!isLoop && firstRouteStart && lastRouteEnd && routes.length > 1) {
        const dx = (lastRouteEnd[0] - firstRouteStart[0]) * Math.cos((firstRouteStart[1] + lastRouteEnd[1]) / 2 * Math.PI / 180);
        const dy = lastRouteEnd[1] - firstRouteStart[1];
        const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
        
        // If the distance between first route start and last route end is small enough (within 5km), it's a loop
        if (distance < 5000) {
            isLoop = true;
        }
    }

    // Calculate unpaved percentage
    const unpavedPercentage = totalRouteDistance > 0 
        ? Math.round((totalUnpavedDistance / totalRouteDistance) * 100) 
        : 0;

    return {
        totalDistance: Math.round(totalDistance / 1000 * 10) / 10, // Convert to km with 1 decimal
        totalAscent: Math.round(totalAscent),
        unpavedPercentage,
        isLoop,
        countries: Array.from(countries),
        states: Array.from(states),
        lgas: Array.from(lgas)
    };
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
        setCurrentRoute(route);
    }, []);
    // Saved routes state
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadedMap, setIsLoadedMap] = useState(false);
    const [currentLoadedState, setCurrentLoadedState] = useState(null);
    const [currentLoadedPersistentId, setCurrentLoadedPersistentId] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [changedSections, setChangedSections] = useState({});
    const [pendingRouteBounds, setPendingRouteBounds] = useState(null);
    const [headerSettings, setHeaderSettings] = useState({
        color: '#000000',
        logoUrl: null,
        username: '',
        logoFile: null,
        logoData: null,
        logoBlob: null
    });

    const reorderRoutes = useCallback((oldIndex, newIndex) => {
        setRoutes(prev => {
            const newRoutes = [...prev];
            const [movedRoute] = newRoutes.splice(oldIndex, 1);
            newRoutes.splice(newIndex, 0, movedRoute);
            
            // Update order field for all routes
            return newRoutes.map((route, i) => ({
                ...route,
                order: i
            }));
        });
        setHasUnsavedChanges(true);
        setChangedSections(prev => ({...prev, routes: true}));
    }, []);

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
        
        // Track specific changes
        const changedSectionUpdates = {};
        
        // Check if description was updated
        if (updates.description) {
            changedSectionUpdates.description = true;
        } else {
            // Only mark routes as changed if it's not just a description update
            changedSectionUpdates.routes = true;
        }
        
        setChangedSections(prev => ({...prev, ...changedSectionUpdates}));
    }, []);
    // Context hooks
    const routeService = useRouteService();
    const { map } = useMapContext();
    const { pois, getPOIsForRoute, loadPOIsFromRoute } = usePOIContext();
    const photoContext = usePhotoContext();
    const { photos, addPhoto } = photoContext;
    const photoService = usePhotoService();
    const { places, updatePlace } = usePlaceContext();
    
    // Helper function to upload photos to Cloudinary
    const uploadPhotosToCloudinary = async () => {
      const localPhotos = photos.filter(p => p.isLocal === true);
      if (localPhotos.length === 0) return photos;
      
      const updatedPhotos = [...photos];
      
      for (const photo of localPhotos) {
        if (!photo._blobs?.large) continue;
        
        try {
          // Create a File object from the blob
          const fileObject = new File([photo._blobs.large], photo.name, { type: 'image/jpeg' });
          
          // Use the photoService directly to upload
          const result = await photoService.uploadPhoto(fileObject);
          
          // Update this photo in the array
          const index = updatedPhotos.findIndex(p => p.id === photo.id);
          if (index !== -1) {
            updatedPhotos[index] = {
              ...photo,
              url: result.url,
              tinyThumbnailUrl: result.tinyThumbnailUrl,
              thumbnailUrl: result.thumbnailUrl,
              mediumUrl: result.mediumUrl,
              largeUrl: result.largeUrl,
              publicId: result.publicId,
              isLocal: false,
              _blobs: undefined
            };
          }
        } catch (error) {
          console.error(`Failed to upload photo ${photo.id}:`, error);
        }
      }
      
      return updatedPhotos;
    };
    
    // Helper function to upload logo to Cloudinary
    const uploadLogoToCloudinary = async () => {
      // Check if we have a logo file to upload
      if (!headerSettings.logoFile && !headerSettings.logoData) {
        return headerSettings.logoUrl;
      }
      
      try {
        console.log('[RouteContext] Uploading logo to Cloudinary');
        
        // Use axios to upload directly to Cloudinary
        const formData = new FormData();
        
        // Use the file from logoData if available, otherwise use logoFile
        const fileToUpload = headerSettings.logoData?._blobs?.original || 
                            headerSettings.logoData?.file || 
                            headerSettings.logoFile;
        
        if (!fileToUpload) {
          console.warn('[RouteContext] No logo file found to upload');
          return headerSettings.logoUrl;
        }
        
        // Prepare the form data
        formData.append('file', fileToUpload);
        formData.append('upload_preset', 'map_logos'); // Make sure this preset exists in Cloudinary
        
        // Upload directly to Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        if (!response.ok) {
          throw new Error(`Upload failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        const logoUrl = data.secure_url;
        
        console.log('[RouteContext] Logo uploaded successfully:', logoUrl);
        return logoUrl;
      } catch (error) {
        console.error('[RouteContext] Error uploading logo to Cloudinary:', error);
        // Return the existing URL if upload fails
        return headerSettings.logoUrl;
      }
    };
    // Function to update route metadata
    const updateRouteMetadata = useCallback(async (route) => {
        if (!route) return route;
        
        try {
            // Use the Nominatim API to get location data
            const locationData = await getRouteLocationData(route);
            
            // Create metadata object if it doesn't exist
            if (!route.metadata) route.metadata = {};
            
            // Update metadata with location information
            route.metadata.country = locationData.country || route.metadata.country || 'Australia';
            route.metadata.state = locationData.state || route.metadata.state || '';
            route.metadata.lga = locationData.lga || route.metadata.lga || '';
            
            console.log('[RouteContext] Updated route metadata:', route.metadata);
            
            // Update the route in the context
            updateRoute(route.routeId || route.id, { metadata: route.metadata });
            
            return route;
        } catch (error) {
            console.error('[RouteContext] Error updating route with location data:', error);
            return route;
        }
    }, []);

    const addRoute = useCallback((route) => {
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
            
            // Update route metadata in the background
            updateRouteMetadata(processedRoute).catch(error => {
                console.error('[RouteContext] Error in route metadata update:', error);
            });
            
            return updatedRoutes;
        });
        setHasUnsavedChanges(true);
        setChangedSections(prev => ({...prev, routes: true}));
    }, [currentLoadedState, updateRouteMetadata]);
    const deleteRoute = useCallback((routeId) => {
        // Clean up map layers first if we have access to the map
        if (map) {
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
        setChangedSections(prev => ({...prev, routes: true}));
    }, [map]);
    // Clear current work
    const clearCurrentWork = useCallback(() => {
        console.debug('[RouteContext] Clearing current work');
        // Clean up map layers for all routes first
        if (map) {
            routes.forEach(route => {
                const routeId = route.routeId || route.id;
                console.debug('[RouteContext] Cleaning up map layers for route:', routeId);
                
                try {
                    const style = map.getStyle();
                    if (!style) {
                        console.warn('[RouteContext] Map style not available');
                        return;
                    }
                    
                    // Find all layers that might be related to this route
                    const layerPatterns = [
                        `${routeId}-main-line`,
                        `${routeId}-main-border`,
                        `${routeId}-hover`,
                        `unpaved-section-layer-${routeId}`,
                        `${routeId}-surface`,
                        `${routeId}-unpaved-line`
                    ];
                    
                    // Find all layers that match our patterns or start with the routeId
                    const allLayers = style.layers
                        .map(layer => layer.id)
                        .filter(id => id.includes(routeId) || 
                                     layerPatterns.some(pattern => id.includes(pattern)));
                    
                    console.debug('[RouteContext] Found layers to remove:', allLayers);
                    
                    // Remove all layers first
                    allLayers.forEach(layerId => {
                        if (map.getLayer(layerId)) {
                            try {
                                console.debug('[RouteContext] Removing layer:', layerId);
                                map.removeLayer(layerId);
                            } catch (error) {
                                console.error('[RouteContext] Error removing layer:', layerId, error);
                            }
                        }
                    });
                    
                    // Find all sources that might be related to this route
                    const sourcePatterns = [
                        `${routeId}-main`,
                        `unpaved-section-${routeId}`,
                        `${routeId}-unpaved`
                    ];
                    
                    // Get all source IDs from the style
                    const allSources = Object.keys(style.sources || {})
                        .filter(id => sourcePatterns.some(pattern => id.includes(pattern)));
                    
                    console.debug('[RouteContext] Found sources to remove:', allSources);
                    
                    // Remove all sources after a brief delay
                    setTimeout(() => {
                        allSources.forEach(sourceId => {
                            if (map.getSource(sourceId)) {
                                try {
                                    console.debug('[RouteContext] Removing source:', sourceId);
                                    map.removeSource(sourceId);
                                } catch (error) {
                                    console.error('[RouteContext] Error removing source:', sourceId, error);
                                }
                            }
                        });
                    }, 100);
                } catch (error) {
                    console.error('[RouteContext] Error cleaning up map layers:', error);
                }
            });
            
            // Force a map redraw
            setTimeout(() => {
                try {
                    map.resize();
                } catch (error) {
                    console.error('[RouteContext] Error resizing map:', error);
                }
            }, 200);
        }
        
        // Clear state
        setRoutes([]);
        setCurrentRoute(null);
        setCurrentLoadedState(null);
        setCurrentLoadedPersistentId(null);
        setHasUnsavedChanges(false);
        setIsLoadedMap(false);
        setHeaderSettings({
            color: '#000000',
            logoUrl: null,
            username: '',
            logoFile: null,
            logoData: null,
            logoBlob: null
        });
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
            
            // Upload any local photos to Cloudinary before saving
            console.log('[RouteContext] Checking for local photos to upload...');
            let updatedPhotos = photos;
            let hasPhotoChanges = changedSections.photos || false;
            
            try {
                // Check if there are any local photos that need to be uploaded
                const localPhotos = photos.filter(p => p.isLocal === true);
                if (localPhotos.length > 0) {
                    console.log(`[RouteContext] Found ${localPhotos.length} local photos to upload`);
                    // Upload local photos to Cloudinary
                    updatedPhotos = await uploadPhotosToCloudinary();
                    hasPhotoChanges = true;
                } else {
                    console.log('[RouteContext] No local photos to upload');
                }
            } catch (photoError) {
                console.error('[RouteContext] Error uploading photos:', photoError);
                // Continue with save even if photo upload fails
            }
            
            // Upload logo to Cloudinary if present
            let updatedHeaderSettings = { ...headerSettings };
            let hasHeaderChanges = changedSections.headerSettings || false;
            
            try {
                if (headerSettings.logoFile || headerSettings.logoData) {
                    console.log('[RouteContext] Uploading logo to Cloudinary');
                    const logoUrl = await uploadLogoToCloudinary();
                    updatedHeaderSettings = {
                        ...headerSettings,
                        logoUrl: logoUrl,
                        logoFile: null, // Remove the file object after upload
                        logoData: null  // Remove the logo data object after upload
                    };
                    console.log('[RouteContext] Logo uploaded successfully:', logoUrl);
                    hasHeaderChanges = true;
                }
            } catch (logoError) {
                console.error('[RouteContext] Error uploading logo:', logoError);
                // Continue with save even if logo upload fails
            }
            
            // Prepare the base route state with required fields
            const baseRouteState = {
                id: "", // Will be set by backend
                persistentId: currentLoadedPersistentId || "", // Will be set by backend for new routes
                name,
                type,
                isPublic
            };
            
            // Create a partial update with only changed sections
            const partialUpdate = { ...baseRouteState };
            
            // Calculate route summary for metadata
            const routeSummary = calculateRouteSummary(routes);
            console.log('[RouteContext] Calculated route summary for save:', routeSummary);
            partialUpdate.routeSummary = routeSummary;
            
            // Add map state if it's changed or this is a new route
            if (changedSections.mapState || !currentLoadedPersistentId) {
                partialUpdate.mapState = map ? {
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
                };
            }
            
            // Add routes if they've changed or this is a new route
            if (changedSections.routes || !currentLoadedPersistentId) {
                partialUpdate.routes = routes.map(roundRouteCoordinates);
            }
            
            // Add description if it's changed specifically
            if (changedSections.description && currentLoadedPersistentId) {
                // Find the current route with description
                const routeWithDescription = routes.find(r => r.description);
                if (routeWithDescription) {
                    partialUpdate.description = routeWithDescription.description;
                    console.log('[RouteContext] Adding description to partial update');
                }
            }
            
            // Add photos if they've changed or this is a new route
            if (hasPhotoChanges || !currentLoadedPersistentId) {
                partialUpdate.photos = updatedPhotos;
            }
            
            // Add POIs if they've changed or this is a new route
            if (changedSections.pois || !currentLoadedPersistentId) {
                partialUpdate.pois = pois;
            }
            
            // Add header settings if they've changed or this is a new route
            if (hasHeaderChanges || !currentLoadedPersistentId) {
                partialUpdate.headerSettings = updatedHeaderSettings;
            }
            
            // For a new route, we need to include everything
            if (!currentLoadedPersistentId) {
                console.log('[RouteContext] New route - sending complete data');
                // This is a new route, so we need to send everything
                partialUpdate.routes = routes.map(roundRouteCoordinates);
                partialUpdate.photos = updatedPhotos;
                partialUpdate.pois = pois;
                partialUpdate.headerSettings = updatedHeaderSettings;
            } else {
                console.log('[RouteContext] Existing route - sending only changed sections:', 
                    Object.keys(partialUpdate).filter(k => k !== 'id' && k !== 'persistentId' && k !== 'name' && k !== 'type' && k !== 'isPublic'));
            }
            
            let result;
            if (currentLoadedPersistentId) {
                // This is an update to an existing route
                result = await routeService.saveRoute(partialUpdate);
                
                // Update the current loaded state with the changes
                const updatedState = { ...currentLoadedState, ...partialUpdate };
                setCurrentLoadedState(updatedState);
            }
            else {
                // This is a new route
                result = await routeService.saveRoute(partialUpdate);
                setCurrentLoadedPersistentId(result.persistentId);
                
                // For a new route, the complete state is what we just saved
                setCurrentLoadedState(partialUpdate);
            }
            // Update the existing routes array in place if this was an update
            if (currentLoadedPersistentId) {
                setRoutes(prevRoutes => prevRoutes.map(route => {
                    if (isLoadedRoute(route) && route._loadedState?.persistentId === currentLoadedPersistentId) {
                        const updatedLoadedState = { ...route._loadedState };
                        
                        // Update only the changed parts of _loadedState
                        if (partialUpdate.mapState) updatedLoadedState.mapState = partialUpdate.mapState;
                        if (partialUpdate.routes) updatedLoadedState.routes = partialUpdate.routes;
                        if (partialUpdate.photos) updatedLoadedState.photos = partialUpdate.photos;
                        if (partialUpdate.pois) updatedLoadedState.pois = partialUpdate.pois;
                        if (partialUpdate.headerSettings) updatedLoadedState.headerSettings = partialUpdate.headerSettings;
                        
                        return {
                            ...route,
                            _type: 'loaded',
                            _loadedState: {
                                ...updatedLoadedState,
                                persistentId: currentLoadedPersistentId
                            }
                        };
                    }
                    return route;
                }));
            }
            
            // Update header settings state with the Cloudinary URL
            if (headerSettings.logoFile || headerSettings.logoData) {
                setHeaderSettings(updatedHeaderSettings);
            }
            
            // Reset changed sections tracking
            setChangedSections({});
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
            // Ensure we're setting the persistentId from the route object if available, otherwise use the parameter
            setCurrentLoadedPersistentId(route.persistentId || persistentId);
            
            // Log the persistentId for debugging
            console.log('[RouteContext] Setting currentLoadedPersistentId:', route.persistentId || persistentId);
            const loadedRoutes = route.routes.map(r => ({
                ...r,
                _type: 'loaded',
                persistentId: route.persistentId, // Ensure persistentId is set on each route
                _loadedState: {
                    ...route,
                    persistentId: route.persistentId || persistentId // Ensure persistentId is set in _loadedState
                }
            }));
            
            console.log('[RouteContext] Created loaded routes with persistentId:', route.persistentId || persistentId);
            setRoutes(loadedRoutes);
            if (route.routes[0]) {
                const normalizedRoute = normalizeRoute(route);
                setCurrentRouteWithDebug(normalizedRoute);
            }
            else {
                setCurrentRouteWithDebug(null);
            }
            
            // Update route metadata for all loaded routes
            loadedRoutes.forEach(loadedRoute => {
                updateRouteMetadata(loadedRoute).catch(error => {
                    console.error('[RouteContext] Error in route metadata update:', error);
                });
            });
                        // Instead of immediately trying to position the map, store the route bounds for later use
            console.log('[RouteContext] Preparing route bounds for deferred positioning');
            
            try {
                // Find the middle route to position the map
                if (route.routes && route.routes.length > 0) {
                    console.log('[RouteContext] Finding middle route for positioning');
                    
                    // Get the number of routes and find the middle one
                    const routeCount = route.routes.length;
                    console.log(`[RouteContext] Found ${routeCount} routes`);
                    
                    // Log all routes for debugging
                    route.routes.forEach((r, idx) => {
                        console.log(`[RouteContext] Route ${idx}: id=${r.routeId || r.id}, name=${r.name || 'unnamed'}, hasGeojson=${!!r.geojson}`);
                    });
                    
                    const middleRouteIndex = Math.floor(routeCount / 2);
                    const middleRoute = route.routes[middleRouteIndex];
                    
                    console.log(`[RouteContext] Using middle route (index ${middleRouteIndex}): ${middleRoute.name || 'unnamed'}`);
                    
                    // Store bounds information for later use
                    if (middleRoute.geojson?.features?.[0]?.geometry?.coordinates?.length > 0) {
                        const coordinates = middleRoute.geojson.features[0].geometry.coordinates;
                        console.log(`[RouteContext] Found ${coordinates.length} coordinates in route`);
                        
                        // Store the coordinates and other necessary information
                        setPendingRouteBounds({
                            type: 'bounds',
                            coordinates: coordinates,
                            mapStyle: route.mapState?.style,
                            persistentId: route.persistentId || persistentId
                        });
                        
                        console.log('[RouteContext] Stored route bounds for deferred positioning:', {
                            coordinateCount: coordinates.length,
                            persistentId: route.persistentId || persistentId
                        });
                    } 
                    // Fallback to first point if we can't fit bounds
                    else if (middleRoute.geojson?.features?.[0]?.geometry?.coordinates?.[0]) {
                        const firstPoint = middleRoute.geojson.features[0].geometry.coordinates[0];
                        
                        if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
                            console.log('[RouteContext] Using first point of middle route for positioning:', firstPoint);
                            
                            // Store the first point for later use
                            setPendingRouteBounds({
                                type: 'point',
                                point: firstPoint,
                                mapStyle: route.mapState?.style,
                                persistentId: route.persistentId || persistentId
                            });
                            
                            console.log('[RouteContext] Stored route point for deferred positioning:', {
                                point: firstPoint,
                                persistentId: route.persistentId || persistentId
                            });
                        } else {
                            console.error('[RouteContext] First point is not a valid coordinate:', firstPoint);
                        }
                    } else {
                        console.error('[RouteContext] No coordinates found in middle route');
                    }
                } else {
                    console.warn('[RouteContext] No route data available for positioning');
                }
            } catch (error) {
                console.error('[RouteContext] Error preparing route bounds:', error);
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
            
            // Load header settings if available
            if (route.headerSettings) {
                setHeaderSettings(route.headerSettings);
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
    const listRoutes = useCallback(async (filters, metadataOnly = true) => {
        try {
            console.log(`[RouteContext] Listing routes with metadataOnly=${metadataOnly}`);
            const { routes } = await routeService.listRoutes(filters, metadataOnly);
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
    // Effect to handle map positioning when route bounds are available
    useEffect(() => {
        if (!pendingRouteBounds) {
            return;
        }
        
        console.log('[RouteContext] Route bounds available, queueing positioning operation');
        
        // Queue the positioning operation using the map operations queue
        queueMapOperation((map) => {
            try {
                // Apply map style if available first
                if (pendingRouteBounds.mapStyle && pendingRouteBounds.mapStyle !== 'default') {
                    console.log('[RouteContext] Applying map style:', pendingRouteBounds.mapStyle);
                    try {
                        map.setStyle(pendingRouteBounds.mapStyle);
                    } catch (styleError) {
                        console.error('[RouteContext] Error setting map style:', styleError);
                        // Continue with positioning even if style setting fails
                    }
                }
                
                if (pendingRouteBounds.type === 'bounds') {
                    console.log('[RouteContext] Positioning using bounds with', pendingRouteBounds.coordinates.length, 'coordinates');
                    
                    // Create bounds from all coordinates
                    const bounds = new mapboxgl.LngLatBounds();
                    pendingRouteBounds.coordinates.forEach(coord => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                            bounds.extend([coord[0], coord[1]]);
                        }
                    });
                    
                    // Fit bounds to show the entire route
                    map.fitBounds(bounds, {
                        padding: 50,
                        duration: 1500
                    });
                    console.log('[RouteContext] Successfully fit map to route bounds');
                } else if (pendingRouteBounds.type === 'point') {
                    console.log('[RouteContext] Positioning using point:', pendingRouteBounds.point);
                    
                    // Zoom to the point
                    map.easeTo({
                        center: [pendingRouteBounds.point[0], pendingRouteBounds.point[1]],
                        zoom: 10, // Zoomed out a bit for context
                        duration: 1500,
                        essential: true
                    });
                    console.log('[RouteContext] Successfully positioned map to point');
                }
                
                // Clear the pending bounds after positioning
                setPendingRouteBounds(null);
                console.log('[RouteContext] Cleared pending route bounds after positioning');
            } catch (error) {
                console.error('[RouteContext] Error during map positioning:', error);
            }
        }, 'routePositioning');
        
    }, [pendingRouteBounds]);

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
                    reorderRoutes,
                    // Saved routes state
                    savedRoutes,
                    isSaving,
                    isLoading,
                    isLoadedMap,
                    currentLoadedState,
                    currentLoadedPersistentId,
                    hasUnsavedChanges,
                    // Change tracking
                    setChangedSections,
                    // Save/Load operations
                    saveCurrentState,
                    loadRoute,
                    listRoutes,
                    deleteSavedRoute,
                    clearCurrentWork,
                    pendingRouteBounds,
                    // Header settings
                    headerSettings,
                    updateHeaderSettings: (settings) => {
                        console.log('Updating header settings in RouteContext:', settings);
                        
                        // Create a new blob URL if we have a blob but no URL
                        let newSettings = { ...headerSettings, ...settings };
                        
                        if (newSettings.logoBlob && !newSettings.logoUrl) {
                            // Create a new URL from the blob
                            const blobUrl = URL.createObjectURL(newSettings.logoBlob);
                            console.log('Created new blob URL for logo:', blobUrl);
                            newSettings.logoUrl = blobUrl;
                        }
                        
                        console.log('New header settings:', newSettings);
                        setHeaderSettings(newSettings);
                        setHasUnsavedChanges(true);
                        setChangedSections(prev => ({...prev, headerSettings: true}));
                    },
                }, children: children })] }));
};
export const useRouteContext = () => {
    const context = useContext(RouteContext);
    if (!context) {
        throw new Error('useRouteContext must be used within a RouteProvider');
    }
    return context;
};
