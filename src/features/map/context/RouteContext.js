import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"; // Import useRef
import { useAuth0 } from "@auth0/auth0-react";
import { useAutoSave } from "../../../context/AutoSaveContext";
import { getMapOverviewData, setMapOverviewData, setMarkMapOverviewChangedFunction } from "../../presentation/store/mapOverviewStore";
import { useRouteService } from "../services/routeService";
import { useMapContext } from "./MapContext";
import { queueMapOperation } from "../utils/mapOperationsQueue";
import mapboxgl from 'mapbox-gl';
import { usePOIContext } from "../../poi/context/POIContext";
import { usePhotoContext } from "../../photo/context/PhotoContext";
import { getPhotoIdentifier } from "../../photo/utils/clustering";
import { usePhotoService } from "../../photo/services/photoService";
import { usePlaceContext } from "../../place/context/PlaceContext";
import { useLineContext } from "../../lineMarkers/context/LineContext";
import { normalizeRoute } from "../utils/routeUtils";
import { updateRouteInFirebase, updateHeaderSettingsInFirebase } from "../../../services/firebaseGpxAutoSaveService";
import { updateSavedRoute } from "../../../services/firebaseSaveCompleteRouteService";
import { getRouteLocationData } from "../../../utils/geocoding";
import { getRouteDistance, getUnpavedPercentage, getElevationGain } from "../../gpx/utils/routeUtils";
import { AuthAlert } from "@/features/auth/components/AuthAlert/AuthAlert";
import logger from "../../../utils/logger";
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
    // Set up the function to mark map overview as changed
    useEffect(() => {
        // Provide the function to mark map overview as changed
        setMarkMapOverviewChangedFunction(() => {
            setChangedSections(prev => ({...prev, mapOverview: true}));
        });

        // Clean up when unmounted
        return () => {
            setMarkMapOverviewChangedFunction(null);
        };
    }, []);

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
    const [currentLoadedState, _setCurrentLoadedState] = useState(null); // Renamed setter
    const [currentLoadedPersistentId, setCurrentLoadedPersistentId] = useState(null);
    const [overallRouteName, setOverallRouteName] = useState(''); // State for overall route name
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Use state for changedSections but also a ref to hold the latest value
    const [changedSections, _setChangedSections] = useState({});
    const changedSectionsRef = useRef(changedSections);

    // Wrapper for setChangedSections to update both state and ref
    const setChangedSections = useCallback((update) => {
        _setChangedSections(prev => {
            const newState = typeof update === 'function' ? update(prev) : { ...prev, ...update };
            changedSectionsRef.current = newState; // Keep ref updated
            return newState;
        });
    }, []);

    const [pendingRouteBounds, setPendingRouteBounds] = useState(null);
    const [loadedLineData, setLoadedLineData] = useState([]);
    const [headerSettings, setHeaderSettings] = useState({
        color: '#000000',
        logoUrl: null,
        logoPublicId: null, // Track the public ID for deletion
        username: '',
        logoFile: null,
        logoData: null,
        logoBlob: null
    });

    const setCurrentLoadedState = useCallback((loadedStateData) => {
        _setCurrentLoadedState(loadedStateData);
        if (loadedStateData) {
            const settingsToUse = loadedStateData.headerSettings || {};
            const color = settingsToUse.color || loadedStateData.color || '#000000';
            let logoUrl = settingsToUse.logoUrl || loadedStateData.thumbnailUrl || null;
            let logoPublicId = settingsToUse.logoPublicId || loadedStateData.thumbnailPublicId || null;
            const username = settingsToUse.username || loadedStateData.username || '';

            if (logoUrl && logoUrl.startsWith('blob:')) {
                logoUrl = null;
                logoPublicId = null;
            }
            
            const newSettings = {
                color,
                logoUrl,
                logoPublicId,
                username,
                logoFile: null, 
                logoData: null, 
                logoBlob: null
            };
            setHeaderSettings(newSettings);
            console.log('[RouteContext] setCurrentLoadedState also updated headerSettings to:', newSettings);
        } else {
            // Clearing loaded state, so reset headerSettings to defaults
            const defaultSettings = {
                color: '#000000',
                logoUrl: null,
                logoPublicId: null,
                username: '',
                logoFile: null,
                logoData: null,
                logoBlob: null
            };
            setHeaderSettings(defaultSettings);
            console.log('[RouteContext] setCurrentLoadedState cleared, headerSettings reset to defaults:', defaultSettings);
        }
    }, [/* setHeaderSettings is stable */]);
    
    // Get the AutoSave context and Auth0 context
    const autoSave = useAutoSave();
    const { user, isAuthenticated } = useAuth0();

    const updateOverallRouteName = useCallback((newName) => {
        setOverallRouteName(newName);
        setHasUnsavedChanges(true);
        setChangedSections(prev => ({ ...prev, overallName: true }));

        if (currentLoadedPersistentId && isAuthenticated && user?.sub) {
            console.log('[RouteContext] Auto-saving overall route name to permanent route:', currentLoadedPersistentId);
            // Call updateSavedRoute with null for segmentRouteId to indicate an overall update
            updateSavedRoute(currentLoadedPersistentId, null, { name: newName }, user.sub)
                .then(success => {
                    if (success) {
                        console.log('[RouteContext] Overall route name saved to permanent route successfully');
                    } else {
                        console.warn('[RouteContext] Failed to save overall route name to permanent route');
                    }
                })
                .catch(error => {
                    console.error('[RouteContext] Error saving overall route name to permanent route:', error);
                });
        }
    }, [currentLoadedPersistentId, isAuthenticated, user, setChangedSections]);

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
        
        // Auto-save to Firebase if authenticated
        try {
            // Use the user and isAuthenticated from the top-level hook
            const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
            
            console.log('[RouteContext] Auto-saving route reordering to Firebase with userId:', userId);
            
            // We need to get the updated routes after the state update
            // This is a bit tricky since state updates are asynchronous
            // For now, we'll just log a warning and rely on the next auto-save
            console.warn('[RouteContext] Route reordering will be saved on the next auto-save operation');
            
            // We'll update the routes in Firebase on the next state update
            setTimeout(() => {
                setRoutes(currentRoutes => {
                    // Auto-save the current routes to Firebase
                    updateRouteInFirebase(
                        currentRoutes[0]?.routeId, 
                        { routes: currentRoutes }, 
                        userId, 
                        autoSave
                    )
                    .then(autoSaveId => {
                        if (autoSaveId) {
                            console.log('[RouteContext] Route reordering auto-saved to Firebase successfully', { autoSaveId });
                        } else {
                            console.warn('[RouteContext] Failed to auto-save route reordering to Firebase');
                        }
                    })
                    .catch(error => {
                        console.error('[RouteContext] Error auto-saving route reordering to Firebase:', error);
                    });
                    
                    // Return the current routes unchanged
                    return currentRoutes;
                });
            }, 100);
        } catch (autoSaveError) {
            console.error('[RouteContext] Error during Firebase auto-save:', autoSaveError);
            // Continue with normal flow even if auto-save fails
        }
    }, [autoSave, user, isAuthenticated]);

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
        }
        // Check if only metadata was updated
        else if (updates.metadata && Object.keys(updates).length === 1) {
            changedSectionUpdates.metadata = true;
        }
        else {
            // Only mark routes as changed if it's not just a description or metadata update
            changedSectionUpdates.routes = true;
        }

        setChangedSections(changedSectionUpdates); // Use the new setter

        // Check if this is a permanently saved route
        if (currentLoadedPersistentId) {
            // Use the user and isAuthenticated from the top-level hook
            const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
            
            console.log('[RouteContext] Auto-saving route update to permanent route:', currentLoadedPersistentId, 'for segment:', routeId);
            
            // Call the updateSavedRoute function to update the permanent route
            // Pass routeId as the segmentRouteId
            updateSavedRoute(currentLoadedPersistentId, routeId, { ...updates }, userId)
                .then(success => {
                    if (success) {
                        console.log('[RouteContext] Route segment update saved to permanent route successfully');
                    } else {
                        console.warn('[RouteContext] Failed to save route update to permanent route');
                    }
                })
                .catch(error => {
                    console.error('[RouteContext] Error saving route update to permanent route:', error);
                });
        } else {
            // Auto-save to Firebase if authenticated and not a permanent route
            try {
                // Use the user and isAuthenticated from the top-level hook
                const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                
                // Skip auto-save if the user is not authenticated
                if (userId === 'anonymous-user') {
                    console.log('[RouteContext] Skipping auto-save to Firebase for anonymous user');
                    return;
                }
                
                console.log('[RouteContext] Auto-saving route update to Firebase with userId:', userId);
                
                // Call the update function with the autoSave context
                updateRouteInFirebase(routeId, updates, userId, autoSave)
                    .then(autoSaveId => {
                        if (autoSaveId) {
                            console.log('[RouteContext] Route update auto-saved to Firebase successfully', { autoSaveId });
                        } else {
                            console.warn('[RouteContext] Failed to auto-save route update to Firebase');
                        }
                    })
                    .catch(error => {
                        console.error('[RouteContext] Error auto-saving route update to Firebase:', error);
                    });
            } catch (autoSaveError) {
                console.error('[RouteContext] Error during Firebase auto-save:', autoSaveError);
                // Continue with normal flow even if auto-save fails
            }
        }
    }, [setChangedSections, autoSave, currentLoadedPersistentId, isAuthenticated, user, updateSavedRoute]); // Add dependencies
    // Context hooks
    const routeService = useRouteService();
    const { map } = useMapContext();
    const { pois, getPOIsForRoute, loadPOIsFromRoute } = usePOIContext();
    const photoContext = usePhotoContext(); // Keep photoContext
    // Remove top-level destructuring of 'photos' - we'll get it inside saveCurrentState
    // const { photos, addPhoto } = photoContext;
    const photoService = usePhotoService();
    const { places, updatePlace } = usePlaceContext();

    // Get LineContext for line marker functionality
    let lineContext = null;
    try {
        // Attempt to get LineContext, but don't throw an error if it's not available
        const LineContextModule = require('../../lineMarkers/context/LineContext');
        if (LineContextModule && typeof LineContextModule.useLineContext === 'function') {
            try {
                lineContext = LineContextModule.useLineContext();
                // logger.debug('[RouteContext] Successfully accessed LineContext');
            } catch (error) {
                // This is expected when the RouteProvider is used outside of a LineProvider
                // logger.debug('[RouteContext] LineContext not available (expected):', error.message);
            }
        } else {
            // logger.debug('[RouteContext] LineContext module not available or useLineContext is not a function');
        }
    } catch (error) {
        // This is expected when the LineContext module cannot be imported
        // logger.debug('[RouteContext] Could not import LineContext module (expected):', error.message);
    }

    // Helper function to upload photos to Cloudinary
    const uploadPhotosToCloudinary = async (photosToUpload) => {
      const localPhotos = photosToUpload.filter(p => p.isLocal === true);
      if (localPhotos.length === 0) return photosToUpload;

      const updatedPhotos = [...photosToUpload];

      for (const photo of localPhotos) {
        // Use the compressed original file if available, otherwise fall back to the blob
        const fileToUpload = photo._originalFile || photo._blobs?.large;
        if (!fileToUpload) {
          console.warn(`[RouteContext] No file to upload for photo ${photo.id}, skipping`);
          continue;
        }

        try {
          // Create a File object if needed (if it's a blob and not already a File)
          const fileObject = photo._originalFile instanceof File 
            ? photo._originalFile 
            : new File([fileToUpload], photo.name, { type: 'image/jpeg' });

          console.log(`[RouteContext] Uploading photo ${photo.id} to Cloudinary (${(fileObject.size/1024/1024).toFixed(2)}MB)`);
          
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
              _blobs: undefined,
              _originalFile: undefined // Remove the original file to free memory
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
    // Import the cloudinary utility functions
    const { uploadToCloudinary, getPublicIdFromUrl } = await import('../../../utils/cloudinary');

    // Check if we have a logo file to upload
    if (!headerSettings.logoFile && !headerSettings.logoData && !headerSettings.logoBlob) {
      // Check if the current URL is a blob URL
      if (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
        console.warn('[RouteContext] Logo URL is a blob URL but no file is available for upload');
        return { url: null, publicId: null }; // Return null to indicate we should not use this URL
      }
      // Return the existing URL and try to extract the public ID if it's a Cloudinary URL
      return {
        url: headerSettings.logoUrl,
        publicId: headerSettings.logoPublicId || getPublicIdFromUrl(headerSettings.logoUrl)
      };
    }

    try {
      // console.log('[RouteContext] Uploading logo to Cloudinary');

      // Try all possible sources for the file, in order of preference
      let fileToUpload = null;

      // First try the blob directly
      if (headerSettings.logoBlob) {
        // console.log('[RouteContext] Using logoBlob for upload');
        fileToUpload = headerSettings.logoBlob;
      }
      // Then try the blob from logoData
      else if (headerSettings.logoData?._blobs?.original) {
        // console.log('[RouteContext] Using logoData._blobs.original for upload');
        fileToUpload = headerSettings.logoData._blobs.original;
      }
      // Then try the file from logoData
      else if (headerSettings.logoData?.file) {
        // console.log('[RouteContext] Using logoData.file for upload');
        fileToUpload = headerSettings.logoData.file;
      }
      // Finally try the logoFile
      else if (headerSettings.logoFile) {
        // console.log('[RouteContext] Using logoFile for upload');
        fileToUpload = headerSettings.logoFile;
      }

      if (!fileToUpload) {
        console.warn('[RouteContext] No logo file found to upload');
        // If the current URL is a blob URL, return null to avoid using it
        if (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
          return { url: null, publicId: null };
        }
        return {
          url: headerSettings.logoUrl,
          publicId: headerSettings.logoPublicId || getPublicIdFromUrl(headerSettings.logoUrl)
        };
      }

      // Use the uploadToCloudinary utility function
      const result = await uploadToCloudinary(fileToUpload);

      // console.log('[RouteContext] Logo uploaded successfully:', result);
      return { url: result.url, publicId: result.publicId };
    } catch (error) {
      console.error('[RouteContext] Error uploading logo to Cloudinary:', error);
      // Return null if upload fails and current URL is a blob URL
      if (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
        // console.log('[RouteContext] Clearing blob URL since upload failed or no file was available');
        return { url: null, publicId: null };
      }
      // Return the existing URL if upload fails and it's not a blob URL
      return {
        url: headerSettings.logoUrl,
        publicId: headerSettings.logoPublicId || getPublicIdFromUrl(headerSettings.logoUrl)
      };
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

            // console.log('[RouteContext] Updated route metadata:', route.metadata);

            // Update the route in the context
            updateRoute(route.routeId || route.id, { metadata: route.metadata });

            return route;
        } catch (error) {
            console.error('[RouteContext] Error updating route with location data:', error);
            return route;
        }
    }, [updateRoute]); // Added updateRoute to dependency array

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

    // Check if we're in any presentation or preview mode
    const isPresentationMode = window.location.pathname.includes('/presentation/') ||
                              window.location.pathname.includes('/preview/route/');

    // Only update route metadata for fresh routes (not loaded from DB) and when not in presentation mode
    if (processedRoute._type === 'fresh' && !isPresentationMode) {
        // console.log('[RouteContext] Updating metadata for new route');
        updateRouteMetadata(processedRoute).catch(error => {
            console.error('[RouteContext] Error in route metadata update:', error);
        });
    } else {
        // console.log('[RouteContext] Skipping metadata update for',
        //     processedRoute._type === 'loaded' ? 'loaded route' : 'route in presentation mode');
    }

            return updatedRoutes;
        });
        setHasUnsavedChanges(true);
        setChangedSections(prev => ({...prev, routes: true}));
    }, [currentLoadedState, updateRouteMetadata]);
    const deleteRoute = useCallback((routeId) => {
        console.log('[RouteContext] Deleting route:', routeId);
        
        // Clean up map layers first if we have access to the map
        if (map) {
            try {
                const style = map.getStyle();
                if (!style) {
                    console.warn('[RouteContext] Map style not available');
                    return;
                }

                // Enhanced list of layer patterns to catch all possible route-related layers
                const layerPatterns = [
                    `${routeId}-main-line`,
                    `${routeId}-main-border`,
                    `${routeId}-hover`,
                    `unpaved-section-layer-${routeId}`,
                    `${routeId}-surface`,
                    `${routeId}-unpaved-line`,
                    `route-${routeId}`,
                    `${routeId}-route`,
                    `${routeId}-line`,
                    `${routeId}-border`,
                    `${routeId}-outline`,
                    `${routeId}-fill`,
                    `${routeId}-symbol`,
                    `${routeId}-label`
                ];

                // Find all layers that match our patterns or include the routeId
                const allLayers = style.layers
                    .map(layer => layer.id)
                    .filter(id => id.includes(routeId) ||
                                 layerPatterns.some(pattern => id.includes(pattern)));

                console.log('[RouteContext] Found layers to remove:', allLayers);

                // Remove all layers first
                allLayers.forEach(layerId => {
                    if (map.getLayer(layerId)) {
                        try {
                            console.log('[RouteContext] Removing layer:', layerId);
                            map.removeLayer(layerId);
                        } catch (error) {
                            console.error('[RouteContext] Error removing layer:', layerId, error);
                        }
                    }
                });

                // Enhanced list of source patterns to catch all possible route-related sources
                const sourcePatterns = [
                    `${routeId}-main`,
                    `unpaved-section-${routeId}`,
                    `${routeId}-unpaved`,
                    `route-${routeId}`,
                    `${routeId}-route`,
                    `${routeId}-source`,
                    `${routeId}-data`,
                    `${routeId}-geojson`
                ];

                // Get all source IDs from the style
                const allSources = Object.keys(style.sources || {})
                    .filter(id => id.includes(routeId) ||
                                 sourcePatterns.some(pattern => id.includes(pattern)));

                console.log('[RouteContext] Found sources to remove:', allSources);

                // Remove all sources after a brief delay
                setTimeout(() => {
                    allSources.forEach(sourceId => {
                        if (map.getSource(sourceId)) {
                            try {
                                console.log('[RouteContext] Removing source:', sourceId);
                                map.removeSource(sourceId);
                            } catch (error) {
                                console.error('[RouteContext] Error removing source:', sourceId, error);
                            }
                        }
                    });
                    
                    // Force a map redraw with a slightly longer delay to ensure all cleanup is complete
                    setTimeout(() => {
                        try {
                            console.log('[RouteContext] Forcing map redraw after route deletion');
                            map.resize();
                            
                            // Additional map refresh to ensure rendering is updated
                            if (map.repaint) {
                                map.repaint = true;
                            }
                        } catch (error) {
                            console.error('[RouteContext] Error during map redraw:', error);
                        }
                    }, 200);
                }, 100);
            } catch (error) {
                console.error('[RouteContext] Error cleaning up map layers:', error);
            }
        }
        
        setRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
        setCurrentRoute((prev) => prev?.routeId === routeId ? null : prev);
        setHasUnsavedChanges(true);
        setChangedSections(prev => ({...prev, routes: true}));
    }, [map]);
    // Enhanced clearCurrentWork function with complete map reset and event handler cleanup
    const clearCurrentWork = useCallback(() => {
        console.log('[RouteContext] Starting enhanced clearCurrentWork process');
        
        // Step 1: Clear all state variables first
        console.log('[RouteContext] Clearing all state variables');
        
        // Clear route-related state
        setRoutes([]);
        setCurrentRoute(null);
        setCurrentLoadedState(null); // This will also reset headerSettings via the new setCurrentLoadedState
        setCurrentLoadedPersistentId(null);
        setOverallRouteName(''); // Reset overall route name
        setHasUnsavedChanges(false);
        setIsLoadedMap(false);
        
        // Note: setHeaderSettings is now handled by setCurrentLoadedState(null)
        
        // Clear loadedLineData to ensure DirectLineLayer doesn't render any lines
        console.log('[RouteContext] Clearing loadedLineData');
        setLoadedLineData([]);
        
        // Reset changed sections tracking
        console.log('[RouteContext] Resetting changed sections tracking');
        setChangedSections({});
        
        // Step 2: Clear related contexts using a more reliable approach
        
        // IMPORTANT: Clear the climb markers first - this is critical for removing the flags
        // Try multiple approaches to ensure climb markers are cleared
        console.log('[RouteContext] Clearing climb markers using multiple approaches');
        
        // Approach 1: Use the global registry
        try {
            if (window && window.__contextRegistry && window.__contextRegistry.ClimbMarkers) {
                console.log('[RouteContext] Using global registry to clear climb markers');
                const climbMarkersInstance = window.__contextRegistry.ClimbMarkers;
                if (climbMarkersInstance && typeof climbMarkersInstance.clearClimbCache === 'function') {
                    climbMarkersInstance.clearClimbCache();
                    console.log('[RouteContext] Successfully cleared climb markers using global registry');
                }
            }
        } catch (error) {
            console.warn('[RouteContext] Error clearing climb markers using global registry:', error);
        }
        
        // Approach 2: Try direct require (as before)
        try {
            const ClimbMarkersModule = require('../components/ClimbMarkers/ClimbMarkers');
            
            if (ClimbMarkersModule && typeof ClimbMarkersModule.clearClimbCache === 'function') {
                console.log('[RouteContext] Directly calling clearClimbCache to remove all climb markers');
                ClimbMarkersModule.clearClimbCache();
                console.log('[RouteContext] Successfully cleared climb markers via direct require');
            }
        } catch (error) {
            console.warn('[RouteContext] Error clearing climb markers via direct require:', error);
        }
        
        // Approach 3: Aggressive DOM cleanup for climb markers
        try {
            console.log('[RouteContext] Performing aggressive DOM cleanup for climb markers');
            
            // Find and remove all mapboxgl-marker elements that contain climb-marker elements
            const mapboxMarkers = document.querySelectorAll('.mapboxgl-marker');
            if (mapboxMarkers && mapboxMarkers.length > 0) {
                console.log(`[RouteContext] Found ${mapboxMarkers.length} mapboxgl-marker elements to check`);
                
                mapboxMarkers.forEach(marker => {
                    try {
                        // Check if this marker contains a climb-marker element
                        if (marker.querySelector('.climb-marker')) {
                            console.log('[RouteContext] Removing mapboxgl-marker containing climb-marker');
                            marker.remove();
                        }
                    } catch (error) {
                        console.warn('[RouteContext] Error checking/removing mapboxgl-marker:', error);
                    }
                });
            }
            
            // Also try to remove any remaining climb-marker elements directly
            const climbMarkers = document.querySelectorAll('.climb-marker');
            if (climbMarkers && climbMarkers.length > 0) {
                console.log(`[RouteContext] Found ${climbMarkers.length} climb-marker elements to remove directly`);
                
                climbMarkers.forEach(marker => {
                    try {
                        // Try to get the parent mapboxgl-marker element
                        const markerParent = marker.closest('.mapboxgl-marker');
                        if (markerParent) {
                            markerParent.remove();
                        } else {
                            // If we can't find the parent, remove the element itself
                            marker.remove();
                        }
                    } catch (error) {
                        console.warn('[RouteContext] Error removing climb-marker element:', error);
                    }
                });
            }
            
            console.log('[RouteContext] Aggressive DOM cleanup for climb markers completed');
        } catch (error) {
            console.error('[RouteContext] Error during aggressive DOM cleanup for climb markers:', error);
        }
        
        // Clear photos from PhotoContext
        if (photoContext && typeof photoContext.clearPhotos === 'function') {
            console.log('[RouteContext] Clearing photos from PhotoContext');
            photoContext.clearPhotos();
        } else {
            console.warn('[RouteContext] PhotoContext or clearPhotos not available during clearCurrentWork');
        }
        
        // Clear POIs - use a more direct approach
        // First try using the imported POIContext if available
        try {
            // Access POIContext through the global window object if it's been registered there
            if (window && window.__contextRegistry && window.__contextRegistry.POIContext) {
                const poiContextInstance = window.__contextRegistry.POIContext;
                if (poiContextInstance && typeof poiContextInstance.clearPOIs === 'function') {
                    console.log('[RouteContext] Clearing POIs using registered context');
                    poiContextInstance.clearPOIs();
                }
            } else {
                // As a fallback, try to clear POI markers directly from the map
                if (map) {
                    console.log('[RouteContext] Attempting to remove POI markers directly from the map');
                    // Find and remove all elements with class that might be related to POIs
                    const poiElements = document.querySelectorAll('.poi-marker, .poi-icon, .mapboxgl-marker.poi');
                    if (poiElements && poiElements.length > 0) {
                        console.log(`[RouteContext] Found ${poiElements.length} POI elements to remove`);
                        poiElements.forEach(element => {
                            try {
                                element.remove();
                            } catch (error) {
                                console.warn('[RouteContext] Error removing POI element:', error);
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[RouteContext] Error clearing POIs:', error);
        }
        
        // Clear lines - try multiple approaches to ensure line markers are cleared
        console.log('[RouteContext] Clearing line markers using multiple approaches');
        
        // Approach 1: Set the force cleanup flag and use the global registry
        try {
            // Set the global force cleanup flag to bypass conditional cleanup logic in LineMarker
            if (typeof window !== 'undefined') {
                console.log('[RouteContext] Setting global force cleanup flag');
                window.__forceLineCleanup = true;
            }
            
            if (window && window.__contextRegistry && window.__contextRegistry.LineContext) {
                console.log('[RouteContext] Using global registry to clear line markers');
                const lineContextInstance = window.__contextRegistry.LineContext;
                if (lineContextInstance && typeof lineContextInstance.clearLines === 'function') {
                    lineContextInstance.clearLines();
                    console.log('[RouteContext] Successfully cleared line markers using global registry');
                }
            }
        } catch (error) {
            console.warn('[RouteContext] Error clearing line markers using global registry:', error);
        }
        
        // Approach 2: Try using the lineContext if available (as before)
        if (lineContext && typeof lineContext.clearLines === 'function') {
            console.log('[RouteContext] Clearing lines from LineContext');
            lineContext.clearLines();
        }
        
        // Approach 3: Extremely aggressive DOM and map cleanup for line markers
        try {
            console.log('[RouteContext] Performing extremely aggressive cleanup for line markers');
            
            // First, clear the lines array in LineContext to prevent re-rendering
            if (window && window.__contextRegistry && window.__contextRegistry.LineContext) {
                console.log('[RouteContext] Using global registry to clear line markers');
                const lineContextInstance = window.__contextRegistry.LineContext;
                if (lineContextInstance && typeof lineContextInstance.clearLines === 'function') {
                    lineContextInstance.clearLines();
                    console.log('[RouteContext] Successfully cleared line markers using global registry');
                }
            }
            
            // Find and remove all mapboxgl-marker elements that might be related to lines
            const mapboxMarkers = document.querySelectorAll('.mapboxgl-marker');
            if (mapboxMarkers && mapboxMarkers.length > 0) {
                console.log(`[RouteContext] Found ${mapboxMarkers.length} mapboxgl-marker elements to check for line markers`);
                
                mapboxMarkers.forEach(marker => {
                    try {
                        // Check if this marker contains a line-marker element or has a line-related class
                        // Also check for line-text-container and line-icons-container
                        if (marker.querySelector('.line-marker') || 
                            marker.querySelector('.line-text-container') ||
                            marker.querySelector('.line-icons-container') ||
                            marker.querySelector('.line-text-label') ||
                            marker.classList.contains('line-marker') || 
                            marker.classList.contains('line')) {
                            console.log('[RouteContext] Removing mapboxgl-marker containing line-marker or line-related elements');
                            marker.remove();
                        }
                    } catch (error) {
                        console.warn('[RouteContext] Error checking/removing mapboxgl-marker for lines:', error);
                    }
                });
            }
            
            // Also try to remove any remaining line-marker elements directly
            const lineElements = document.querySelectorAll('.line-marker, .line-icon, .mapboxgl-marker.line, .line-text-container, .line-icons-container, .line-text-label');
            if (lineElements && lineElements.length > 0) {
                console.log(`[RouteContext] Found ${lineElements.length} line elements to remove directly`);
                lineElements.forEach(element => {
                    try {
                        // Try to get the parent mapboxgl-marker element
                        const markerParent = element.closest('.mapboxgl-marker');
                        if (markerParent) {
                            markerParent.remove();
                        } else {
                            // If we can't find the parent, remove the element itself
                            element.remove();
                        }
                    } catch (error) {
                        console.warn('[RouteContext] Error removing line element:', error);
                    }
                });
            }
            
            // Super aggressive approach to remove ALL line-related layers and sources from the map
            if (map) {
                try {
                    const style = map.getStyle();
                    if (style && style.layers) {
                        // Find ALL layers that might be related to lines
                        const lineLayerPatterns = [
                            'line-', // Matches any layer starting with 'line-'
                            '-line', // Matches any layer ending with '-line'
                            '-shadow', // Matches shadow layers
                            'circle-', // Matches circle layers for line markers
                            'inner-circle-', // Matches inner circle layers
                            '-extrusion', // Matches any extrusion layers
                            '-glow' // Matches any glow layers
                        ];
                        
                        // Get all layers that match any of the patterns
                        const allLineLayers = style.layers
                            .filter(layer => {
                                return lineLayerPatterns.some(pattern => layer.id.includes(pattern));
                            })
                            .map(layer => layer.id);
                        
                        console.log(`[RouteContext] Found ${allLineLayers.length} potential line-related layers to remove`);
                        
                        // Remove all line-related layers
                        allLineLayers.forEach(layerId => {
                            try {
                                if (map.getLayer(layerId)) {
                                    console.log(`[RouteContext] Removing layer: ${layerId}`);
                                    map.removeLayer(layerId);
                                }
                            } catch (error) {
                                console.warn(`[RouteContext] Error removing layer ${layerId}:`, error);
                            }
                        });
                        
                        // Find and remove all line-related sources
                        const lineSourcePatterns = [
                            'line-', // Matches any source starting with 'line-'
                            '-line', // Matches any source ending with '-line'
                            'circle-source-' // Matches circle sources for line markers
                        ];
                        
                        // Get all sources that match any of the patterns
                        const allLineSources = Object.keys(style.sources || {})
                            .filter(sourceId => {
                                return lineSourcePatterns.some(pattern => sourceId.includes(pattern));
                            });
                        
                        console.log(`[RouteContext] Found ${allLineSources.length} potential line-related sources to remove`);
                        
                        // Remove all line-related sources
                        allLineSources.forEach(sourceId => {
                            try {
                                if (map.getSource(sourceId)) {
                                    console.log(`[RouteContext] Removing source: ${sourceId}`);
                                    map.removeSource(sourceId);
                                }
                            } catch (error) {
                                console.warn(`[RouteContext] Error removing source ${sourceId}:`, error);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('[RouteContext] Error removing line layers and sources:', error);
                }
            }
            
            // Force LineContext to reset its state by directly modifying its internal state if possible
            if (lineContext) {
                try {
                    console.log('[RouteContext] Forcing LineContext to reset its state');
                    
                    // Try to access and reset all relevant state variables
                    if (typeof lineContext.setLines === 'function') {
                        lineContext.setLines([]);
                    }
                    
                    if (typeof lineContext.setCurrentLine === 'function') {
                        lineContext.setCurrentLine(null);
                    }
                    
                    if (typeof lineContext.setSelectedLine === 'function') {
                        lineContext.setSelectedLine(null);
                    }
                    
                    if (typeof lineContext.setIsDrawing === 'function') {
                        lineContext.setIsDrawing(false);
                    }
                    
                    if (typeof lineContext.setIsDrawingInitialized === 'function') {
                        lineContext.setIsDrawingInitialized(false);
                    }
                    
                    console.log('[RouteContext] Successfully reset LineContext state');
                } catch (error) {
                    console.warn('[RouteContext] Error resetting LineContext state:', error);
                }
            }
            
            // Reset the global force cleanup flag after a short delay
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    console.log('[RouteContext] Resetting global force cleanup flag');
                    window.__forceLineCleanup = false;
                }
            }, 500); // Longer timeout to ensure all cleanup has completed
            
            console.log('[RouteContext] Aggressive DOM cleanup for line markers completed');
        } catch (error) {
            console.error('[RouteContext] Error during aggressive DOM cleanup for line markers:', error);
        }
        
        // Step 3: Aggressively remove all map layers and event handlers before resetting style
        if (map) {
            try {
                console.log('[RouteContext] Aggressively removing all map layers and event handlers');
                
                // Get all layers and sources from the map
                const style = map.getStyle();
                if (style && style.layers && style.sources) {
                    // First, remove all event handlers from route layers
                    const routeLayers = style.layers
                        .filter(layer => 
                            layer.id.includes('-main-line') || 
                            layer.id.includes('-hover-line') ||
                            layer.id.includes('unpaved-section')
                        )
                        .map(layer => layer.id);
                    
                    console.log('[RouteContext] Removing event handlers from route layers:', routeLayers);
                    
                    // Remove all event handlers from route layers
                    routeLayers.forEach(layerId => {
                        try {
                            // Remove all possible event handlers
                            map.off('click', layerId);
                            map.off('mouseenter', layerId);
                            map.off('mousemove', layerId);
                            map.off('mouseleave', layerId);
                            console.log('[RouteContext] Removed event handlers from layer:', layerId);
                        } catch (error) {
                            console.warn('[RouteContext] Error removing event handlers from layer:', layerId, error);
                        }
                    });
                    
                    // Remove all custom layers (non-mapbox layers)
                    const customLayers = style.layers
                        .filter(layer => !layer.id.startsWith('mapbox-'))
                        .map(layer => layer.id);
                    
                    console.log('[RouteContext] Removing custom layers:', customLayers.length);
                    
                    customLayers.forEach(layerId => {
                        try {
                            if (map.getLayer(layerId)) {
                                map.removeLayer(layerId);
                                console.log('[RouteContext] Removed layer:', layerId);
                            }
                        } catch (error) {
                            console.warn('[RouteContext] Error removing layer:', layerId, error);
                        }
                    });
                    
                    // Remove all custom sources (non-mapbox sources)
                    const customSources = Object.keys(style.sources)
                        .filter(sourceId => !sourceId.startsWith('mapbox-'));
                    
                    console.log('[RouteContext] Removing custom sources:', customSources.length);
                    
                    customSources.forEach(sourceId => {
                        try {
                            if (map.getSource(sourceId)) {
                                map.removeSource(sourceId);
                                console.log('[RouteContext] Removed source:', sourceId);
                            }
                        } catch (error) {
                            console.warn('[RouteContext] Error removing source:', sourceId, error);
                        }
                    });
                }
            } catch (error) {
                console.error('[RouteContext] Error during aggressive layer cleanup:', error);
            }
        }
        
        // Step 4: Reset the map style - this is the most effective way to clear all data
        if (map) {
            console.log('[RouteContext] Resetting map style to clear all data');
            
            try {
                // Get the current style URL or name
                const currentStyle = map.getStyle();
                const styleUrl = currentStyle.name || currentStyle.sprite || 'mapbox://styles/mapbox/streets-v11';
                
                console.log('[RouteContext] Current style:', styleUrl);
                
                // Save the current view state
                const center = map.getCenter();
                const zoom = map.getZoom();
                const bearing = map.getBearing();
                const pitch = map.getPitch();
                
                console.log('[RouteContext] Saving view state:', { 
                    center: [center.lng, center.lat], 
                    zoom, 
                    bearing, 
                    pitch 
                });
                
                // Set the style to the same style - this completely resets the map
                // while preserving the style appearance
                map.setStyle(styleUrl);
                
                // When the style loads, restore the view state
                map.once('style.load', () => {
                    console.log('[RouteContext] Style loaded, restoring view state');
                    
                    map.setCenter(center);
                    map.setZoom(zoom);
                    map.setBearing(bearing);
                    map.setPitch(pitch);
                    
                    // Force a final resize to ensure everything is refreshed
                    setTimeout(() => {
                        map.resize();
                        console.log('[RouteContext] Map reset complete');
                        
                        // Force a repaint to ensure all layers are properly cleared
                        if (map.repaint) {
                            map.repaint = true;
                        }
                    }, 100);
                });
            } catch (error) {
                console.error('[RouteContext] Error resetting map style:', error);
            }
        }
        
        console.log('[RouteContext] Enhanced clearCurrentWork process complete');
    }, [map, photoContext, lineContext, setChangedSections]);
    // Function to get lines from LineContext will be passed as parameter

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
    const saveCurrentState = useCallback(async (name, type, isPublic, lineData, eventDate) => {
        const currentChangedSections = changedSectionsRef.current; // Read from ref
        // console.log('[RouteContext] DEBUG: changedSectionsRef.current at start of save:', currentChangedSections); // *** UPDATED LOGGING ***
        try {
            // console.log('[RouteContext] Starting save with:', { name, type, isPublic });
            const pois = getPOIsForRoute();
            if (!routes.length) {
                throw new Error('No route data to save');
            }
            setIsSaving(true);

            // Check if there are any changes at all (read from ref)
            const hasAnyChanges = Object.keys(currentChangedSections).length > 0;

            // If this is an existing route and there are no changes, use a minimal update
            if (currentLoadedPersistentId && !hasAnyChanges) {
                // console.log('[RouteContext] No changes detected, using minimal update');

            // Create a minimal payload with just the required fields
            const minimalPayload = {
                persistentId: currentLoadedPersistentId,
                name,
                type,
                isPublic,
                // Convert dayjs object to standard Date if type is 'event'
                eventDate: type === 'event' && eventDate ? eventDate.toDate() : null
            };

                // Use the partial update endpoint
                const result = await routeService.saveRoute(minimalPayload);
                // console.log('[RouteContext] Minimal update successful');

                // Reset changed sections tracking
                setChangedSections({});
                setHasUnsavedChanges(false);
                await listRoutes();

                setIsSaving(false);
                return result;
            }

            // *** Get current photos directly from context inside the function ***
            const currentPhotos = photoContext.photos;
            // console.log('[RouteContext] DEBUG: Fetched currentPhotos inside save:', currentPhotos.length);

            // Log photo identifiers for debugging
            // if (currentPhotos.length > 0) {
            //     console.log('[RouteContext] Current photo identifiers:',
            //         currentPhotos.map(p => getPhotoIdentifier(p.url)));
            // } else {
            //     console.log('[RouteContext] No photos in current state');
            // }

            // Upload any local photos to Cloudinary before saving
            // console.log('[RouteContext] Checking for local photos to upload...');
            let updatedPhotos = currentPhotos; // Start with freshly fetched photos
            // Read photo change status from ref
            let hasPhotoChanges = currentChangedSections.photos || false;
            let photoChangeType = currentChangedSections.photoChangeType || null;

            // console.log('[RouteContext] Photo change status:', {
            //     hasPhotoChanges,
            //     photoChangeType,
            //     currentPhotoCount: currentPhotos.length
            // });

            try {
                // Check if there are any local photos that need to be uploaded
                const localPhotos = currentPhotos.filter(p => p.isLocal === true);
                if (localPhotos.length > 0) {
                    // console.log(`[RouteContext] Found ${localPhotos.length} local photos to upload`);
                    // Upload local photos to Cloudinary
                    updatedPhotos = await uploadPhotosToCloudinary(currentPhotos);
                    hasPhotoChanges = true;

                    // Log the updated photos after upload
                    // console.log('[RouteContext] Photos after upload:', {
                    //     count: updatedPhotos.length,
                    //     photoIds: updatedPhotos.map(p => getPhotoIdentifier(p.url))
                    // });
                } else {
                    // console.log('[RouteContext] No local photos to upload');
                }
            } catch (photoError) {
                console.error('[RouteContext] Error uploading photos:', photoError);
                // Continue with save even if photo upload fails
            }

            // Upload logo to Cloudinary if present or if current URL is a blob URL
            let updatedHeaderSettings = { ...headerSettings };
            // Read header change status from ref
            let hasHeaderChanges = currentChangedSections.headerSettings || false;

            try {
                // Check if we need to upload the logo (either we have a file/data or the current URL is a blob URL)
                if (headerSettings.logoFile || headerSettings.logoData ||
                    (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:'))) {

                    // console.log('[RouteContext] Uploading logo to Cloudinary');
                    const { url: logoUrl, publicId: logoPublicId } = await uploadLogoToCloudinary();

                    // If logoUrl is null, it means we should not use the current URL (it's a blob URL)
                    updatedHeaderSettings = {
                        ...headerSettings,
                        logoUrl: logoUrl, // This will be null if the upload failed or if we should not use the blob URL
                        logoPublicId: logoPublicId, // Store the public ID for later deletion
                        logoFile: null, // Remove the file object after upload
                        logoData: null, // Remove the logo data object after upload
                        logoBlob: null // Remove the blob after upload
                    };

                    // If the logo URL is null and we had a blob URL, clear it completely
                    if (logoUrl === null && headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
                        // console.log('[RouteContext] Clearing blob URL since upload failed or no file was available');
                        updatedHeaderSettings.logoUrl = null;
                        updatedHeaderSettings.logoPublicId = null;
                    } else if (logoUrl) {
                        // console.log('[RouteContext] Logo uploaded successfully:', logoUrl);
                        // console.log('[RouteContext] Logo public ID:', logoPublicId);
                    }

                    hasHeaderChanges = true;
                }
            } catch (logoError) {
                console.error('[RouteContext] Error uploading logo:', logoError);

                // If there was an error and we have a blob URL, clear it to avoid saving an invalid URL
                if (headerSettings.logoUrl && headerSettings.logoUrl.startsWith('blob:')) {
                    // console.log('[RouteContext] Clearing blob URL due to upload error');
                    updatedHeaderSettings.logoUrl = null;
                    hasHeaderChanges = true;
                }

                // Continue with save even if logo upload fails
            }

            // Generate and upload static map image to Cloudinary
            let staticMapUrl = null;
            let staticMapPublicId = null;

            try {
                // Import the generateStaticMapImage function
                const { generateStaticMapImage } = await import('../../../utils/staticMapUtils');

                console.log('[RouteContext] Starting static map generation for routes');
                console.log(`[RouteContext] Generating static map for ${routes.length} routes`);
                
                if (map) {
                    console.log(`[RouteContext] Map center: [${map.getCenter().lng.toFixed(4)}, ${map.getCenter().lat.toFixed(4)}], zoom: ${map.getZoom().toFixed(2)}`);
                } else {
                    console.log('[RouteContext] No map instance available, using default center and zoom');
                }
                
                // Generate static map image with all routes
                const result = await generateStaticMapImage({
                    routes,
                    center: map ? [map.getCenter().lng, map.getCenter().lat] : null,
                    zoom: map ? map.getZoom() : null,
                    width: 800,
                    height: 600,
                    style: 'satellite-streets-v12'
                });

                staticMapUrl = result.url;
                staticMapPublicId = result.publicId;
                
                console.log('[RouteContext] Static map image successfully generated and uploaded');
                console.log(`[RouteContext] Static map URL: ${staticMapUrl}`);
                console.log(`[RouteContext] Static map public ID: ${staticMapPublicId}`);
            } catch (staticMapError) {
                console.error('[RouteContext] Error generating static map image:', staticMapError);
                console.log('[RouteContext] Continuing save process without static map');
                // Continue with save even if static map generation fails
            }

            // Prepare the base route state with required fields
            const baseRouteState = {
                id: "", // Will be set by backend
                persistentId: currentLoadedPersistentId || "", // Will be set by backend for new routes
                name,
                type,
                isPublic,
                // Convert dayjs object to standard Date if type is 'event'
                eventDate: type === 'event' && eventDate ? eventDate.toDate() : null,
                // Add static map URL if available
                staticMapUrl,
                staticMapPublicId
            };

            // Create a partial update with only changed sections
            const partialUpdate = { ...baseRouteState };

            // Calculate route summary for metadata
            const routeSummary = calculateRouteSummary(routes);
            // console.log('[RouteContext] Calculated route summary for save:', routeSummary);
            partialUpdate.routeSummary = routeSummary;

            // Add map state if it's changed or this is a new route (read from ref)
            if (currentChangedSections.mapState || !currentLoadedPersistentId) {
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

            // Add routes if they've changed or this is a new route (read from ref)
            if (currentChangedSections.routes || !currentLoadedPersistentId) {
                partialUpdate.routes = routes.map(roundRouteCoordinates);
            }

            // Add description if it's changed specifically (read from ref)
            if (currentChangedSections.description && currentLoadedPersistentId) {
                // Find the current route with description
                const routeWithDescription = routes.find(r => r.description);
                if (routeWithDescription) {
                    partialUpdate.description = routeWithDescription.description;
                    // console.log('[RouteContext] Adding description to partial update');
                }
            }

            // Add metadata if it's changed specifically (read from ref)
            if (currentChangedSections.metadata && currentLoadedPersistentId) {
                // We don't need to do anything special here as metadata is already included in the routeSummary
                // console.log('[RouteContext] Metadata changed, but no need to include routes in partial update');
            }

            // ALWAYS include photos in the save payload, regardless of whether they've changed
            // This ensures that when photos are deleted, the updated photos array is always included
            // console.log('[RouteContext] Always including current photos in save data');
            partialUpdate.photos = updatedPhotos;

            // Log detailed information about the photos being saved
            // console.log('[RouteContext] Photos being saved:', {
            //     count: updatedPhotos.length,
            //     photoIds: updatedPhotos.map(p => getPhotoIdentifier(p.url))
            // });

            // Log photo details
            // console.log('[RouteContext] Photos in save payload:', {
            //     count: partialUpdate.photos.length,
            //     photoIds: partialUpdate.photos.map(p => getPhotoIdentifier(p.url)),
            //     totalSizeKB: JSON.stringify(partialUpdate.photos).length / 1024
            // });

            // IMPORTANT FIX: Always include POIs in the save data, not just changed ones
            // This ensures we don't lose existing POIs when saving
            // console.log('[RouteContext] Always including POIs in save data:', {
            //     draggableCount: pois.draggable?.length || 0,
            //     placesCount: pois.places?.length || 0,
            //     totalCount: (pois.draggable?.length || 0) + (pois.places?.length || 0)
            // });
            partialUpdate.pois = pois;

            // IMPORTANT FIX: Always include all lines in the save data, not just changed ones
            // This ensures we don't lose existing lines when adding new ones
            // console.log('[RouteContext] Including lines in save data:', lineData ? lineData.length : 0);
            // if (lineData && lineData.length > 0) {
            //     console.log('[RouteContext] Line data details:', JSON.stringify(lineData));
            // }
            partialUpdate.lines = lineData || [];

            // Mark lines as changed to ensure they're saved (use the setter)
            if (lineData && lineData.length > 0) {
                setChangedSections({ lines: true });
            }

            // Add header settings if they've changed or this is a new route
            if (hasHeaderChanges || !currentLoadedPersistentId) {
                partialUpdate.headerSettings = updatedHeaderSettings;
            }

    // Add map overview if it's changed or this is a new route (read from ref)
    if (currentChangedSections.mapOverview || !currentLoadedPersistentId) {
        // Get map overview data from the shared store
        const mapOverviewData = getMapOverviewData();
        if (mapOverviewData) {
            // console.log('[RouteContext] Including map overview in save data:', mapOverviewData);
            partialUpdate.mapOverview = mapOverviewData;
        }
    }

            // For a new route, we need to include everything
            if (!currentLoadedPersistentId) {
                // console.log('[RouteContext] New route - sending complete data');
                // This is a new route, so we need to send everything
                partialUpdate.routes = routes.map(roundRouteCoordinates);
                partialUpdate.photos = updatedPhotos;
                partialUpdate.pois = pois;
                partialUpdate.headerSettings = updatedHeaderSettings;
            } else {
                // For existing routes, check if we're only updating the map overview (read from ref)
                const isOnlyMapOverviewUpdate =
                    currentChangedSections.mapOverview &&
                    Object.keys(currentChangedSections).length === 1;

                if (isOnlyMapOverviewUpdate && partialUpdate.routes) {
                    // console.log('[RouteContext] Detected map overview only update, removing routes from payload');
                    delete partialUpdate.routes;
                }

                // Check if we're only updating a few fields
                const nonEssentialFields = Object.keys(partialUpdate).filter(
                    k => k !== 'id' && k !== 'persistentId' && k !== 'name' && k !== 'type' && k !== 'isPublic'
                );

                // console.log('[RouteContext] Existing route - sending only changed sections:', nonEssentialFields);

                // If we have routes in the payload but we're only updating a few other fields, remove routes
                if (partialUpdate.routes && nonEssentialFields.length <= 3 && nonEssentialFields.includes('routes')) {
                    // console.log('[RouteContext] Optimizing payload by removing routes data');
                    delete partialUpdate.routes;
                }
            }

            // Log the entire save payload size and structure
            // console.log('[RouteContext] Full save payload details:', {
            //     totalSizeKB: JSON.stringify(partialUpdate).length / 1024,
            //     fields: Object.keys(partialUpdate),
            //     photoCount: partialUpdate.photos ? partialUpdate.photos.length : 0,
            //     routeCount: partialUpdate.routes ? partialUpdate.routes.length : 0,
            //     poiCount: partialUpdate.pois ?
            //         ((partialUpdate.pois.draggable?.length || 0) + (partialUpdate.pois.places?.length || 0)) : 0,
            //     lineCount: partialUpdate.lines ? partialUpdate.lines.length : 0
            // });

            // *** ADDED LOGGING ***
            // if (partialUpdate.photos) {
            //     console.log('[RouteContext] DEBUG: Photos being sent in payload:', JSON.stringify(partialUpdate.photos.map(p => ({ url: p.url, id: getPhotoIdentifier(p.url) })), null, 2));
            // } else {
            //     console.log('[RouteContext] DEBUG: No photos included in save payload.');
            // }
            // *** END ADDED LOGGING ***

            // *** FINAL PAYLOAD LOGGING ***
            // console.log('[RouteContext] DEBUG: Final partialUpdate object being sent:', JSON.stringify(partialUpdate, null, 2));
            // *** END FINAL PAYLOAD LOGGING ***

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
     // Removed 'photos' from dependency array as we now get it fresh inside
    }, [map, routes, photoContext, getPOIsForRoute, places, routeService, handleAuthError, currentLoadedPersistentId, headerSettings, setChangedSections]);
    // Load a saved route
    const loadRoute = useCallback(async (persistentId) => {
        try {
            if (hasUnsavedChanges) {
                console.warn('Unsaved changes will be lost');
            }
            setIsLoading(true);
            clearCurrentWork();
            // console.debug('[RouteContext] Starting to load route:', persistentId);
            const { route } = await routeService.loadRoute(persistentId);
            // console.debug('[RouteContext] Route loaded from DB:', {
            //     persistentId: route.persistentId,
            //     name: route.name,
            //     routeCount: route.routes.length,
            //     hasGeojson: route.routes[0]?.geojson != null
            // });
            setIsLoadedMap(true);
            // setCurrentLoadedState will now also handle setting headerSettings
            setCurrentLoadedState(route); 
            setCurrentLoadedPersistentId(route.persistentId || persistentId);
            setOverallRouteName(route.name || ''); // Initialize overallRouteName

            // Log the persistentId for debugging
            // console.log('[RouteContext] Setting currentLoadedPersistentId:', route.persistentId || persistentId);
            const loadedRoutes = route.routes.map(r => ({
                ...r,
                _type: 'loaded',
                persistentId: route.persistentId, // Ensure persistentId is set on each route
                _loadedState: {
                    ...route,
                    persistentId: route.persistentId || persistentId // Ensure persistentId is set in _loadedState
                }
            }));

            // console.log('[RouteContext] Created loaded routes with persistentId:', route.persistentId || persistentId);
            setRoutes(loadedRoutes);
            if (route.routes[0]) {
                const normalizedRoute = normalizeRoute(route);
                setCurrentRouteWithDebug(normalizedRoute);
            }
            else {
                setCurrentRouteWithDebug(null);
            }

            // No need to update metadata for loaded routes as they should already have it
            // console.log('[RouteContext] Skipping metadata update for loaded routes');
                        // Instead of immediately trying to position the map, store the route bounds for later use
            // console.log('[RouteContext] Preparing route bounds for deferred positioning');

            // Header settings are now handled by setCurrentLoadedState(route) call above.
            // The specific setHeaderSettings logic below can be removed.

            try {
                // Find the middle route to position the map
                if (route.routes && route.routes.length > 0) {
                    // console.log('[RouteContext] Finding middle route for positioning');

                    // Get the number of routes and find the middle one
                    const routeCount = route.routes.length;
                    // console.log(`[RouteContext] Found ${routeCount} routes`);

                    // Log all routes for debugging
                    // route.routes.forEach((r, idx) => {
                    //     console.log(`[RouteContext] Route ${idx}: id=${r.routeId || r.id}, name=${r.name || 'unnamed'}, hasGeojson=${!!r.geojson}`);
                    // });

                    const middleRouteIndex = Math.floor(routeCount / 2);
                    const middleRoute = route.routes[middleRouteIndex];

                    // console.log(`[RouteContext] Using middle route (index ${middleRouteIndex}): ${middleRoute.name || 'unnamed'}`);

                    // Store bounds information for later use
                    if (middleRoute.geojson?.features?.[0]?.geometry?.coordinates?.length > 0) {
                        const coordinates = middleRoute.geojson.features[0].geometry.coordinates;
                        // console.log(`[RouteContext] Found ${coordinates.length} coordinates in route`);

                        // Store the coordinates and other necessary information
                        setPendingRouteBounds({
                            type: 'bounds',
                            coordinates: coordinates,
                            mapStyle: route.mapState?.style,
                            persistentId: route.persistentId || persistentId
                        });

                        // console.log('[RouteContext] Stored route bounds for deferred positioning:', {
                        //     coordinateCount: coordinates.length,
                        //     persistentId: route.persistentId || persistentId
                        // });
                    }
                    // Fallback to first point if we can't fit bounds
                    else if (middleRoute.geojson?.features?.[0]?.geometry?.coordinates?.[0]) {
                        const firstPoint = middleRoute.geojson.features[0].geometry.coordinates[0];

                        if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
                            // console.log('[RouteContext] Using first point of middle route for positioning:', firstPoint);

                            // Store the first point for later use
                            setPendingRouteBounds({
                                type: 'point',
                                point: firstPoint,
                                mapStyle: route.mapState?.style,
                                persistentId: route.persistentId || persistentId
                            });

                            // console.log('[RouteContext] Stored route point for deferred positioning:', {
                            //     point: firstPoint,
                            //     persistentId: route.persistentId || persistentId
                            // });
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
            // Load photos using loadPhotos to replace existing ones
            if (route.photos) {
                // console.debug('[RouteContext] Loading photos using loadPhotos');
                photoContext.loadPhotos(route.photos);
            } else {
                // Ensure photos are cleared if the loaded route has none
                // console.debug('[RouteContext] No photos in loaded route, clearing PhotoContext');
                photoContext.clearPhotos();
            }
            if (route.pois) {
                loadPOIsFromRoute(route.pois);
            }
            if (route.places) {
                for (const place of route.places) {
                    await updatePlace(place.id, place);
                }
            }
            // Check for lines data and load it if available
            if (route.lines) {
                // console.log('[RouteContext] Found lines data in loaded route:',
                //     route.lines ? route.lines.length : 0, 'lines');
                // console.log('[RouteContext] Line data details:', JSON.stringify(route.lines));

                // Store the line data in state for direct access
                setLoadedLineData(route.lines);

                // Also try to use LineContext if available (for backward compatibility)
                if (lineContext) {
                    // console.log('[RouteContext] LineContext is available');

                    if (typeof lineContext.loadLinesFromRoute === 'function') {
                        // console.log('[RouteContext] loadLinesFromRoute function is available');
                        // console.log('[RouteContext] Calling loadLinesFromRoute function from LineContext');
                        lineContext.loadLinesFromRoute(route.lines);
                        // console.log('[RouteContext] loadLinesFromRoute function called successfully');
                    } else {
                        console.error('[RouteContext] loadLinesFromRoute function not available in LineContext');
                        console.error('[RouteContext] Available functions in LineContext:',
                            Object.keys(lineContext).filter(key => typeof lineContext[key] === 'function'));
                    }
                } else {
                    // console.log('[RouteContext] LineContext not available, using direct line data approach instead');
                }
            } else {
                // console.log('[RouteContext] No lines data found in loaded route');
                // Clear any previously loaded line data
                setLoadedLineData([]);
            }

            // Load map overview data if available
            if (route.mapOverview) {
                // console.log('[RouteContext] Loading map overview data:', route.mapOverview);
                // Update the shared store
                setMapOverviewData(route.mapOverview);
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
    }, [routeService, map, photoContext, loadPOIsFromRoute, updatePlace, setCurrentRouteWithDebug, handleAuthError, clearCurrentWork, lineContext]); // Added photoContext, clearCurrentWork, lineContext
    // List saved routes
    const listRoutes = useCallback(async (filters, metadataOnly = true) => {
        try {
            // console.log(`[RouteContext] Listing routes with metadataOnly=${metadataOnly}`);
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

        // console.log('[RouteContext] Route bounds available, queueing positioning operation');

        // Queue the positioning operation using the map operations queue
        queueMapOperation((map) => {
            try {
                // Apply map style if available first
                if (pendingRouteBounds.mapStyle && pendingRouteBounds.mapStyle !== 'default') {
                    // console.log('[RouteContext] Applying map style:', pendingRouteBounds.mapStyle);
                    try {
                        map.setStyle(pendingRouteBounds.mapStyle);
                    } catch (styleError) {
                        console.error('[RouteContext] Error setting map style:', styleError);
                        // Continue with positioning even if style setting fails
                    }
                }

                if (pendingRouteBounds.type === 'bounds') {
                    // console.log('[RouteContext] Positioning using bounds with', pendingRouteBounds.coordinates.length, 'coordinates');

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
                    // console.log('[RouteContext] Successfully fit map to route bounds');
                } else if (pendingRouteBounds.type === 'point') {
                    // console.log('[RouteContext] Positioning using point:', pendingRouteBounds.point);

                    // Zoom to the point
                    map.easeTo({
                        center: [pendingRouteBounds.point[0], pendingRouteBounds.point[1]],
                        zoom: 10, // Zoomed out a bit for context
                        duration: 1500,
                        essential: true
                    });
                    // console.log('[RouteContext] Successfully positioned map to point');
                }

                // Clear the pending bounds after positioning
                setPendingRouteBounds(null);
                // console.log('[RouteContext] Cleared pending route bounds after positioning');
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
                    overallRouteName, // Expose overallRouteName
                    updateOverallRouteName, // Expose its updater
                    hasUnsavedChanges,
                    // Change tracking (expose the setter)
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
                    // Line data
                    loadedLineData,
                    // State Setters (needed for RoutePresentation)
                    setCurrentLoadedState,
                    setCurrentLoadedPersistentId,
                    updateHeaderSettings: (settings) => {
                        // console.log('Updating header settings in RouteContext:', settings);

                        // Create a new blob URL if we have a blob but no URL
                        let newSettings = { ...headerSettings, ...settings };

                        if (newSettings.logoBlob && !newSettings.logoUrl) {
                            // Create a new URL from the blob
                            const blobUrl = URL.createObjectURL(newSettings.logoBlob);
                            // console.log('Created new blob URL for logo:', blobUrl);
                            newSettings.logoUrl = blobUrl;
                        }

                        // console.log('New header settings:', newSettings);
                        setHeaderSettings(newSettings);
                        setHasUnsavedChanges(true);
                        setChangedSections(prev => ({...prev, headerSettings: true}));
                        
                        // Auto-save to Firebase if authenticated
                        try {
                            // Get the current user ID from Auth0
                            const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                            
                            console.log('[RouteContext] Auto-saving header settings to Firebase with userId:', userId);
                            
                            // Call the update function with the autoSave context
                            updateHeaderSettingsInFirebase(newSettings, userId, autoSave)
                                .then(autoSaveId => {
                                    if (autoSaveId) {
                                        console.log('[RouteContext] Header settings auto-saved to Firebase successfully', { autoSaveId });
                                    } else {
                                        console.warn('[RouteContext] Failed to auto-save header settings to Firebase');
                                    }
                                })
                                .catch(error => {
                                    console.error('[RouteContext] Error auto-saving header settings to Firebase:', error);
                                });
                        } catch (autoSaveError) {
                            console.error('[RouteContext] Error during Firebase auto-save:', autoSaveError);
                            // Continue with normal flow even if auto-save fails
                        }
                    },
                    // Expose changedSections and ref for debugging
                    changedSections,
                    changedSectionsRef,
                }, children: children })] }));
};
export const useRouteContext = () => {
    const context = useContext(RouteContext);
    if (!context) {
        throw new Error('useRouteContext must be used within a RouteProvider');
    }
    return context;
};
