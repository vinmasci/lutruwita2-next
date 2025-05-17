import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useReducer, useState, useMemo, useCallback } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import { v4 as uuidv4 } from 'uuid';
import { extractPlaceIdFromUrl, fetchBasicPlaceDetails, searchPlacesByNameAndCoords } from '../services/googlePlacesService';
import { autoSavePOIsToFirebase } from '../../../services/firebasePOIAutoSaveService';
import { useAutoSave } from '../../../context/AutoSaveContext';
import { useAuth0 } from '@auth0/auth0-react';
// Reducer
const poiReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_POI': {
            const now = new Date().toISOString();
            // Use provided tempId if available, otherwise generate a new one
            const tempId = action.payload.tempId || `temp-${uuidv4()}`;

            // console.log('[poiReducer] Adding POI to state:', {
            //     tempId,
            //     coordinates: action.payload.poi.coordinates,
            //     coordinatesString: `${action.payload.poi.coordinates[0].toFixed(6)}, ${action.payload.poi.coordinates[1].toFixed(6)}`
            // });

            const base = {
                ...action.payload.poi,
                id: tempId // Add temporary ID
            };
            
            // Preserve the googlePlaces data and googlePlaceId if they exist
            let result = [...state, {
                ...base,
                type: 'draggable',
                // Keep the googlePlaces property if it exists
                ...(action.payload.poi.googlePlaces && { googlePlaces: action.payload.poi.googlePlaces }),
                // Keep the direct googlePlaceId property if it exists
                ...(action.payload.poi.googlePlaceId && { googlePlaceId: action.payload.poi.googlePlaceId })
            }];

            // console.log('[poiReducer] New state after adding POI:', {
            //     newPoiCount: result.length,
            //     lastAddedPoi: result[result.length - 1]
            // });

            return result;
        }
        case 'REMOVE_POI':
            return state.filter((poi) => poi.id !== action.payload);
        case 'UPDATE_POI':
            return state.map((poi) => {
                if (poi.id !== action.payload.id)
                    return poi;
                const updates = action.payload.updates;
                if (updates.type && updates.type !== poi.type) {
                    throw new Error('Cannot change POI type');
                }
                // Place POI functionality is commented out
                /*
                if (poi.type === 'place') {
                    const placeUpdates = updates;
                    return {
                        ...poi,
                        ...placeUpdates,
                        type: 'place',
                        placeId: placeUpdates.placeId || poi.placeId,
                    };
                }
                else {
                */
                    const draggableUpdates = updates;
                    return {
                        ...poi,
                        ...draggableUpdates,
                        type: 'draggable',
                        // Preserve the googlePlaces property if it exists
                        ...(poi.googlePlaces && { googlePlaces: poi.googlePlaces }),
                        // Preserve the direct googlePlaceId property if it exists
                        ...(poi.googlePlaceId && { googlePlaceId: poi.googlePlaceId })
                    };
                /*
                }
                */
            });
        case 'UPDATE_POSITION':
            return state.map((poi) => {
                if (poi.id !== action.payload.id) return poi;
                
                return {
                    ...poi,
                    coordinates: action.payload.coordinates,
                    // Preserve the googlePlaces property if it exists
                    ...(poi.googlePlaces && { googlePlaces: poi.googlePlaces }),
                    // Preserve the direct googlePlaceId property if it exists
                    ...(poi.googlePlaceId && { googlePlaceId: poi.googlePlaceId })
                };
            });
        case 'LOAD_POIS':
            return action.payload;
        default:
            return state;
    }
};
// Context
const POIContext = createContext(null);
// Create a global registry for contexts if it doesn't exist
if (typeof window !== 'undefined' && !window.__contextRegistry) {
    window.__contextRegistry = {};
}

