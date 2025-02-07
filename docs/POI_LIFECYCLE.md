# POI (Point of Interest) Implementation Plan

## Note to Future AI Assistant
If you're starting fresh with no context:

1. This is a plan to implement POIs (Points of Interest) in a mapping application
2. The core decision is to store POIs in their own MongoDB collection (pois) rather than embedding them in routes
3. Routes will only store POI references (IDs)
4. The implementation follows these principles:
   - Single source of truth (POI collection)
   - Simple CRUD operations
   - No complex features (no optimistic updates, no localStorage backup)
   - Clear data flow (POIs created/updated directly in collection)
   - Routes only store POI IDs as references

To implement this plan:
1. Start with MongoDB schema updates (POI model and Route model)
2. Update backend API for basic CRUD
3. Simplify frontend service
4. Update POI context
5. Update route integration
6. Test thoroughly

The goal is maximum reliability with minimum complexity.


## The Foolproof Solution

### Core Principle
Store POIs in their own collection and have routes reference them by ID. This is the simplest and most reliable approach.

### Step-by-Step Implementation

#### 1. MongoDB Schema Setup [ ]
- [ ] Update POI model (`server/src/features/poi/models/poi.model.ts`):
```typescript
const poiSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use client-generated UUID
  userId: { type: String, required: true },
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  name: { type: String, required: true },
  type: { type: String, enum: ['draggable', 'place'], required: true },
  category: { type: String, required: true },
  icon: { type: String, required: true },
  placeId: { type: String }, // Only for place type POIs
  description: String,
  photos: [{
    url: String,
    caption: String
  }],
  style: {
    color: String,
    size: Number
  }
});
```

- [ ] Update Route model to only store POI references:
```typescript
const routeSchema = new mongoose.Schema({
  // ... other fields ...
  pois: {
    draggable: [{ type: String }], // Array of POI _ids
    places: [{ type: String }]     // Array of POI _ids
  }
});
```

#### 2. Backend API Setup [ ]
- [ ] Simplify POI controller to basic CRUD:
  - POST /api/pois - Create POI
  - GET /api/pois - Get all user's POIs
  - PUT /api/pois/:id - Update POI
  - DELETE /api/pois/:id - Delete POI
- [ ] Remove all timestamp handling
- [ ] Use client-generated UUIDs as MongoDB _id

#### 3. Frontend Service Cleanup [ ]
- [ ] Simplify poiService.ts to basic CRUD:
```typescript
const usePOIService = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const createPOI = async (poi: POIType) => {
    const token = await getAccessTokenSilently();
    const response = await fetch('/api/pois', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(poi)
    });
    return response.json();
  };

  // Similar simple implementations for get/update/delete
};
```

#### 4. Context Simplification [ ]
- [ ] Remove localStorage backup
- [ ] Remove optimistic updates
- [ ] Simplify POIContext to basic state management:
```typescript
const POIProvider = ({ children }) => {
  const [pois, setPois] = useState([]);
  const poiService = usePOIService();

  // Load POIs
  useEffect(() => {
    poiService.getAllPOIs().then(setPois);
  }, []);

  const addPOI = async (poi) => {
    const saved = await poiService.createPOI(poi);
    setPois([...pois, saved]);
  };

  // Similar simple implementations for update/delete
};
```

#### 5. Route Integration [ ]
- [ ] When saving route, just save POI IDs:
```typescript
const saveRoute = async (route) => {
  const routeData = {
    ...route,
    pois: {
      draggable: pois.filter(p => p.type === 'draggable').map(p => p._id),
      places: pois.filter(p => p.type === 'place').map(p => p._id)
    }
  };
  await routeService.save(routeData);
};
```

- [ ] When loading route, fetch POIs by IDs:
```typescript
const loadRoute = async (routeId) => {
  const route = await routeService.get(routeId);
  const poiIds = [...route.pois.draggable, ...route.pois.places];
  const pois = await poiService.getAllPOIs(); // Gets all user's POIs
  setPois(pois.filter(p => poiIds.includes(p._id)));
};
```

### Testing Checklist [ ]

#### 1. POI Creation [ ]
- [ ] Create draggable POI
- [ ] Create place POI
- [ ] Verify POI saved to MongoDB
- [ ] Verify POI appears on map

#### 2. POI Updates [ ]
- [ ] Update POI position
- [ ] Update POI details
- [ ] Verify updates saved to MongoDB
- [ ] Verify updates appear on map

#### 3. Route Integration [ ]
- [ ] Save route with POIs
- [ ] Load route with POIs
- [ ] Verify all POIs load correctly
- [ ] Verify POI positions correct

#### 4. Error Cases [ ]
- [ ] Handle network errors
- [ ] Handle invalid POI data
- [ ] Handle missing POIs when loading route

### Implementation Order

1. Start with MongoDB schema updates
2. Update backend API
3. Simplify frontend service
4. Update POI context
5. Update route integration
6. Test each step thoroughly

### Key Points

1. Single Source of Truth
   - POIs live in pois collection
   - Routes only store POI IDs
   - No data duplication

2. Simple Data Flow
   - Create/update POIs directly in pois collection
   - Routes just reference POIs by ID
   - Load POIs when loading route

3. Error Prevention
   - Use TypeScript types strictly
   - Validate data on server
   - Simple, predictable state management

4. No Complex Features
   - No optimistic updates
   - No localStorage backup
   - No timestamp tracking
   - Simple CRUD operations

This solution prioritizes reliability and simplicity over advanced features. It's easier to add features later than to fix a complex, broken system.

### Cleanup Steps [ ]

After successful implementation and testing:
- [ ] Remove outdated POI documentation:
  - `docs/POI_IMPLEMENTATION_PLAN.md` (superseded by this document)
  - `docs/POI_PROGRESS_NOTES.md` (historical notes no longer relevant)
  - `docs/POI_PLACES.md` (covered in new implementation)
  - `docs/POIS.md` (general documentation now outdated)
- [ ] Update any relevant documentation that might reference the old POI implementation:
  - `docs/ARCHITECTURE.md`
  - `docs/SAVE_LOAD_IMPLEMENTATION.md`
  - Any other docs that mention POIs

Note: Only remove these documents after the new implementation is fully tested and working in production.
