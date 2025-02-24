import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useReducer, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Reducer
const poiReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_POI': {
            const now = new Date().toISOString();
            // Generate a temporary ID for frontend state management
            const tempId = `temp-${uuidv4()}`;
            const base = {
                ...action.payload.poi,
                id: tempId // Add temporary ID
            };
            if (action.payload.poi.type === 'place') {
                return [...state, {
                        ...base,
                        type: 'place',
                        placeId: action.payload.poi.placeId,
                    }];
            }
            else {
                return [...state, {
                        ...base,
                        type: 'draggable',
                    }];
            }
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
    const addPOI = async (poi) => {
        try {
            // Add POI to local state only
            dispatch({ type: 'ADD_POI', payload: { poi } });
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
