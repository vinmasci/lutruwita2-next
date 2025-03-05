import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useReducer, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Reducer
const poiReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_POI': {
            const now = new Date().toISOString();
            // Generate a temporary ID for frontend state management
            const tempId = `temp-${uuidv4()}`;
            
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
            if (action.payload.poi.type === 'place') {
                result = [...state, {
                    ...base,
                    type: 'place',
                    placeId: action.payload.poi.placeId,
                }];
            }
            else {
                result = [...state, {
                    ...base,
                    type: 'draggable',
                }];
            }
            
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
                    const draggableUpdates = updates;
                    return {
                        ...poi,
                        ...draggableUpdates,
                        type: 'draggable',
                    };
                }
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
    const addPOI = async (poi) => {
        try {
            console.log('[POIContext] Adding POI with coordinates:', {
                coordinates: poi.coordinates,
                coordinatesString: `${poi.coordinates[0].toFixed(6)}, ${poi.coordinates[1].toFixed(6)}`,
                poi
            });
            
            // Add POI to local state only
            dispatch({ type: 'ADD_POI', payload: { poi } });
            
            console.log('[POIContext] POI added to state with ID:', `temp-${uuidv4()}`);
        }
        catch (error) {
            console.error('[POIContext] Error:', error);
            setError(error instanceof Error ? error : new Error('Failed to save POI'));
        }
    };
    const removePOI = (id) => {
        try {
            dispatch({ type: 'REMOVE_POI', payload: id });
        }
        catch (error) {
            console.error('[POIContext] Error removing POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to remove POI'));
        }
    };
    const updatePOI = (id, updates) => {
        try {
            dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
        }
        catch (error) {
            console.error('[POIContext] Error updating POI:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI'));
        }
    };
    const updatePOIPosition = (id, coordinates) => {
        try {
            dispatch({ type: 'UPDATE_POSITION', payload: { id, coordinates } });
        }
        catch (error) {
            console.error('[POIContext] Error updating POI position:', error);
            setError(error instanceof Error ? error : new Error('Failed to update POI position'));
        }
    };
    // Get POIs in route format - memoized to prevent unnecessary recalculations
    const getPOIsForRoute = React.useCallback((_routeId) => {
        // Split POIs by type and validate
        const draggablePois = pois.filter((poi) => {
            if (poi.type !== 'draggable')
                return false;
            // Validate required fields
            if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon) {
                console.warn('[POIContext] Invalid draggable POI:', poi.id);
                return false;
            }
            return true;
        });
        const placePois = pois.filter((poi) => {
            if (poi.type !== 'place')
                return false;
            // Validate required fields
            if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon || !poi.placeId) {
                console.warn('[POIContext] Invalid place POI:', poi.id);
                return false;
            }
            return true;
        });
        return {
            draggable: draggablePois,
            places: placePois
        };
    }, [pois]); // Only recompute when POIs change
    // Load POIs from route
    const loadPOIsFromRoute = (routePOIs) => {
        try {
            if (!routePOIs)
                return;
            // Process new POIs - they should all be full POI objects now
            const newPOIs = [
                ...routePOIs.draggable,
                ...routePOIs.places
            ];
            // Replace existing POIs entirely
            dispatch({ type: 'LOAD_POIS', payload: newPOIs });
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
