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

// Action types
type POIAction =
  | { type: 'ADD_POI'; payload: { poi: NewPOIInput } }
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
        ...action.payload.poi,
      };

      if (action.payload.poi.type === 'place') {
        const placePOI: PlaceNamePOI = {
          ...base,
          type: 'place',
          placeId: action.payload.poi.placeId,
        };
        console.log('[POIReducer] Creating place POI:', placePOI);
        return [...state, placePOI];
      } else {
        const draggablePOI: DraggablePOI = {
          ...base,
          type: 'draggable',
        };
        console.log('[POIReducer] Creating draggable POI:', draggablePOI);
        return [...state, draggablePOI];
      }
    }
    case 'REMOVE_POI':
      console.log('[POIReducer] Removing POI:', action.payload);
      return state.filter((poi) => poi.id !== action.payload);
    case 'UPDATE_POI':
      console.log('[POIReducer] Updating POI:', action.payload);
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
      console.log('[POIReducer] Updating POI position:', action.payload);
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
      console.log('[POIReducer] Loading POIs:', action.payload);
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

  // Monitor POI state changes
  useEffect(() => {
    if (pois.length > 0) {
      console.log('[POIContext] POI state updated:', pois);
    }
  }, [pois]);

  const addPOI = (poi: NewPOIInput) => {
    // Add POI to state
    dispatch({ type: 'ADD_POI', payload: { poi } });
    
    // Add POI data to the drawer for MongoDB
    const poiDataDiv = document.getElementById('poi-data-for-mongo');
    if (poiDataDiv) {
      const currentData = poiDataDiv.textContent ? JSON.parse(poiDataDiv.textContent) : [];
      const newData = [...currentData, {
        type: poi.type,
        name: poi.name,
        position: poi.position,
        category: poi.category,
        icon: poi.icon,
        ...(poi.type === 'place' ? { placeId: poi.placeId } : {})
      }];
      poiDataDiv.textContent = JSON.stringify(newData, null, 2);
    }
  };

  const removePOI = (id: string) => {
    console.log('[POIContext] Removing POI:', id);
    dispatch({ type: 'REMOVE_POI', payload: id });
  };

  const updatePOI = (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    console.log('[POIContext] Updating POI:', { id, updates });
    dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
  };

  const updatePOIPosition = (id: string, position: POIPosition) => {
    console.log('[POIContext] Updating POI position:', { id, position });
    dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
  };

  // Get POIs in route format - all POIs are for the current route by default
  const getPOIsForRoute = (_routeId?: string): SavedRouteState['pois'] => {
    console.log('[POIContext] Getting POIs from state:', pois);
    
    // Split POIs by type
    const draggablePois = pois.filter((poi): poi is DraggablePOI => poi.type === 'draggable');
    const placePois = pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place');
    
    const result = {
      draggable: draggablePois,
      places: placePois
    };
    
    console.log('[POIContext] Returning POIs:', result);
    return result;
  };

  // Load POIs from route
  const loadPOIsFromRoute = (routePOIs?: SavedRouteState['pois']) => {
    console.log('[POIContext] Loading POIs from route:', routePOIs);
    if (!routePOIs) {
      console.log('[POIContext] No POIs to load, clearing state');
      dispatch({ type: 'LOAD_POIS', payload: [] });
      return;
    }

    const allPOIs: POIType[] = [
      ...routePOIs.draggable.map(poi => typeof poi === 'string' ? null : poi),
      ...routePOIs.places.map(poi => typeof poi === 'string' ? null : poi)
    ].filter((poi): poi is POIType => poi !== null);
    
    console.log('[POIContext] Loading POIs into state:', allPOIs);
    dispatch({ type: 'LOAD_POIS', payload: allPOIs });
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
