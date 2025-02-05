import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  POIContextType, 
  POIType, 
  POIPosition, 
  StoredPOIs,
  DraggablePOI,
  PlaceNamePOI,
  NewPOIInput
} from '../types/poi.types';
import { SavedRouteState } from '../../map/types/route.types';
import API from '../services/poiService';

// Action types
type POIAction =
  | { type: 'ADD_POI'; payload: NewPOIInput }
  | { type: 'REMOVE_POI'; payload: string }
  | { type: 'UPDATE_POI'; payload: { id: string; updates: Partial<Omit<POIType, 'id'>> } }
  | { type: 'UPDATE_POSITION'; payload: { id: string; position: POIPosition } }
  | { type: 'LOAD_POIS'; payload: POIType[] };

// Reducer
const poiReducer = (state: POIType[], action: POIAction): POIType[] => {
  switch (action.type) {
    case 'ADD_POI': {
      const now = new Date().toISOString();
      const base = {
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        ...action.payload,
      };

      if (action.payload.type === 'place') {
        const placePOI: PlaceNamePOI = {
          ...base,
          type: 'place',
          placeId: action.payload.placeId,
        };
        return [...state, placePOI];
      } else {
        const draggablePOI: DraggablePOI = {
          ...base,
          type: 'draggable',
        };
        return [...state, draggablePOI];
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
            updatedAt: new Date().toISOString(),
          };
        } else {
          const draggableUpdates = updates as Partial<Omit<DraggablePOI, 'id'>>;
          return {
            ...poi,
            ...draggableUpdates,
            type: 'draggable',
            updatedAt: new Date().toISOString(),
          };
        }
      });
    case 'UPDATE_POSITION':
      return state.map((poi) => {
        if (poi.id !== action.payload.id) return poi;
        
        if (poi.type === 'place') {
          return {
            ...poi,
            position: action.payload.position,
            updatedAt: new Date().toISOString(),
          } as PlaceNamePOI;
        } else {
          return {
            ...poi,
            position: action.payload.position,
            updatedAt: new Date().toISOString(),
          } as DraggablePOI;
        }
      });
    case 'LOAD_POIS':
      return action.payload;
    default:
      return state;
  }
};

// Context
const POIContext = createContext<POIContextType | null>(null);

// Storage key
const STORAGE_KEY = 'lutruwita2_pois';

// Provider component
export const POIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pois, dispatch] = useReducer(poiReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const poisRef = useRef(pois);

  // Keep ref updated with latest pois
  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  // Load POIs on mount
  useEffect(() => {
    const loadPOIs = async () => {
      try {
        setIsLoading(true);
        // Try to load from API first
        const serverPOIs = await API.getAllPOIs();
        dispatch({ type: 'LOAD_POIS', payload: serverPOIs });
      } catch (error) {
        console.error('Error loading POIs from server:', error);
        setError(error as Error);
        
        // Fall back to localStorage
        try {
          const storedData = localStorage.getItem(STORAGE_KEY);
          if (storedData) {
            const { draggable, places }: StoredPOIs = JSON.parse(storedData);
            dispatch({ type: 'LOAD_POIS', payload: [...draggable, ...places] });
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPOIs();
  }, []);

  // Save POIs to localStorage as backup
  useEffect(() => {
    const savePOIs = () => {
      try {
        const storedData: StoredPOIs = {
          draggable: pois.filter((poi): poi is DraggablePOI => poi.type === 'draggable'),
          places: pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place'),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
      } catch (error) {
        console.error('Error saving POIs to localStorage:', error);
      }
    };

    savePOIs();
  }, [pois]);

  const addPOI = async (poi: NewPOIInput) => {
    try {
      // Optimistically update local state
      dispatch({ type: 'ADD_POI', payload: poi });
      
      // Then save to server
      await API.createPOI(poi);
    } catch (error) {
      console.error('Error saving POI to server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const removePOI = async (id: string) => {
    try {
      // Optimistically update local state
      dispatch({ type: 'REMOVE_POI', payload: id });
      
      // Then remove from server
      await API.deletePOI(id);
    } catch (error) {
      console.error('Error deleting POI from server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const updatePOI = async (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    try {
      // Optimistically update local state
      dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
      
      // Then update server
      await API.updatePOI(id, updates);
    } catch (error) {
      console.error('Error updating POI on server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const updatePOIPosition = async (id: string, position: POIPosition) => {
    try {
      // Optimistically update local state
      dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
      
      // Then update server
      await API.updatePOI(id, { position });
    } catch (error) {
      console.error('Error updating POI position on server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  // Add function to get POIs in route format
  const getPOIsForRoute = (): SavedRouteState['pois'] => {
    console.log('[POI] getPOIsForRoute called, current pois:', pois);
    const result = {
      draggable: pois.filter((poi): poi is DraggablePOI => poi.type === 'draggable'),
      places: pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place')
    };
    console.log('[POI] getPOIsForRoute returning:', result);
    return result;
  };

  // Add function to load POIs from route
  const loadPOIsFromRoute = (routePOIs?: SavedRouteState['pois']) => {
    try {
      // Handle missing POI data
      if (!routePOIs) {
        console.log('[POI] No POI data in route, resetting to empty state');
        dispatch({ type: 'LOAD_POIS', payload: [] });
        return;
      }

      // Validate POI data structure
      if (!Array.isArray(routePOIs.draggable) || !Array.isArray(routePOIs.places)) {
        throw new Error('Invalid POI data structure');
      }

      // Validate individual POIs
      const allPOIs = [...routePOIs.draggable, ...routePOIs.places];
      const validPOIs = allPOIs.filter(poi => {
        return (
          poi &&
          typeof poi === 'object' &&
          'id' in poi &&
          'type' in poi &&
          'position' in poi &&
          typeof poi.position === 'object' &&
          'lat' in poi.position &&
          'lng' in poi.position
        );
      });

      if (validPOIs.length !== allPOIs.length) {
        console.warn('[POI] Some POIs were invalid and filtered out');
      }

      console.log('[POI] Loading POIs from route:', validPOIs);
      dispatch({ type: 'LOAD_POIS', payload: validPOIs });
    } catch (error) {
      console.error('[POI] Error loading POIs from route:', error);
      // Reset to empty state on error
      dispatch({ type: 'LOAD_POIS', payload: [] });
    }
  };

  return (
    <POIContext.Provider
      value={{
        pois,
        isLoading,
        error,
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
