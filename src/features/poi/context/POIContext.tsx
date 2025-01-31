import React, { createContext, useContext, useEffect, useReducer } from 'react';
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

  // Load POIs from local storage on mount
  useEffect(() => {
    const loadPOIs = () => {
      try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const { draggable, places }: StoredPOIs = JSON.parse(storedData);
          dispatch({ type: 'LOAD_POIS', payload: [...draggable, ...places] });
        }
      } catch (error) {
        console.error('Error loading POIs:', error);
      }
    };

    loadPOIs();
  }, []);

  // Save POIs to local storage whenever they change
  useEffect(() => {
    const savePOIs = () => {
      try {
        const storedData: StoredPOIs = {
          draggable: pois.filter((poi): poi is DraggablePOI => poi.type === 'draggable'),
          places: pois.filter((poi): poi is PlaceNamePOI => poi.type === 'place'),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
      } catch (error) {
        console.error('Error saving POIs:', error);
      }
    };

    savePOIs();
  }, [pois]);

  const addPOI = (poi: NewPOIInput) => {
    dispatch({ type: 'ADD_POI', payload: poi });
  };

  const removePOI = (id: string) => {
    dispatch({ type: 'REMOVE_POI', payload: id });
  };

  const updatePOI = (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
  };

  const updatePOIPosition = (id: string, position: POIPosition) => {
    dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
  };

  return (
    <POIContext.Provider
      value={{
        pois,
        addPOI,
        removePOI,
        updatePOI,
        updatePOIPosition,
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
