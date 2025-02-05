# POI MongoDB Integration Guide

## Overview
This document outlines the implementation plan for integrating MongoDB storage with the existing Points of Interest (POI) feature in the Lutruwita2 application. Currently, POIs are only stored in localStorage, and we need to add persistent storage in MongoDB while maintaining the current functionality.

## Current Implementation Analysis

### Existing Files
1. `src/features/poi/context/POIContext.tsx`
   - Manages POI state using React Context
   - Currently saves/loads POIs to/from localStorage
   - Uses TypeScript types for type safety
   - Implements CRUD operations for POIs

2. `src/features/poi/components/MapboxPOIMarker/MapboxPOIMarker.tsx`
   - Handles POI marker rendering and interactions
   - Manages drag-and-drop functionality
   - Contains detailed logging for debugging

3. `src/features/poi/types/poi.types.ts`
   - Defines TypeScript interfaces for POIs
   - Contains POI category definitions
   - Defines the POI context type

## Required Changes

### 1. Server-Side Implementation

#### New Files to Create:

```typescript
// server/src/features/poi/models/poi.model.ts
import mongoose from 'mongoose';

const poiSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: ['draggable', 'place'],
    required: true
  },
  position: {
    lat: Number,
    lng: Number,
  },
  category: String,
  icon: String,
  placeId: String,
  createdAt: Date,
  updatedAt: Date,
}, { timestamps: true });

export const POI = mongoose.model('POI', poiSchema);
```

```typescript
// server/src/features/poi/controllers/poi.controller.ts
import { Request, Response } from 'express';
import { POI } from '../models/poi.model';

export const POIController = {
  async getAll(req: Request, res: Response) {
    try {
      const pois = await POI.find();
      res.json(pois);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch POIs' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const poi = new POI(req.body);
      await poi.save();
      res.status(201).json(poi);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create POI' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const poi = await POI.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true }
      );
      if (!poi) {
        return res.status(404).json({ error: 'POI not found' });
      }
      res.json(poi);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update POI' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const poi = await POI.findOneAndDelete({ id: req.params.id });
      if (!poi) {
        return res.status(404).json({ error: 'POI not found' });
      }
      res.json({ message: 'POI deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete POI' });
    }
  }
};
```

```typescript
// server/src/features/poi/routes/poi.routes.ts
import express from 'express';
import { POIController } from '../controllers/poi.controller';

const router = express.Router();

router.get('/pois', POIController.getAll);
router.post('/pois', POIController.create);
router.put('/pois/:id', POIController.update);
router.delete('/pois/:id', POIController.delete);

export default router;
```

### 2. Client-Side Modifications

#### Update POIContext.tsx:

```typescript
// Add to src/features/poi/context/POIContext.tsx

// API functions
const API = {
  async getAllPOIs() {
    const response = await fetch('/api/pois');
    if (!response.ok) throw new Error('Failed to fetch POIs');
    return response.json();
  },

  async createPOI(poi: POIType) {
    const response = await fetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poi),
    });
    if (!response.ok) throw new Error('Failed to create POI');
    return response.json();
  },

  async updatePOI(id: string, updates: Partial<POIType>) {
    const response = await fetch(`/api/pois/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update POI');
    return response.json();
  },

  async deletePOI(id: string) {
    const response = await fetch(`/api/pois/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete POI');
    return response.json();
  },
};

// Modify the POIProvider component
export const POIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pois, dispatch] = useReducer(poiReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load POIs from server on mount
  useEffect(() => {
    const loadPOIs = async () => {
      try {
        setIsLoading(true);
        const serverPOIs = await API.getAllPOIs();
        dispatch({ type: 'LOAD_POIS', payload: serverPOIs });
      } catch (error) {
        console.error('Error loading POIs:', error);
        setError(error as Error);
        
        // Fallback to localStorage
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

  // Modified CRUD operations
  const addPOI = async (poi: NewPOIInput) => {
    try {
      // Add to local state first for optimistic update
      dispatch({ type: 'ADD_POI', payload: poi });
      
      // Then save to server
      await API.createPOI(poi);
    } catch (error) {
      console.error('Failed to save POI:', error);
      // Rollback local state
      dispatch({ type: 'REMOVE_POI', payload: poi.id });
      throw error;
    }
  };

  const updatePOI = async (id: string, updates: Partial<Omit<POIType, 'id'>>) => {
    try {
      // Update local state first
      dispatch({ type: 'UPDATE_POI', payload: { id, updates } });
      
      // Then update server
      await API.updatePOI(id, updates);
    } catch (error) {
      console.error('Failed to update POI:', error);
      // Could implement rollback here if needed
      throw error;
    }
  };

  const removePOI = async (id: string) => {
    try {
      // Remove from local state first
      dispatch({ type: 'REMOVE_POI', payload: id });
      
      // Then remove from server
      await API.deletePOI(id);
    } catch (error) {
      console.error('Failed to delete POI:', error);
      // Could implement rollback here if needed
      throw error;
    }
  };

  return (
    <POIContext.Provider
      value={{
        pois,
        addPOI,
        removePOI,
        updatePOI,
        updatePOIPosition,
        isLoading,
        error,
      }}
    >
      {children}
    </POIContext.Provider>
  );
};
```

## Implementation Notes for AI Assistant

1. **Database Schema**
   - Use MongoDB's timestamps feature for automatic createdAt/updatedAt handling
   - Index the `id` field for faster queries
   - Consider adding validation for required fields

2. **Error Handling**
   - Implement rollback mechanisms for failed server operations
   - Keep localStorage as a fallback mechanism
   - Add proper error boundaries in React components

3. **Performance Considerations**
   - Use optimistic updates for better UX
   - Consider implementing request debouncing for position updates
   - Add proper loading states

4. **Testing Requirements**
   - Test offline functionality
   - Test error scenarios
   - Test concurrent updates
   - Test data consistency between localStorage and MongoDB

5. **Security Considerations**
   - Add proper validation on both client and server
   - Implement rate limiting for API endpoints
   - Add authentication middleware if needed

## Migration Steps

1. Create the server-side directory structure:
   ```
   server/src/features/poi/
   ├── models/
   │   └── poi.model.ts
   ├── controllers/
   │   └── poi.controller.ts
   ├── routes/
   │   └── poi.routes.ts
   └── types/
       └── poi.types.ts
   ```

2. Add MongoDB connection in `server.ts`
3. Register POI routes in the Express app
4. Update POIContext with server integration
5. Test all CRUD operations
6. Implement error handling and fallback mechanisms
7. Add loading states to the UI

## Types to Update

Update `poi.types.ts` to include new interfaces for API responses and loading states:

```typescript
export interface POIContextType {
  pois: POIType[];
  addPOI: (poi: NewPOIInput) => Promise<void>;
  removePOI: (id: string) => Promise<void>;
  updatePOI: (id: string, updates: Partial<Omit<POIType, 'id'>>) => Promise<void>;
  updatePOIPosition: (id: string, position: POIPosition) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

Remember to maintain type safety throughout the implementation and ensure proper error handling at all levels.