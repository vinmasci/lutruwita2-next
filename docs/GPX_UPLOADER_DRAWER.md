# GPX Uploader Drawer

## Current Implementation

The GPX uploader drawer is a slide-out panel that appears when clicking the add GPX icon in the sidebar. It provides functionality for uploading and managing GPX route files.

### Key Files
- `src/features/gpx/components/Uploader/UploaderUI.tsx` - Main UI component
- `src/features/gpx/components/Uploader/Uploader.tsx` - Logic component
- `src/features/map/components/Sidebar/Sidebar.tsx` - Drawer integration

### Current Features
- Drag and drop GPX file upload
- File name editing with proper route synchronization
- Route list with distance information
- Upload status feedback
- Error handling
- Centralized route state management

## Known Issues

### Recent Updates

#### 1. Route State Management
- Implemented centralized route state using RouteContext
- Routes are now managed through a single source of truth
- Key files:
  - `src/features/map/context/RouteContext.tsx` - Global route state management
  - `src/features/gpx/hooks/useClientGpxProcessing.ts` - Route processing and ID generation
  - `src/features/gpx/components/Uploader/Uploader.tsx` - Route operations handling
  - `src/features/gpx/components/Uploader/UploaderUI.tsx` - Route list UI

#### 2. Route ID System
- Switched from timestamp-based IDs to UUIDs for uniqueness
- Consistent ID format across all components
- Proper ID preservation during route updates

#### 3. Route Operations
- Added route rename functionality with proper state updates
- Improved route addition to prevent duplicates
- Routes now show distance information

#### 4. Delete Functionality
- Fixed ID mismatch in delete operation
- Implemented proper cleanup of all map elements (route layers, sources, unpaved sections)
- Added error handling for route lookup

#### 5. Unpaved Sections
- Fixed issue with unpaved sections disappearing when adding multiple routes
- Implemented route-specific IDs for unpaved section layers and sources
- Added proper cleanup of unpaved sections during route deletion
- Each route now maintains its own set of unpaved sections

### Current Issues

#### 1. Route Processing
- Surface detection runs unnecessarily on route rename
- Need to implement caching for processed route data

#### 2. Route Selection
- Elevation profile not updating when switching between routes
- Map view not syncing with selected route

### Implementation Details

#### Key Components and Their Roles
1. RouteContext (`src/features/map/context/RouteContext.tsx`)
   - Manages global route state
   - Handles route operations (add, delete, update)
   - Maintains current route selection

2. Uploader (`src/features/gpx/components/Uploader/Uploader.tsx`)
   - Handles file operations
   - Processes GPX files
   - Manages route updates
   - Coordinates map cleanup on delete

3. UploaderUI (`src/features/gpx/components/Uploader/UploaderUI.tsx`)
   - Displays route list
   - Handles user interactions
   - Shows route information

4. useClientGpxProcessing (`src/features/gpx/hooks/useClientGpxProcessing.ts`)
   - Processes GPX files
   - Generates unique route IDs
   - Calculates route statistics

#### State Flow
1. File Upload:
   ```
   UploaderUI (file drop) 
   -> Uploader (processGpx) 
   -> RouteContext (addRoute)
   -> MapView (display)
   ```

2. Route Rename:
   ```
   UploaderUI (rename click)
   -> Uploader (handleFileRename)
   -> processGpx
   -> RouteContext (addRoute with preserved ID)
   ```

3. Route Delete:
   ```
   UploaderUI (delete click)
   -> Uploader (handleFileDelete)
   -> MapView (cleanup map layers, sources, unpaved sections)
   -> RouteContext (deleteRoute)
   -> ElevationProfile (auto-hide via currentRoute)
   ```

4. Surface Detection:
   ```
   MapView (handleUploadGpx)
   -> addSurfaceOverlay (with route-specific IDs)
   -> assignSurfacesViaNearest
   -> MapView (add unpaved section layers)
   ```

## Planned Improvements

### 1. Upload Area
- [ ] Make upload area more prominent
- [ ] Add ".GPX files only" text
- [ ] Enhance drop zone styling

### 2. Route Management
- [x] Add numbered list of routes
- [x] Add route selection functionality
- [x] Show currently selected route
- [x] Enable switching between routes