// Provider component
export const POIProvider = ({ children }) => {
    const [pois, dispatch] = useReducer(poiReducer, []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [poiMode, setPoiMode] = useState('none');
    const [visibleCategories, setVisibleCategories] = useState(Object.keys({}));
    
    // Get access to the Auth0 context for user information
    const { user, isAuthenticated } = useAuth0();
    
    // Get access to the RouteContext to notify it of POI changes
    let routeContext;
    try {
        routeContext = useRouteContext();
    } catch (error) {
        // This is expected when the POIProvider is used outside of a RouteProvider
        routeContext = null;
    }
    
    // Get access to the AutoSaveContext for global auto-save state
    let autoSave;
    try {
        autoSave = useAutoSave();
    } catch (error) {
        // This is expected when the POIProvider is used outside of an AutoSaveProvider
        autoSave = null;
    }
    
    // Track POI changes locally if routeContext is not available
    const [localPOIChanges, setLocalPOIChanges] = useState(false);
    
    // Function to notify RouteContext of POI changes
    const notifyPOIChange = useCallback(() => {
        console.log('[POIContext] notifyPOIChange called, routeContext available:', !!routeContext);
        
        // Always set local changes flag
        setLocalPOIChanges(true);
        
        if (routeContext && routeContext.setChangedSections) {
            console.log('[POIContext] Setting pois flag in changedSections');
            try {
                routeContext.setChangedSections(prev => {
                    const newState = {...prev, pois: true};
                    console.log('[POIContext] New changedSections state:', newState);
                    return newState;
                });
            } catch (error) {
                console.error('[POIContext] Error setting changedSections:', error);
            }
        } else {
            console.warn('[POIContext] routeContext not available or missing setChangedSections, tracking changes locally');
        }
    }, [routeContext]);
    
    // Expose whether there are POI changes
    const hasPOIChanges = useCallback(() => {
        // Check local changes first
        if (localPOIChanges) return true;
        
        // If routeContext is available, check its changedSections
        if (routeContext && routeContext.changedSectionsRef && routeContext.changedSectionsRef.current) {
            return !!routeContext.changedSectionsRef.current.pois;
        }
        
        return false;
    }, [localPOIChanges, routeContext]);
    
    // Clear POI changes
    const clearPOIChanges = useCallback(() => {
        setLocalPOIChanges(false);
        
        // Also clear in routeContext if available
        if (routeContext && routeContext.setChangedSections) {
            routeContext.setChangedSections(prev => {
                const newState = {...prev};
                delete newState.pois;
                return newState;
            });
        }
    }, [routeContext]);
    // Search for places by name and coordinates
    const searchPlaces = async (name, coordinates) => {
        if (!name || !coordinates) {
            console.warn('[POIContext] Invalid parameters for place search');
            return [];
        }

        try {
            console.log('[POIContext] Searching for places with name:', name);
            const results = await searchPlacesByNameAndCoords(name, coordinates);
            return results;
        } catch (error) {
            console.error('[POIContext] Error searching for places:', error);
            return [];
        }
    };

    // Process Google Places link to get place ID
    const processGooglePlacesLink = async (link) => {
        if (!link) return null;

        try {
            // console.log('[POIContext] Processing Google Places link:', link);

            // Extract place ID from the link
            const placeId = await extractPlaceIdFromUrl(link);
            if (!placeId) {
                // console.log('[POIContext] Could not extract place ID from link');
                return null;
            }

            // console.log('[POIContext] Extracted place ID:', placeId);

            // Fetch place details just to get the name for the POI
            const placeDetails = await fetchBasicPlaceDetails(placeId);
            if (!placeDetails) {
                // console.log('[POIContext] Could not fetch place details');
                return null;
            }

            // console.log('[POIContext] Fetched place details for name:', placeDetails.name);

            // Return all place details for preview in the POI Details Drawer
            // but keep the placeId and url for fetching fresh details in presentation mode
            return {
                placeId,
                url: link,
                name: placeDetails.name,
                // Include all other details for preview
                address: placeDetails.address,
                phoneNumber: placeDetails.phoneNumber,
                website: placeDetails.website,
                rating: placeDetails.rating,
                openingHours: placeDetails.openingHours,
                // We don't need to include photos here as they're fetched separately
                // and would make the POI object unnecessarily large
            };
        } catch (error) {
            console.error('[POIContext] Error processing Google Places link:', error);
            return null;
        }
    };

    const addPOI = async (poi) => {
        try {
            console.log('[POIContext] Adding POI with coordinates:', {
                coordinates: poi.coordinates,
                coordinatesString: `${poi.coordinates[0].toFixed(6)}, ${poi.coordinates[1].toFixed(6)}`,
                poi
            });

            // Generate a temporary ID for logging consistency
            const tempId = `temp-${uuidv4()}`;

            // Process Google Places link if provided
            let googlePlaces = null;
            if (poi.googlePlacesLink) {
                // console.log('[POIContext] POI has Google Places link, processing...');
                googlePlaces = await processGooglePlacesLink(poi.googlePlacesLink);

                // If we got Google Places data and the POI doesn't have a name, use the place name
                if (googlePlaces && !poi.name && googlePlaces.name) {
                    poi.name = googlePlaces.name;
                }
            }

            // Add direct googlePlaceId and googlePlaceUrl properties if available
            let poiWithGooglePlaces = { ...poi };
            if (googlePlaces && googlePlaces.placeId) {
                // console.log('[POIContext] Adding direct googlePlaceId and googlePlaceUrl properties');
                poiWithGooglePlaces.googlePlaceId = googlePlaces.placeId;
                poiWithGooglePlaces.googlePlaceUrl = googlePlaces.url;
            }

            // Make sure the POI has all required fields
            const completePoiData = {
                ...poiWithGooglePlaces,
                googlePlaces,
                // Ensure required fields are present
                type: 'draggable', // Explicitly set type
                category: poiWithGooglePlaces.category || 'default', // Ensure category exists
                icon: poiWithGooglePlaces.icon || 'default-icon', // Ensure icon exists
                name: poiWithGooglePlaces.name || 'Unnamed POI' // Ensure name exists
            };
            
            console.log('[POIContext] Complete POI data being added to state:', completePoiData);
            
            // Add POI to local state with Google Places data if available
            dispatch({
                type: 'ADD_POI',
                payload: {
                    poi: completePoiData,
                    tempId
                }
            });

            // Notify RouteContext of POI changes
            // console.log('[POIContext] Notifying RouteContext of POI changes (add)');
            notifyPOIChange();

    // Auto-save POIs to Firebase
    try {
        // Check if we're in presentation mode by looking at the URL
        const isPresentationMode = window.location.pathname.includes('/presentation/') || 
                                  window.location.pathname.includes('/preview/') ||
                                  window.location.pathname.includes('/route/');
        
        // Skip auto-save if in presentation mode
        if (isPresentationMode) {
            console.log('[POIContext] Skipping auto-save - in presentation mode');
            return;
        }
        
        // Get the current route from RouteContext
        const currentRoute = routeContext?.currentRoute;
        const currentLoadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
        
        // Skip auto-save if no route is available AND no permanent route is loaded
        if (!currentRoute && !currentLoadedPermanentRouteId) {
            console.log('[POIContext] Skipping auto-save - no current route and no permanent route loaded');
            return;
        }
        
        // Get the current user ID from Auth0 context
        const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
        
        console.log('[POIContext] Auto-saving POIs to Firebase after adding POI');
        console.log('[POIContext] Current route available:', !!currentRoute);
        
        // Start auto-save in the global context if available
        if (autoSave) {
            autoSave.startAutoSave();
        }
                
                // CRITICAL FIX: Instead of using getPOIsForRoute which uses the state that might not be updated yet,
                // create a POI structure directly with all existing POIs plus the newly added POI
                const allPOIs = {
                    draggable: [
                        ...pois.map(poi => ({
                            ...poi,
                            // Ensure required fields are present
                            type: poi.type || 'draggable',
                            category: poi.category || 'default',
                            icon: poi.icon || 'default-icon',
                            name: poi.name || 'Unnamed POI'
                        })),
                        completePoiData // Include the POI we just added
                    ]
                };
                
                console.log('[POIContext] About to call autoSavePOIsToFirebase with DIRECT POI DATA:', {
                    poiCount: allPOIs.draggable.length,
                    hasCurrentRoute: !!currentRoute,
                    userId,
                    hasAutoSave: !!autoSave,
                    autoSaveId: autoSave?.autoSaveId,
                    firstPOI: allPOIs.draggable[0]
                });
                
                // Call the auto-save function - pass null for processedRoute if not available
                // Also pass the autoSave context and loadedPermanentRouteId
                // currentLoadedPermanentRouteId is already defined above
                const autoSaveId = await autoSavePOIsToFirebase(allPOIs, currentRoute || null, userId, autoSave, currentLoadedPermanentRouteId);
                
                console.log('[POIContext] autoSavePOIsToFirebase returned autoSaveId:', autoSaveId);
                
                // Update the global context with the successful auto-save if needed
                if (autoSave && autoSaveId && !autoSave.autoSaveId) {
                    const routeId = currentRoute ? currentRoute.routeId : null;
                    autoSave.completeAutoSave(autoSaveId, routeId);
                }
            } catch (autoSaveError) {
                console.error('[POIContext] Error auto-saving POIs to Firebase:', autoSaveError);
                
                // Update the global context with the error if available
                if (autoSave) {
                    autoSave.setAutoSaveError(autoSaveError);
                }
                
                // Continue with normal flow even if auto-save fails
            }

            // console.log('[POIContext] POI added to state with ID:', tempId);
        }
        catch (error) {
            console.error('[POIContext] Error:', error);
            setError(error instanceof Error ? error : new Error('Failed to save POI'));
        }
    };
    const removePOI = async (id) => {
        try {
            // console.log('[POIContext] Removing POI with ID:', id);

            dispatch({ type: 'REMOVE_POI', payload: id });

            // Notify RouteContext of POI changes
            // console.log('[POIContext] Notifying RouteContext of POI changes (remove)');
            notifyPOIChange();

            // Auto-save POIs to Firebase
            try {
                // Get the current route from RouteContext
                const currentRoute = routeContext?.currentRoute;
                
                // Get the current user ID from Auth0 context
                const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                
                console.log('[POIContext] Auto-saving POIs to Firebase after removing POI');
                console.log('[POIContext] Current route available:', !!currentRoute);
                
                // Start auto-save in the global context if available
                if (autoSave) {
                    autoSave.startAutoSave();
                }
                
                // CRITICAL FIX: Create a POI structure directly with the updated POIs
                // Filter out the removed POI from the current state
                const updatedPois = pois.filter(p => p.id !== id);
                
                // Create a POI structure with the updated POIs
                const allPOIs = {
                    draggable: updatedPois.map(poi => ({
                        ...poi,
                        // Ensure required fields are present
                        type: poi.type || 'draggable',
                        category: poi.category || 'default',
                        icon: poi.icon || 'default-icon',
                        name: poi.name || 'Unnamed POI'
                    }))
                };
                
                console.log('[POIContext] About to call autoSavePOIsToFirebase with DIRECT POI DATA after removal:', {
                    poiCount: allPOIs.draggable.length,
                    hasCurrentRoute: !!currentRoute,
                    userId,
                    hasAutoSave: !!autoSave,
                    autoSaveId: autoSave?.autoSaveId
                });
                
                // Call the auto-save function - pass null for processedRoute if not available
                // Also pass the autoSave context and loadedPermanentRouteId
                // currentLoadedPermanentRouteId is already defined above
                const autoSaveId = await autoSavePOIsToFirebase(allPOIs, currentRoute || null, userId, autoSave, currentLoadedPermanentRouteId);
                
                // Update the global context with the successful auto-save if needed
                if (autoSave && autoSaveId && !autoSave.autoSaveId) {
                    const routeId = currentRoute ? currentRoute.routeId : null;
                    autoSave.completeAutoSave(autoSaveId, routeId);
                }
            } catch (autoSaveError) {
                console.error('[POIContext] Error auto-saving POIs to Firebase:', autoSaveError);
                
                // Update the global context with the error if available
                if (autoSave) {
                    autoSave.setAutoSaveError(autoSaveError);
                }
                
                // Continue with normal flow even if auto-save fails
            }

            // console.log('[POIContext] POI removed successfully');
        }
        catch (error) {
            console.error('[POIContext] Error removing POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to remove POI'));
        }
    };
    const updatePOI = async (id, updates) => {
        try {
            // Check if the updates include a Google Places link
            let updatedData = { ...updates };

            if (updates.googlePlacesLink) {
                // console.log('[POIContext] POI update includes Google Places link, processing...');
                const googlePlaces = await processGooglePlacesLink(updates.googlePlacesLink);

                if (googlePlaces) {
                    // If we got Google Places data and the POI doesn't have a name or is using the default name,
                    // use the place name
                    if ((!updates.name || updates.name === '') && googlePlaces.name) {
                        updatedData.name = googlePlaces.name;
                    }
                    
                    // Add the Google Places data to the updates
                    updatedData.googlePlaces = googlePlaces;
                    
                    // Add direct googlePlaceId and googlePlaceUrl properties
                    if (googlePlaces.placeId) {
                        // console.log('[POIContext] Adding direct googlePlaceId and googlePlaceUrl properties to update');
                        updatedData.googlePlaceId = googlePlaces.placeId;
                        updatedData.googlePlaceUrl = googlePlaces.url;
                    }
                }
            }
            
            dispatch({ type: 'UPDATE_POI', payload: { id, updates: updatedData } });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();
            
            // Auto-save POIs to Firebase
            try {
                // Get the current route from RouteContext
                const currentRoute = routeContext?.currentRoute;
                
                // Get the current user ID from Auth0 context
                const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                
                console.log('[POIContext] Auto-saving POIs to Firebase after updating POI');
                console.log('[POIContext] Current route available:', !!currentRoute);
                
                // Start auto-save in the global context if available
                if (autoSave) {
                    autoSave.startAutoSave();
                }
                
                // CRITICAL FIX: Create a POI structure directly with the updated POIs
                // Map the current state to include the updated POI
                const updatedPois = pois.map(poi => {
                    if (poi.id === id) {
                        return {
                            ...poi,
                            ...updatedData,
                            // Ensure required fields are present
                            type: 'draggable',
                            category: updatedData.category || poi.category || 'default',
                            icon: updatedData.icon || poi.icon || 'default-icon',
                            name: updatedData.name || poi.name || 'Unnamed POI'
                        };
                    }
                    return poi;
                });
                
                // Create a POI structure with the updated POIs
                const allPOIs = {
                    draggable: updatedPois
                };
                
                console.log('[POIContext] About to call autoSavePOIsToFirebase with DIRECT POI DATA after update:', {
                    poiCount: allPOIs.draggable.length,
                    hasCurrentRoute: !!currentRoute,
                    userId,
                    hasAutoSave: !!autoSave,
                    autoSaveId: autoSave?.autoSaveId,
                    updatedPOI: updatedPois.find(p => p.id === id)
                });
                
                // Call the auto-save function - pass null for processedRoute if not available
                // Also pass the autoSave context and loadedPermanentRouteId
                // currentLoadedPermanentRouteId is already defined above
                const autoSaveId = await autoSavePOIsToFirebase(allPOIs, currentRoute || null, userId, autoSave, currentLoadedPermanentRouteId);
                
                // Update the global context with the successful auto-save if needed
                if (autoSave && autoSaveId && !autoSave.autoSaveId) {
                    const routeId = currentRoute ? currentRoute.routeId : null;
                    autoSave.completeAutoSave(autoSaveId, routeId);
                }
            } catch (autoSaveError) {
                console.error('[POIContext] Error auto-saving POIs to Firebase:', autoSaveError);
                
                // Update the global context with the error if available
                if (autoSave) {
                    autoSave.setAutoSaveError(autoSaveError);
                }
                
                // Continue with normal flow even if auto-save fails
            }
        }
        catch (error) {
            console.error('[POIContext] Error updating POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI'));
        }
    };
    const updatePOIPosition = async (id, coordinates) => {
        try {
            dispatch({ type: 'UPDATE_POSITION', payload: { id, coordinates } });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();
            
            // Auto-save POIs to Firebase
            try {
                // Get the current route from RouteContext
                const currentRoute = routeContext?.currentRoute;
                
                // Get the current user ID from Auth0 context
                const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                
                console.log('[POIContext] Auto-saving POIs to Firebase after updating POI position');
                console.log('[POIContext] Current route available:', !!currentRoute);
                
                // Start auto-save in the global context if available
                if (autoSave) {
                    autoSave.startAutoSave();
                }
                
                // CRITICAL FIX: Create a POI structure directly with the updated POIs
                // Map the current state to include the updated POI position
                const updatedPois = pois.map(poi => {
                    if (poi.id === id) {
                        return {
                            ...poi,
                            coordinates,
                            // Ensure required fields are present
                            type: poi.type || 'draggable',
                            category: poi.category || 'default',
                            icon: poi.icon || 'default-icon',
                            name: poi.name || 'Unnamed POI'
                        };
                    }
                    return poi;
                });
                
                // Create a POI structure with the updated POIs
                const allPOIs = {
                    draggable: updatedPois
                };
                
                console.log('[POIContext] About to call autoSavePOIsToFirebase with DIRECT POI DATA after position update:', {
                    poiCount: allPOIs.draggable.length,
                    hasCurrentRoute: !!currentRoute,
                    userId,
                    hasAutoSave: !!autoSave,
                    autoSaveId: autoSave?.autoSaveId,
                    updatedPOI: updatedPois.find(p => p.id === id)
                });
                
                // Call the auto-save function - pass null for processedRoute if not available
                // Also pass the autoSave context and loadedPermanentRouteId
                // currentLoadedPermanentRouteId is already defined above
                const autoSaveId = await autoSavePOIsToFirebase(allPOIs, currentRoute || null, userId, autoSave, currentLoadedPermanentRouteId);
                
                // Update the global context with the successful auto-save if needed
                if (autoSave && autoSaveId && !autoSave.autoSaveId) {
                    const routeId = currentRoute ? currentRoute.routeId : null;
                    autoSave.completeAutoSave(autoSaveId, routeId);
                }
            } catch (autoSaveError) {
                console.error('[POIContext] Error auto-saving POIs to Firebase:', autoSaveError);
                
                // Update the global context with the error if available
                if (autoSave) {
                    autoSave.setAutoSaveError(autoSaveError);
                }
                
                // Continue with normal flow even if auto-save fails
            }
        }
        catch (error) {
            console.error('[POIContext] Error updating POI position:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI position'));
        }
    };
    // Get POIs in route format - memoized to prevent unnecessary recalculations
    const getPOIsForRoute = React.useCallback((_routeId) => {
        console.log('[POIContext] getPOIsForRoute called, total POIs:', pois.length);
        
        // Log all POIs for debugging
        console.log('[POIContext] All POIs:', pois.map(p => ({
            id: p.id,
            type: p.type,
            name: p.name,
            category: p.category,
            coordinates: p.coordinates
        })));

        // Log POIs with Google Places data
        const poisWithGooglePlaces = pois.filter(poi => poi.googlePlaces);
        console.log('[POIContext] POIs with Google Places data:', poisWithGooglePlaces.length);
        if (poisWithGooglePlaces.length > 0) {
            console.log('[POIContext] First POI with Google Places data:', {
                id: poisWithGooglePlaces[0].id,
                name: poisWithGooglePlaces[0].name,
                googlePlaces: poisWithGooglePlaces[0].googlePlaces
            });
        }

        // Split POIs by type and validate
        const draggablePois = pois.filter((poi) => {
            // Log each POI for debugging
            console.log('[POIContext] Validating POI:', {
                id: poi.id,
                type: poi.type || 'undefined',
                hasCoordinates: !!poi.coordinates,
                hasName: !!poi.name,
                hasCategory: !!poi.category,
                hasIcon: !!poi.icon
            });
            
            // Check if type is missing and default to 'draggable'
            if (!poi.type) {
                console.warn('[POIContext] POI missing type, defaulting to draggable:', poi.id);
                poi.type = 'draggable';
            }
            
            if (poi.type !== 'draggable')
                return false;
                
            // Validate required fields
            if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon) {
                console.warn('[POIContext] Invalid draggable POI:', poi.id, {
                    missingId: !poi.id,
                    missingCoordinates: !poi.coordinates,
                    missingName: !poi.name,
                    missingCategory: !poi.category,
                    missingIcon: !poi.icon
                });
                return false;
            }
            return true;
        }).map(poi => {
            // Create a copy of the POI to avoid modifying the original
            const poiCopy = { ...poi };
            
            // If the POI has Google Places data, only keep the placeId and url
            if (poiCopy.googlePlaces) {
                // console.log('[POIContext] Processing Google Places data for POI:', poiCopy.id);
                // console.log('[POIContext] Original Google Places data:', poiCopy.googlePlaces);

                poiCopy.googlePlaces = {
                    placeId: poiCopy.googlePlaces.placeId,
                    url: poiCopy.googlePlaces.url
                };

                // console.log('[POIContext] Simplified Google Places data for MongoDB:', poiCopy.googlePlaces);
            }

            // Ensure the direct googlePlaceId property is preserved
            if (poi.googlePlaceId) {
                // console.log('[POIContext] Preserving direct googlePlaceId for POI:', poiCopy.id);
                poiCopy.googlePlaceId = poi.googlePlaceId;
            }

            return poiCopy;
        });

        // Log the final POIs that will be saved to MongoDB
        console.log('[POIContext] Final draggable POIs for MongoDB:', draggablePois.length);
        if (draggablePois.length > 0) {
            console.log('[POIContext] First draggable POI:', draggablePois[0]);
            
            const poisWithGooglePlaces = draggablePois.filter(poi => poi.googlePlaces);
            console.log('[POIContext] Final POIs with Google Places data:', poisWithGooglePlaces.length);
            if (poisWithGooglePlaces.length > 0) {
                console.log('[POIContext] Example POI with Google Places data for MongoDB:', {
                    id: poisWithGooglePlaces[0].id,
                    name: poisWithGooglePlaces[0].name,
                    googlePlaces: poisWithGooglePlaces[0].googlePlaces
                });
            }
        }

        // Place POI functionality is commented out
        /*
        const placePois = pois.filter((poi) => {
            if (poi.type !== 'place')
                return false;
            // Validate required fields
            if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon || !poi.placeId) {
                // console.warn('[POIContext] Invalid place POI:', poi.id);
                return false;
            }
            return true;
        });
        */
        
        const result = {
            draggable: draggablePois
        };
        
        console.log('[POIContext] Final POI data structure being returned:', {
            draggableCount: result.draggable.length,
            firstPOI: result.draggable.length > 0 ? {
                id: result.draggable[0].id,
                type: result.draggable[0].type,
                coordinates: result.draggable[0].coordinates
            } : null
        });
        
        // Extra validation to ensure we're returning a valid object
        console.log('[POIContext] FINAL RESULT VALIDATION:');
        console.log('- result is object:', typeof result === 'object');
        console.log('- result.draggable exists:', !!result.draggable);
        console.log('- result.draggable is array:', Array.isArray(result.draggable));
        console.log('- result.draggable length:', result.draggable.length);
        console.log('- Full result object:', JSON.stringify(result));
        
        return result;
    }, [pois]); // Only recompute when POIs change
    // Load POIs from route
    const loadPOIsFromRoute = (routePOIs) => {
        try {
            if (!routePOIs) {
                // console.log('[POIContext] No POIs to load from route');
                return;
            }

            // console.log('[POIContext] Loading POIs from route:', {
            //     draggableCount: routePOIs.draggable?.length || 0,
            //     placesCount: routePOIs.places?.length || 0
            // });

            // Process new POIs - they should all be full POI objects now
            let newPOIs = [];
            if (Array.isArray(routePOIs)) {
                // If routePOIs is already an array (new Firebase structure)
                newPOIs = [...routePOIs];
            } else if (routePOIs && routePOIs.draggable) {
                // If routePOIs is an object with a draggable property (old MongoDB-like structure)
                newPOIs = [...(routePOIs.draggable || [])];
            }

            // console.log('[POIContext] Total POIs to load:', newPOIs.length);

            // Ensure all place POIs have proper placeId set
            // Place POI functionality is commented out
            /*
            const processedPOIs = newPOIs.map(poi => {
                // If it's a place POI but doesn't have a placeId, try to generate one
                if (poi.type === 'place' && !poi.placeId && poi.coordinates) {
                    // Use coordinates as a fallback placeId
                    const placeId = `${poi.coordinates[0]},${poi.coordinates[1]}`;
                    console.log(`[POIContext] Adding missing placeId to place POI: ${placeId}`);
                    return {
                        ...poi,
                        placeId
                    };
                }
                return poi;
            });
            */
            
            // Replace existing POIs entirely
            dispatch({ type: 'LOAD_POIS', payload: newPOIs });

            // console.log('[POIContext] POIs loaded successfully');

            // Don't notify RouteContext when loading POIs from route
            // as this is not a user-initiated change
        }
        catch (error) {
            console.error('[POIContext] Error loading POIs:', error);
            setError(error instanceof Error ? error : new Error('Failed to load POIs'));
        }
    };
    
    // Define clearPOIs function
    const clearPOIs = useCallback(() => {
        try {
            console.log('[POIContext] Clearing all POIs');
            // Clear all POIs by loading an empty array
            dispatch({ type: 'LOAD_POIS', payload: [] });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();

            console.log('[POIContext] All POIs cleared successfully');
            return true;
        }
        catch (error) {
            console.error('[POIContext] Error clearing POIs:', error);
            setError(error instanceof Error ? error : new Error('Failed to clear POIs'));
            return false;
        }
    }, [notifyPOIChange]);
    
    // Register the clearPOIs function with the global registry
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Create a context instance with the clearPOIs function
            const contextInstance = { clearPOIs };
            
            // Register the context instance
            window.__contextRegistry = window.__contextRegistry || {};
            window.__contextRegistry.POIContext = contextInstance;
            
            console.log('[POIContext] Registered clearPOIs function with global registry');
            
            // Clean up when unmounted
            return () => {
                if (window.__contextRegistry && window.__contextRegistry.POIContext) {
                    delete window.__contextRegistry.POIContext;
                    console.log('[POIContext] Unregistered from global registry');
                }
            };
        }
    }, [clearPOIs]);
    // Initialize visible categories with all categories when POIs are loaded
    useEffect(() => {
        if (pois.length > 0) {
            // Get unique categories from POIs
            const categories = [...new Set(pois.map(poi => poi.category))];
            setVisibleCategories(categories);
        }
    }, [pois]);

    // Toggle category visibility
    const toggleCategoryVisibility = (category) => {
        setVisibleCategories(prev => {
            if (prev.includes(category)) {
                return prev.filter(cat => cat !== category);
            } else {
                return [...prev, category];
            }
        });
    };

    // Get visible POIs based on category filters
    const getVisiblePOIs = useMemo(() => {
        return pois.filter(poi => visibleCategories.includes(poi.category));
    }, [pois, visibleCategories]);

    return (_jsx(POIContext.Provider, { value: {
            pois,
            isLoading,
            error,
            poiMode,
            setPoiMode,
            addPOI,
            removePOI,
            updatePOI,
            updatePOIPosition,
            getPOIsForRoute,
            loadPOIsFromRoute,
            clearPOIs,
            visibleCategories,
            setVisibleCategories,
            toggleCategoryVisibility,
            getVisiblePOIs,
            processGooglePlacesLink, // Expose the function to process Google Places links
            searchPlaces, // Expose the function to search for places
            // Explicitly expose change tracking functions
            hasPOIChanges,
            clearPOIChanges,
            localPOIChanges
        }, children: children }));
};
// Custom hook for using POI context
export const usePOIContext = () => {
    const context = useContext(POIContext);
    if (!context) {
        throw new Error('usePOIContext must be used within a POIProvider');
    }
    return context;
};
