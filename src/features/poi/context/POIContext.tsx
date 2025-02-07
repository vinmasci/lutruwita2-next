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
import { usePOIService } from '../services/poiService';

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
      return state.map((poi) => {
        if (poi.id !== action.payload.id) return poi;
        
        if (poi.type === 'place') {
          return {
            ...poi,
            position: action.payload.position,
          } as PlaceNamePOI;
        } else {
          return {
            ...poi,
            position: action.payload.position,
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
  const poiService = usePOIService();

  // Keep ref updated with latest pois
  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  // Load POIs on mount
  useEffect(() => {
    const loadPOIs = async () => {
      if (!poiService) {
        console.log('POI service not initialized yet');
        return;
      }

      // Check if we already have POIs loaded
      if (pois.length > 0) {
        console.log('POIs already loaded, skipping fetch');
        return;
      }

      try {
        setIsLoading(true);
        // Try to load from API first
        const serverPOIs = await poiService.getAllPOIs();
        if (Array.isArray(serverPOIs)) {
          dispatch({ type: 'LOAD_POIS', payload: serverPOIs });
        } else {
          console.error('Server returned invalid POIs data:', serverPOIs);
          throw new Error('Invalid POIs data from server');
        }
      } catch (error) {
        console.error('Error loading POIs from server:', error);
        setError(error as Error);
        
        // Fall back to localStorage
        try {
          const storedData = localStorage.getItem(STORAGE_KEY);
          if (storedData) {
            const { draggable, places }: StoredPOIs = JSON.parse(storedData);
            if (Array.isArray(draggable) && Array.isArray(places)) {
              dispatch({ type: 'LOAD_POIS', payload: [...draggable, ...places] });
            }
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPOIs();
  }, []); // Only run on mount

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
    if (!poiService) {
      console.log('POI service not initialized yet');
      return;
    }

    try {
      // Generate ID first so we can use it both locally and on server
      const id = uuidv4();
      const now = new Date().toISOString();
      const poiWithId: POIType = {
        ...poi,
        id,
      } as POIType;
      
      // Optimistically update local state
      dispatch({ type: 'ADD_POI', payload: poi });
      
      // Then save to server with the same ID
      await poiService.createPOI(poiWithId);
    } catch (error) {
      console.error('Error saving POI to server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const removePOI = async (id: string) => {
    if (!poiService) {
      console.log('POI service not initialized yet');
      return;
    }

    try {
      // Optimistically update local state
      dispatch({ type: 'REMOVE_POI', payload: id });
      
      // Then remove from server
      await poiService.deletePOI(id);
    } catch (error) {
      console.error('Error deleting POI from server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const updatePOI = async (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    if (!poiService) {
      console.log('POI service not initialized yet');
      return;
    }

    try {
      // Optimistically update local state
      dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
      
      // Then update server
      await poiService.updatePOI(id, updates);
    } catch (error) {
      console.error('Error updating POI on server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  const updatePOIPosition = async (id: string, position: POIPosition) => {
    if (!poiService) {
      console.log('POI service not initialized yet');
      return;
    }

    try {
      // Optimistically update local state
      dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
      
      // Then update server
      await poiService.updatePOI(id, { position });
    } catch (error) {
      console.error('Error updating POI position on server:', error);
      // Note: We don't rollback the optimistic update since we have localStorage as backup
    }
  };

  // Add function to get POIs in route format (as IDs)
  const getPOIsForRoute = (): SavedRouteState['pois'] => {
    console.log('[POI] getPOIsForRoute called, current pois:', pois);
    const draggablePois = pois.filter((poi): poi is DraggablePOI => poi.type === 'draggable');
    const placePois = pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place');
    
    console.log('[POI] Filtered POIs:', { draggable: draggablePois, places: placePois });
    
    // Use id for both client and server since we're using client-generated UUIDs as MongoDB _id
    const result = {
      draggable: draggablePois.map(poi => poi.id),
      places: placePois.map(poi => poi.id)
    };
    
    console.log('[POI] getPOIsForRoute returning POI IDs:', result);
    return result;
  };

  // Add function to load POIs from route
  const loadPOIsFromRoute = async (routePOIs?: SavedRouteState['pois']) => {
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

      // Collect all POI IDs
      const poiIds = [
        ...routePOIs.draggable.map(poi => typeof poi === 'string' ? poi : poi.id),
        ...routePOIs.places.map(poi => typeof poi === 'string' ? poi : poi.id)
      ];

      // Fetch full POI data for IDs
      const serverPOIs = await poiService.getAllPOIs();
      const poiMap = new Map(serverPOIs.map(poi => [poi.id, poi]));

      // Reconstruct POIs in correct order
      const reconstructedPOIs = poiIds
        .map(id => poiMap.get(id))
        .filter((poi): poi is POIType => poi !== undefined);

      if (reconstructedPOIs.length !== poiIds.length) {
        console.warn('[POI] Some POIs were not found on server');
      }

      console.log('[POI] Loading POIs from route:', reconstructedPOIs);
      dispatch({ type: 'LOAD_POIS', payload: reconstructedPOIs });
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
