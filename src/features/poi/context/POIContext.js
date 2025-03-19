import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useReducer, useState, useMemo, useCallback } from 'react';
import { useRouteContext } from '../../map/context/RouteContext';
import { v4 as uuidv4 } from 'uuid';
// Reducer
const poiReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_POI': {
            const now = new Date().toISOString();
            // Use provided tempId if available, otherwise generate a new one
            const tempId = action.payload.tempId || `temp-${uuidv4()}`;
            
            console.log('[poiReducer] Adding POI to state:', {
                tempId,
                coordinates: action.payload.poi.coordinates,
                coordinatesString: `${action.payload.poi.coordinates[0].toFixed(6)}, ${action.payload.poi.coordinates[1].toFixed(6)}`
            });
            
            const base = {
                ...action.payload.poi,
                id: tempId // Add temporary ID
            };
            
            let result;
            // Place POI functionality is commented out
            /*
            if (action.payload.poi.type === 'place') {
                result = [...state, {
                    ...base,
                    type: 'place',
                    placeId: action.payload.poi.placeId,
                }];
            }
            else {
            */
                result = [...state, {
                    ...base,
                    type: 'draggable',
                }];
            /*
            }
            */
            
            console.log('[poiReducer] New state after adding POI:', {
                newPoiCount: result.length,
                lastAddedPoi: result[result.length - 1]
            });
            
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
                    };
                /*
                }
                */
            });
        case 'UPDATE_POSITION':
            return state.map((poi) => poi.id === action.payload.id
                ? { ...poi, coordinates: action.payload.coordinates }
                : poi);
        case 'LOAD_POIS':
            return action.payload;
        default:
            return state;
    }
};
// Context
const POIContext = createContext(null);
// Provider component
export const POIProvider = ({ children }) => {
    const [pois, dispatch] = useReducer(poiReducer, []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [poiMode, setPoiMode] = useState('none');
    const [visibleCategories, setVisibleCategories] = useState(Object.keys({}));
    
    // Get access to the RouteContext to notify it of POI changes
    let routeContext;
    try {
        routeContext = useRouteContext();
    } catch (error) {
        // This is expected when the POIProvider is used outside of a RouteProvider
        routeContext = null;
    }
    
    // Function to notify RouteContext of POI changes
    const notifyPOIChange = useCallback(() => {
        if (routeContext) {
            routeContext.setChangedSections(prev => ({...prev, pois: true}));
        }
    }, [routeContext]);
    const addPOI = async (poi) => {
        try {
            console.log('[POIContext] Adding POI with coordinates:', {
                coordinates: poi.coordinates,
                coordinatesString: `${poi.coordinates[0].toFixed(6)}, ${poi.coordinates[1].toFixed(6)}`,
                poi
            });
            
            // Generate a temporary ID for logging consistency
            const tempId = `temp-${uuidv4()}`;
            
            // Add POI to local state only
            dispatch({ type: 'ADD_POI', payload: { poi, tempId } });
            
            // Notify RouteContext of POI changes
            console.log('[POIContext] Notifying RouteContext of POI changes (add)');
            notifyPOIChange();
            
            console.log('[POIContext] POI added to state with ID:', tempId);
        }
        catch (error) {
            console.error('[POIContext] Error:', error);
            setError(error instanceof Error ? error : new Error('Failed to save POI'));
        }
    };
    const removePOI = (id) => {
        try {
            console.log('[POIContext] Removing POI with ID:', id);
            
            dispatch({ type: 'REMOVE_POI', payload: id });
            
            // Notify RouteContext of POI changes
            console.log('[POIContext] Notifying RouteContext of POI changes (remove)');
            notifyPOIChange();
            
            console.log('[POIContext] POI removed successfully');
        }
        catch (error) {
            console.error('[POIContext] Error removing POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to remove POI'));
        }
    };
    const updatePOI = (id, updates) => {
        try {
            dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();
        }
        catch (error) {
            console.error('[POIContext] Error updating POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI'));
        }
    };
    const updatePOIPosition = (id, coordinates) => {
        try {
            dispatch({ type: 'UPDATE_POSITION', payload: { id, coordinates } });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();
        }
        catch (error) {
            console.error('[POIContext] Error updating POI position:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI position'));
        }
    };
    // Get POIs in route format - memoized to prevent unnecessary recalculations
    const getPOIsForRoute = React.useCallback((_routeId) => {
        // Removed console logs to prevent excessive output
        
        // Split POIs by type and validate
        const draggablePois = pois.filter((poi) => {
            if (poi.type !== 'draggable')
                return false;
            // Validate required fields
            if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon) {
                // console.warn('[POIContext] Invalid draggable POI:', poi.id);
                return false;
            }
            return true;
        });
        
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
            draggable: draggablePois,
            places: [] // Empty array since place POIs are disabled
        };
        
        return result;
    }, [pois]); // Only recompute when POIs change
    // Load POIs from route
    const loadPOIsFromRoute = (routePOIs) => {
        try {
            if (!routePOIs) {
                console.log('[POIContext] No POIs to load from route');
                return;
            }
            
            console.log('[POIContext] Loading POIs from route:', {
                draggableCount: routePOIs.draggable?.length || 0,
                placesCount: routePOIs.places?.length || 0
            });
            
            // Process new POIs - they should all be full POI objects now
            // Place POI functionality is commented out
            const newPOIs = [
                ...(routePOIs.draggable || [])
                // ...(routePOIs.places || []) // Place POIs are disabled
            ];
            
            console.log('[POIContext] Total POIs to load:', newPOIs.length);
            
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
            
            console.log('[POIContext] POIs loaded successfully');
            
            // Don't notify RouteContext when loading POIs from route
            // as this is not a user-initiated change
        }
        catch (error) {
            console.error('[POIContext] Error loading POIs:', error);
            setError(error instanceof Error ? error : new Error('Failed to load POIs'));
        }
    };
    
    const clearPOIs = () => {
        try {
            // Clear all POIs by loading an empty array
            dispatch({ type: 'LOAD_POIS', payload: [] });
            
            // Notify RouteContext of POI changes
            notifyPOIChange();
            
            console.log('[POIContext] All POIs cleared');
        }
        catch (error) {
            console.error('[POIContext] Error clearing POIs:', error);
            setError(error instanceof Error ? error : new Error('Failed to clear POIs'));
        }
    };
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
            getVisiblePOIs
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
