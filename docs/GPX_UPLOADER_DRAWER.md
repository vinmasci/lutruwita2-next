# GPX Uploader Drawer

## Current Implementation

The GPX uploader drawer is a slide-out panel that appears when clicking the add GPX icon in the sidebar. It provides functionality for uploading and managing GPX route files.

### Key Files
- `src/features/gpx/components/Uploader/UploaderUI.tsx` - Main UI component
- `src/features/gpx/components/Uploader/Uploader.tsx` - Logic component
- `src/features/map/components/Sidebar/Sidebar.tsx` - Drawer integration

### Current Features
- Drag and drop GPX file upload
- File name editing
- File deletion
- Upload status feedback
- Error handling

## Known Issues

### 1. Delete Functionality (In Progress)
- Delete button still not working properly despite several attempted fixes
- Current Implementation:
  - Added RouteContext for centralized route state management
  - Implemented proper cleanup of map layers and sources
  - Added route deletion through context
  - Synchronized route IDs between components

- Attempted Solutions:
  1. Centralized State Management:
     - Created RouteContext to manage routes globally
     - Implemented addRoute and deleteRoute functions
     - Connected MapView and Uploader to use the same context

  2. Consistent Route ID Management:
     - Added routeId to ProcessedRoute interface
     - Generated consistent IDs in useClientGpxProcessing
     - Used same ID format across components

  3. Cleanup Implementation:
     - Added map layer removal in MapView
     - Added route state cleanup in context
     - Added UI element cleanup through state changes

- Potential Issues to Investigate:
  1. Route ID Synchronization:
     - Verify route IDs are consistent between upload and delete
     - Check if IDs are properly passed through context
  2. Event Propagation:
     - Check if delete button click events are being properly handled
     - Verify event bubbling isn't interfering with deletion
  3. State Updates:
     - Ensure state updates trigger proper re-renders
     - Verify context updates are propagating correctly

- Next Steps:
  1. Add logging to track route ID flow
  2. Implement confirmation dialog before deletion
  3. Add error handling for failed deletions
  4. Consider adding route persistence

### 2. Route Processing
- Surface detection process runs unnecessarily on route rename
- Need to implement caching for processed route data

### 3. Route Selection
- Elevation profile not updating when switching between routes
- Map view not syncing with selected route

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
- [ ] Add confirmation dialog
- [ ] Remove route from map
- [ ] Remove elevation profile
- [ ] Clean up route state
- [ ] Fix delete button functionality

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
1. Fix delete functionality and implement proper cleanup
2. Implement route data caching to avoid unnecessary processing
3. Fix elevation profile updates on route selection
4. Implement route selection state synchronization
5. Add delete confirmations
6. Add comprehensive error handling
7. Test all interactions and edge cases