### 3. Map Integration
- [ ] Center map on selected route
- [ ] Show elevation profile for selected route
- [ ] Smooth transitions between routes
- [ ] Fix elevation profile updates when switching routes
- [ ] Implement route selection state synchronization

### 4. Delete Functionality
- [x] Fix delete button functionality
- [x] Remove route from map (including unpaved sections)
- [x] Remove elevation profile
- [x] Clean up route state
- [ ] Add confirmation dialog

### 5. Performance Improvements
- [ ] Implement caching for processed route data
- [ ] Avoid unnecessary surface detection on route rename
- [ ] Optimize route switching performance

## Technical Details

### Component Structure
```
Sidebar
└── NestedDrawer
    └── Uploader
        ├── UploaderUI
        │   ├── Drop Zone
        │   └── Route List
        └── Route Management Logic
```

### State Management

#### Route Context
```typescript
interface RouteContextState {
  routes: ProcessedRoute[];
  selectedRouteId: string | null;
  isRouteVisible: { [routeId: string]: boolean };
}

interface RouteContextValue extends RouteContextState {
  selectRoute: (routeId: string) => void;
  toggleRouteVisibility: (routeId: string) => void;
  deleteRoute: (routeId: string) => void;
  centerMapOnRoute: (routeId: string) => void;
}
```

#### Component Props
```typescript
// Updated UploaderUI props
interface UploaderUIProps {
  files: UploadedFile[];
  isLoading: boolean;
  error: GPXProcessingError | null;
  selectedFileId: string | null;
  onFileAdd: (file: File) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileSelect: (fileId: string) => void;
}

// New RouteList component props
interface RouteListProps {
  routes: ProcessedRoute[];
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
  onRouteDelete: (routeId: string) => void;
}
```

### UI Specifications

#### Styling Examples
```typescript
// Enhanced drop zone styling
const StyledDropZone = styled(Paper)(({ theme }) => ({
  width: '100%',
  padding: '24px',
  marginBottom: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'rgba(35, 35, 35, 0.9)',
  border: '2px dashed rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
    border: '2px dashed rgba(255, 255, 255, 0.3)',
  },
  '&.dragover': {
    backgroundColor: 'rgba(55, 55, 55, 0.9)',
    border: '2px dashed rgba(255, 255, 255, 0.5)',
    transform: 'scale(0.98)',
  }
}));

// Route list item styling
const StyledRouteItem = styled(ListItem)(({ theme, selected }) => ({
  padding: '8px 12px',
  marginBottom: '8px',
  backgroundColor: selected ? 'rgba(55, 55, 55, 0.9)' : 'rgba(35, 35, 35, 0.9)',
  borderRadius: '4px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  }
}));
```

#### Layout Specifications
- Drawer width: 264px
- Drop zone height: Auto (min 120px)
- Route list max height: 60vh with scroll
- Padding: 16px around content
- Gap between elements: 12px

#### Theme Integration
- Dark theme by default
- Consistent with main sidebar styling
- Responsive breakpoints
- Smooth transitions

#### Accessibility
- Keyboard navigation support
- Screen reader friendly
- Touch targets min 44x44px
- Focus indicators

### Interactions

#### Keyboard Navigation
```typescript
// Key handlers in RouteList component
const handleKeyDown = (e: React.KeyboardEvent, routeId: string) => {
  switch (e.key) {
    case 'ArrowUp':
      // Select previous route
      e.preventDefault();
      selectPreviousRoute();
      break;
    case 'ArrowDown':
      // Select next route
      e.preventDefault();
      selectNextRoute();
      break;
    case 'Enter':
      // Toggle route visibility
      e.preventDefault();
      toggleRouteVisibility(routeId);
      break;
    case 'Delete':
      // Delete route with confirmation
      e.preventDefault();
      handleDeleteRoute(routeId);
      break;
  }
};
```

#### Event Handling
- Drag and drop events with visual feedback
- Route selection with keyboard support
- Delete confirmation dialog
- Error notifications
- Upload progress indicators

#### User Feedback
- Loading states during file processing
- Success/error notifications
- Visual feedback for:
  - Route selection
  - Drag and drop
  - Delete operations
  - File processing status

## Next Steps
1. Add delete confirmation dialog
2. Implement route data caching to avoid unnecessary processing
3. Fix elevation profile updates on route selection
4. Implement route selection state synchronization
5. Add comprehensive error handling
6. Test all interactions and edge cases
