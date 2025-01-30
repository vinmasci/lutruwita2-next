# POI Implementation Plan

## Overview
The Points of Interest (POI) feature allows users to mark locations on the map in two ways:
1. Draggable POIs that can be placed and moved anywhere on the map
2. Place name POIs that are fixed to specific locations based on place names

## Implementation Progress

### ✅ Core Setup (Completed)
- [x] Define POI types and interfaces
  - [x] Base POI interface
  - [x] DraggablePOI and PlaceNamePOI types
  - [x] Photo support with base64 storage
  - [x] Icon and category types
- [x] Create POI context with state management
  - [x] POI array state
  - [x] CRUD operations
  - [x] Type-safe actions
- [x] Implement local storage persistence
- [x] Install required dependencies (uuid, @types/leaflet)

### ✅ POI Drawer Component (Completed)
- [x] Create POI Drawer Component
  - [x] Implement sliding drawer UI with multi-step flow
  - [x] Add mode selection (Map/Place)
  - [x] Create categorized icon selection grid
  - [x] Add POI form fields with photo upload
  - [x] Handle photo conversion and storage
  - [x] Implement drawer state management
  - [x] Add navigation between steps
  - [x] Style components for consistency

### 🚧 Map Integration (In Progress)
- [x] Update MapView component
  - [x] Add POI layer
  - [x] Handle POI click events
  - [x] Integrate with map controls
  - [x] Implement crosshair cursor mode
  - [ ] Add place name click handling
- [x] Add POI controls to sidebar
  - [ ] Create POI list view
  - [x] Add POI creation button
  - [ ] Implement POI filtering

### ✅ POI Markers (Completed)
- [x] Create POIMarker base component
  - [x] Implement basic marker rendering
  - [x] Add popup functionality
  - [x] Style according to design specs
- [ ] Implement DraggablePOIMarker
  - [ ] Add drag and drop functionality
  - [ ] Handle position updates
  - [ ] Add drag styling and feedback
- [ ] Create PlaceNamePOIMarker
  - [ ] Implement fixed position marker
  - [ ] Add place information display
  - [ ] Style according to design specs

### 🚧 Features (Pending)
- [ ] POI Creation Modes
  - [ ] Map click placement
  - [ ] Place name attachment
- [ ] Draggable POI functionality
  - [ ] Create at clicked location
  - [ ] Drag to reposition
  - [ ] Edit name/description
  - [ ] Delete POI
  - [ ] Save position on drag end
- [ ] Place Name POI functionality
  - [ ] Create from clicked place name
  - [ ] Display place information
  - [ ] Edit description
  - [ ] Delete POI

### 🚧 Testing & Refinement (Pending)
- [ ] Test POI creation
- [ ] Test drag and drop
- [ ] Test place name POI creation
- [ ] Test persistence
- [ ] Test map integration
- [ ] Performance optimization
- [ ] UI/UX refinement

### 🚧 Documentation (Pending)
- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Document state management
- [ ] Add troubleshooting guide

## Directory Structure
```
src/features/poi/
├── components/
│   ├── POIMarker/              # ✅ Completed
│   │   ├── POIMarker.tsx
│   │   ├── POIMarker.styles.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── DraggablePOIMarker/     # 🚧 To be implemented
│   │   ├── DraggablePOIMarker.tsx
│   │   ├── DraggablePOIMarker.styles.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── PlaceNamePOIMarker/     # 🚧 To be implemented
│   │   ├── PlaceNamePOIMarker.tsx
│   │   ├── PlaceNamePOIMarker.styles.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── POIDrawer/              # ✅ Completed
│       ├── POIDrawer.tsx
│       ├── POIModeSelection.tsx
│       ├── POILocationInstructions.tsx
│       ├── POIIconSelection.tsx
│       ├── POIDetailsForm.tsx
│       ├── POIDrawer.styles.ts
│       ├── types.ts
│       └── index.ts
├── context/                    # ✅ Completed
│   ├── POIContext.tsx
│   └── types.ts
├── constants/                  # ✅ Completed
│   └── poi-icons.ts
├── utils/                      # ✅ Completed
│   └── photo.ts
└── types/                      # ✅ Completed
    └── poi.types.ts
```

## Styling Guidelines

### POI Marker Icons
- Draggable POI Icon:
  - Default: Map pin icon in primary color (#007bff)
  - Hover: Slightly larger with drop shadow
  - Active/Dragging: Darker shade with elevation shadow
  - Size: 24x24px base size, 28x28px on hover

- Place Name POI Icon:
  - Default: Location marker icon in secondary color (#6c757d)
  - Hover: Slightly larger with subtle glow
  - Size: 24x24px base size, 28x28px on hover

### POI Drawer Styling
- Width: 264px
- Background: rgba(35, 35, 35, 0.9)
- Border: none
- Transitions: all 0.2s ease-in-out
- Icon Grid: 4 columns
- Category List: Colored borders matching icon types
- Photo Grid: 3 columns with aspect ratio 1:1

### Interactive Elements
- Buttons follow MUI theme
- Hover states for all clickable elements
- Loading states during submissions
- Error states with clear feedback
- Smooth transitions between steps

## Next Steps
1. Add map click handling for POI placement
2. Implement crosshair cursor mode
3. Add place name click handling
4. Create POI list view
5. Implement POI filtering
6. Test all features
7. Document usage
