import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  POIContextType, 
  POIType, 
  POICoordinates, 
  StoredPOIs,
  DraggablePOI,
  PlaceNamePOI,
  NewPOIInput,
  POIMode
} from '../types/poi.types';
import { SavedRouteState } from '../../map/types/route.types';
// Action types
type POIAction =
  | { type: 'ADD_POI'; payload: { poi: NewPOIInput } }
  | { type: 'REMOVE_POI'; payload: string }
  | { type: 'UPDATE_POI'; payload: { id: string; updates: Partial<Omit<POIType, 'id'>> } }
  | { type: 'UPDATE_POSITION'; payload: { id: string; coordinates: POICoordinates } }
  | { type: 'LOAD_POIS'; payload: POIType[] };

// Reducer
const poiReducer = (state: POIType[], action: POIAction): POIType[] => {
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
          type: 'place' as const,
          placeId: action.payload.poi.placeId,
        }];
      } else {
        return [...state, {
          ...base,
          type: 'draggable' as const,
        }];
      }
    }
    case 'REMOVE_POI':
      return state.filter((poi) => poi.id !== action.payload);
    case 'UPDATE_POI':
      return state.map((poi) => {
        if (poi.id !== action.payload.id) return poi;
        
        const updates = action.payload.updates;
        if (updates.type && updates.type !== poi.type) {
          throw new Error('Cannot change POI type');
        }

        if (poi.type === 'place') {
          const placeUpdates = updates as Partial<Omit<PlaceNamePOI, 'id'>>;
          return {
            ...poi,
            ...placeUpdates,
            type: 'place',
            placeId: placeUpdates.placeId || poi.placeId,
          };
        } else {
          const draggableUpdates = updates as Partial<Omit<DraggablePOI, 'id'>>;
          return {
            ...poi,
            ...draggableUpdates,
            type: 'draggable',
          };
        }
      });
    case 'UPDATE_POSITION':
      return state.map((poi) => 
        poi.id === action.payload.id 
          ? { ...poi, coordinates: action.payload.coordinates }
          : poi
      );
    case 'LOAD_POIS':
      return action.payload;
    default:
      return state;
  }
};

// Context
const POIContext = createContext<POIContextType | null>(null);

// Provider component
export const POIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pois, dispatch] = useReducer(poiReducer, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [poiMode, setPoiMode] = useState<POIMode>('none');

  const addPOI = async (poi: NewPOIInput) => {
    try {
      // Add POI to local state only
      dispatch({ type: 'ADD_POI', payload: { poi } });
    } catch (error) {
      console.error('[POIContext] Error:', error);
      setError(error instanceof Error ? error : new Error('Failed to save POI'));
    }
  };

  const removePOI = (id: string) => {
    try {
      dispatch({ type: 'REMOVE_POI', payload: id });
    } catch (error) {
      console.error('[POIContext] Error removing POI:', error);
      setError(error instanceof Error ? error : new Error('Failed to remove POI'));
    }
  };

  const updatePOI = (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    try {
      dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
    } catch (error) {
      console.error('[POIContext] Error updating POI:', error);
      setError(error instanceof Error ? error : new Error('Failed to update POI'));
    }
  };

  const updatePOIPosition = (id: string, coordinates: POICoordinates) => {
    try {
      dispatch({ type: 'UPDATE_POSITION', payload: { id, coordinates } });
    } catch (error) {
      console.error('[POIContext] Error updating POI position:', error);
      setError(error instanceof Error ? error : new Error('Failed to update POI position'));
    }
  };

  // Get POIs in route format - all POIs are for the current route by default
  const getPOIsForRoute = (_routeId?: string): SavedRouteState['pois'] => {
    
    // Split POIs by type and validate
    const draggablePois = pois.filter((poi): poi is DraggablePOI => {
      if (poi.type !== 'draggable') return false;
      
      // Validate required fields
      if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon) {
        console.warn('[POIContext] Invalid draggable POI:', poi.id);
        return false;
      }
      return true;
    });
    
    const placePois = pois.filter((poi): poi is PlaceNamePOI => {
      if (poi.type !== 'place') return false;
      
      // Validate required fields
      if (!poi.id || !poi.coordinates || !poi.name || !poi.category || !poi.icon || !poi.placeId) {
        console.warn('[POIContext] Invalid place POI:', poi.id);
        return false;
      }
      return true;
    });
    
    const result = {
      draggable: draggablePois,
      places: placePois
    };
    
    return result;
  };

  // Load POIs from route
  const loadPOIsFromRoute = (routePOIs?: SavedRouteState['pois']) => {
    try {
      if (!routePOIs) return;

      // Process new POIs - they should all be full POI objects now
      const newPOIs: POIType[] = [
        ...routePOIs.draggable,
        ...routePOIs.places
      ];

      // Merge with existing POIs, avoiding duplicates
      const mergedPOIs = [...pois];
      newPOIs.forEach(newPoi => {
        const existingIndex = mergedPOIs.findIndex(p => p.id === newPoi.id);
        if (existingIndex === -1) {
          mergedPOIs.push(newPoi);
        } else {
          // Update existing POI with new data while preserving local changes
          mergedPOIs[existingIndex] = {
            ...mergedPOIs[existingIndex],
            ...newPoi,
            // Preserve position if it was locally modified
            coordinates: mergedPOIs[existingIndex].coordinates
          };
        }
      });

      dispatch({ type: 'LOAD_POIS', payload: mergedPOIs });
    } catch (error) {
      console.error('[POIContext] Error loading POIs:', error);
      setError(error instanceof Error ? error : new Error('Failed to load POIs'));
    }
  };

  return (
    <POIContext.Provider
      value={{
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
      }}
    >
      {children}
    </POIContext.Provider>
  );
};

// Custom hook for using POI context
export const usePOIContext = () => {
  const context = useContext(POIContext);
  if (!context) {
    throw new Error('usePOIContext must be used within a POIProvider');
  }
  return context;
};
