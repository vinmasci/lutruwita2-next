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
  - [ ] Implement cursor-attached POI preview
  - [ ] Add place name click handling
- [x] Add POI controls to sidebar
  - [ ] Create POI list view
  - [x] Add POI creation button
  - [ ] Implement POI filtering

### 🚧 POI Markers (In Progress)
- [x] Create POIMarker base component
  - [x] Implement basic marker rendering
  - [ ] Add click-to-edit functionality
  - [x] Style according to design specs
  - [ ] Implement icon-only display with popup on click
- [x] Implement DraggablePOIMarker
  - [x] Add drag and drop functionality
  - [x] Handle position updates
  - [x] Add drag styling and feedback
- [ ] Create PlaceNamePOIMarker
  - [ ] Implement fixed position marker
  - [ ] Add place information display
  - [ ] Style according to design specs

### 🚧 New POI Creation Flow (In Progress)
- [x] Initial drawer setup
  - [x] Add POI button opens drawer
  - [x] Mode selection options
- [ ] Direct-to-icon selection
  - [ ] Skip location selection step
  - [ ] Show icon categories immediately after mode selection
  - [ ] Auto-generate POI name from selected icon
- [ ] Cursor-attached placement
  - [ ] Pin selected icon to cursor
  - [ ] Preview POI appearance while moving
  - [ ] Click-to-place functionality
- [ ] Details drawer
  - [ ] Open right-side drawer after placement
  - [ ] Pre-filled name from icon type
  - [ ] Optional description field
  - [ ] Optional photo upload
  - [ ] Save/cancel actions

### 🚧 Features (In Progress)
- [x] POI Creation Modes
  - [x] Map click placement
  - [ ] Place name attachment
- [x] Draggable POI functionality
  - [x] Create at clicked location
  - [x] Drag to reposition
  - [ ] Edit name/description
  - [ ] Delete POI
  - [ ] Save position on drag end
- [ ] Place Name POI functionality
  - [ ] Create from clicked place name
  - [ ] Display place information
  - [ ] Edit description
  - [ ] Delete POI

### 🚧 Testing & Refinement (In Progress)
- [x] Test POI creation
- [x] Test drag and drop
- [ ] Test place name POI creation
- [x] Test persistence
- [x] Test map integration
- [x] Performance optimization
  - [x] Memoized click handlers
  - [x] Proper cleanup of event listeners
  - [x] Optimized state updates
- [x] UI/UX refinement
  - [x] Improved cursor feedback
  - [x] Clear visual states
  - [x] Smooth transitions

### 🚧 Documentation (In Progress)
- [x] Update component documentation
- [x] Add usage examples
- [x] Document state management
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
│   ├── MapboxPOIMarker/        # 🚧 In Progress
│   │   ├── MapboxPOIMarker.tsx
│   │   ├── MapboxPOIMarker.styles.css
│   │   └── index.ts
│   └── POIDrawer/              # 🚧 In Progress
│       ├── POIDrawer.tsx
│       ├── POIModeSelection.tsx
│       ├── POIIconSelection.tsx
│       ├── POIDetailsDrawer.tsx       # New
│       ├── POICursorPreview.tsx       # New
│       ├── POIDrawer.styles.ts
│       ├── types.ts
│       └── index.ts
├── context/                    # ✅ Completed
│   ├── POIContext.tsx
│   └── types.ts
├── constants/                  # ✅ Completed
│   ├── poi-icons.ts
│   └── icon-paths.ts
├── utils/                      # ✅ Completed
│   └── photo.ts
└── types/                      # ✅ Completed
    └── poi.types.ts
```

## Styling Guidelines

### POI Marker Icons
- Draggable POI Icon:
  - Default: Icon-only display in category color
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

### POI Details Drawer Styling
- Position: Right side
- Width: 320px
- Background: rgba(35, 35, 35, 0.9)
- Pre-filled name field
- Optional description textarea
- Photo upload section
- Save/Cancel buttons at bottom

### Interactive Elements
- Buttons follow MUI theme
- Hover states for all clickable elements
- Loading states during submissions
- Error states with clear feedback
- Smooth transitions between steps

## Recent Updates
- Changed POI creation flow to use cursor-attached placement
- Removed map click step from workflow
- Added right-side details drawer
- Updated marker styling to icon-only with click interaction
- Enhanced POI preview while placing

## Next Steps
1. ✅ Fix map click handling for POI placement
2. ✅ Implement icon selection in drawer
3. [ ] Implement cursor-attached POI preview
4. [ ] Create right-side details drawer
5. [ ] Update POI marker styling and interaction
6. [ ] Add auto-generated POI names
7. [ ] Implement place name POI functionality
8. Complete documentation