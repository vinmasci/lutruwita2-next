# Map Overview Sidebar Implementation

**Status: COMPLETE ✅**

## Overview

This document outlines the plan to move the Map Overview editor from its current location in the elevation profile tabs to a sidebar drawer in creation mode, similar to how the "Add GPX" button works.

## Current Implementation

Currently, the Map Overview editor is implemented as a tab in the elevation profile panel:

- The tab is defined in `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`
- The editable content is implemented in `src/features/presentation/components/MapOverview/EditableMapOverviewPanel.js`
- The data is managed by the Map Overview Context in `src/features/presentation/context/MapOverviewContext.jsx`
- The data is stored in a shared store in `src/features/presentation/store/mapOverviewStore.js`

## MongoDB Data Storage

The Map Overview data is saved to MongoDB as part of the route document. Here's how it works:

1. The Map Overview data is stored in a shared store (`mapOverviewStore.js`) to avoid circular dependencies between contexts.
2. When the Map Overview is updated, it's marked as changed using the `markMapOverviewChanged` function.
3. When saving the route to MongoDB, the Map Overview data is included in the save payload if it has changed or if it's a new route.
4. The Map Overview data is stored in the `mapOverview` field of the route document in MongoDB.
5. When loading a route, the Map Overview data is loaded from the `mapOverview` field of the route document and set in the shared store.

The relevant code in `RouteContext.js` that handles saving the Map Overview data:

```javascript
// Add map overview if it's changed or this is a new route
if (currentChangedSections.mapOverview || !currentLoadedPersistentId) {
    // Get map overview data from the shared store
    const mapOverviewData = getMapOverviewData();
    if (mapOverviewData) {
        partialUpdate.mapOverview = mapOverviewData;
    }
}
```

This implementation ensures that the Map Overview data is properly saved to and loaded from MongoDB, and it's important to maintain this behavior when moving the Map Overview editor to a sidebar drawer.

## Proposed Changes

We want to move the Map Overview editor to a sidebar drawer in creation mode, similar to how the "Add GPX" button works. This will make it more accessible and consistent with other editing features.

### Key Files to Modify

1. **Sidebar Icons**
   - File: `src/features/map/components/Sidebar/icons.js`
   - Change: Add a new icon for the Map Overview button

2. **Sidebar List Items**
   - File: `src/features/map/components/Sidebar/SidebarListItems.js`
   - Change: Add a new item to the `topItems` array for the Map Overview button

3. **Sidebar Hook**
   - File: `src/features/map/components/Sidebar/useSidebar.js`
   - Change: Add a new handler function to toggle the Map Overview drawer

4. **Sidebar Component**
   - File: `src/features/map/components/Sidebar/Sidebar.js`
   - Change: Modify to include the Map Overview drawer

5. **Map Overview Drawer**
   - File: `src/features/presentation/components/MapOverview/MapOverviewDrawer.jsx` (new file)
   - Change: Create a new drawer component that uses the existing `EditableMapOverviewPanel`

6. **Elevation Profile Panel**
   - File: `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`
   - Change: Remove the Map Overview tab

### Implementation Steps

#### 1. Add Map Overview Icon to Sidebar Icons

In `src/features/map/components/Sidebar/icons.js`, add a new icon for the Map Overview button:

```javascript
import { Route, Upload, Save, FolderOpen, Camera, MapPin, Eraser, RefreshCw, Code, Settings2, FileText } from 'lucide-react';

export const SidebarIcons = {
    actions: {
        gpx: Route,
        upload: Upload,
        save: Save,
        load: FolderOpen,
        photos: Camera,
        poi: MapPin,
        clear: Eraser,
        embed: Code,
        line: Settings2,
        mapOverview: FileText  // New icon for Map Overview
    }
};
```

#### 2. Add Map Overview Button to Sidebar List Items

In `src/features/map/components/Sidebar/SidebarListItems.js`, add a new item to the `topItems` array:

```javascript
const topItems = [
    {
        id: 'gpx',
        icon: SidebarIcons.actions.gpx,
        text: 'Add GPX',
        onClick: () => {
            onItemClick('gpx');
            onUploadGpx();
        }
    },
    {
        id: 'photos',
        icon: SidebarIcons.actions.photos,
        text: 'Add GPS Photo',
        onClick: onAddPhotos
    },
    {
        id: 'poi',
        icon: SidebarIcons.actions.poi,
        text: 'Add POI',
        onClick: onAddPOI
    },
    {
        id: 'line',
        icon: SidebarIcons.actions.line,
        text: 'Add Line',
        onClick: () => {
            onItemClick('line');
            onAddLine();
        }
    },
    {
        id: 'mapOverview',
        icon: SidebarIcons.actions.mapOverview,
        text: 'Map Overview',
        onClick: () => {
            onItemClick('mapOverview');
            onAddMapOverview();
        }
    }
];
```

#### 3. Add Map Overview Handler to Sidebar Hook

In `src/features/map/components/Sidebar/useSidebar.js`, add a new handler function:

```javascript
const handleAddMapOverview = () => {
    if (activeDrawer === 'mapOverview') {
        setIsDrawerOpen(false);
        setActiveDrawer(null);
    } else {
        setIsDrawerOpen(true);
        setActiveDrawer('mapOverview');
        props.onItemClick('mapOverview');
    }
};

// Add to the return object
return {
    // existing properties...
    handleAddMapOverview,
};
```

#### 4. Modify Sidebar Component to Include Map Overview Drawer

In `src/features/map/components/Sidebar/Sidebar.js`, update the component to include the Map Overview drawer:

```javascript
// Add import for the new drawer component
const LazyMapOverviewDrawer = lazy(() => import('../../../presentation/components/MapOverview/MapOverviewDrawer'));

export const Sidebar = (props) => {
    const { isDrawerOpen, activeDrawer, handleUploadGpx, handleAddPOI, handleAddPhotos, handleAddLine, handleAddMapOverview } = useSidebar(props);
    
    // Update activeDrawerContent to include the Map Overview drawer
    const activeDrawerContent = useMemo(() => {
        switch (activeDrawer) {
            case 'gpx':
                return (_jsx(Suspense, { fallback: _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(CircularProgress, {}) }), children: _jsx(LazyUploader, { onUploadComplete: handleUploadComplete, onDeleteRoute: props.onDeleteRoute }) }));
            case 'photos':
                return (_jsx(Suspense, { fallback: _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(CircularProgress, {}) }), children: _jsx(LazyPhotoUploader, { onUploadComplete: addPhoto, onDeletePhoto: deletePhoto }) }));
            case 'mapOverview':
                return (_jsx(Suspense, { fallback: _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(CircularProgress, {}) }), children: _jsx(LazyMapOverviewDrawer, {}) }));
            case 'poi':
                return null; // POI drawer is handled by NestedDrawer
            default:
                return null;
        }
    }, [activeDrawer, handleUploadComplete, handleAddPOI, props.onDeleteRoute]);
    
    // Update SidebarListItems props
    return (_jsxs(_Fragment, { children: [_jsx(StyledDrawer, { variant: "permanent", children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(SidebarListItems, { 
        ...props, 
        onUploadGpx: () => handleUploadGpx(), 
        onAddPOI: () => handleAddPOI(), 
        onAddPhotos: () => handleAddPhotos(),
        onAddLine: () => handleAddLine(),
        onAddMapOverview: () => handleAddMapOverview()
    }), _jsx(Auth0Login, {})] }) }), /* rest of the component */ ] }));
};
```

#### 5. Create Map Overview Drawer Component

Create a new file `src/features/presentation/components/MapOverview/MapOverviewDrawer.jsx`:

```jsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EditableMapOverviewPanel } from './EditableMapOverviewPanel';

const MapOverviewDrawer = ({ onClose }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'rgb(35, 35, 35)',
      color: 'white'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h6">Map Overview</Typography>
        {onClose && (
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <EditableMapOverviewPanel />
      </Box>
    </Box>
  );
};

export default MapOverviewDrawer;
```

#### 6. Remove Map Overview Tab from Elevation Profile Panel

In `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`, remove the Map Overview tab:

```javascript
// Remove this tab button
_jsx(TabButton, {
    tab: 'mapOverview',
    label: 'Map Overview',
    activeTab: activeTab,
    onClick: () => setActiveTab('mapOverview'),
    isCollapsed: isCollapsed,
    setIsCollapsed: setIsCollapsed
})

// Remove this rendering logic
activeTab === 'mapOverview'
    ? _jsxs(MapOverviewContextAdapter, { 
        children: [
          _jsx(MapOverviewLoader, {}),
          _jsx(PresentationMapOverviewPanel, { key: "mapOverview" })
        ]
      })
    : null
```

## Benefits

1. **Improved User Experience**: The Map Overview editor will be more accessible from the sidebar, consistent with other editing features.
2. **Simplified Elevation Profile Panel**: The elevation profile panel will be simpler with fewer tabs.
3. **Better Organization**: The Map Overview editor will have its own dedicated space, making it more prominent and easier to find.

## Testing Plan

1. Test that the Map Overview button appears in the sidebar in creation mode.
2. Test that clicking the button opens the Map Overview drawer.
3. Test that the drawer contains the same editing functionality as the previous tab implementation.
4. Test that the Map Overview data is saved correctly when edited in the drawer.
5. Test that the Map Overview tab is removed from the elevation profile panel.
6. Test that the Map Overview is still displayed correctly in presentation and embed modes.

# Part 2: Map Overview in Presentation & Embed Mode

**Status: COMPLETE ✅**

## Overview

This section outlines the plan to implement the Map Overview in Presentation and Embed modes with its own icon and drawer in the sidebar, similar to how it's implemented in creation mode.

## Current Implementation

Currently, in Presentation and Embed mode, the Map Overview is displayed in the elevation profile tabs:

- In Presentation mode, it's rendered in `PresentationElevationProfilePanel.js` as one of the tabs
- In Embed mode, it follows the same pattern in the elevation profile panel
- The content is displayed using `PresentationMapOverviewPanel.js`

### Data Loading from MongoDB

The Map Overview data is loaded differently depending on the mode:

1. **Presentation Mode**:
   - The `MapOverviewLoader.jsx` component fetches the data directly from MongoDB
   - It makes an API call to `/api/routes?id=${routeId}&mapoverview=true` to get the Map Overview data
   - The API returns the Map Overview data from the `mapOverview` field of the route document
   - The data is then set in the shared store using `setMapOverviewData()`

2. **Embed Mode**:
   - The `MapOverviewInitializer.jsx` component sets the data from the `routeData` object
   - The `routeData` object already contains the Map Overview data in the `mapOverview` field
   - The data is set in the shared store using `setMapOverviewData()`

In both cases, the data is stored in the shared store (`mapOverviewStore.js`) and accessed by the `PresentationMapOverviewPanel` component through the `useMapOverview` hook.

## Proposed Changes

Instead of adding the Map Overview to the route list drawer as originally planned, we want to give it its own icon and drawer in the sidebar, similar to how it's implemented in creation mode:

1. Remove the Map Overview tab from the elevation profile panel
2. Add a Map Overview icon to the sidebar below the route list icon
3. Create a drawer component for the Map Overview that will be shown when the icon is clicked
4. Ensure the drawer has the same width as in creation mode

### Key Files to Modify

1. **Presentation Elevation Profile Panel**
   - File: `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`
   - Change: Remove the Map Overview tab and related rendering logic

2. **Presentation Sidebar**
   - File: `src/features/presentation/components/PresentationSidebar/PresentationSidebar.js`
   - Change: Add a Map Overview icon to the sidebar and a handler to toggle the Map Overview drawer

3. **Embed Sidebar**
   - File: `src/features/presentation/components/EmbedMapView/components/EmbedSidebar.jsx`
   - Change: Add a Map Overview icon to the sidebar and a handler to toggle the Map Overview drawer

4. **Presentation Map Overview Drawer Component**
   - File: `src/features/presentation/components/MapOverview/PresentationMapOverviewDrawer.jsx` (new file)
   - Change: Create a new drawer component that uses the existing `PresentationMapOverviewPanel`

### Implementation Steps

#### 1. Create Presentation Map Overview Drawer Component

Create a new file `src/features/presentation/components/MapOverview/PresentationMapOverviewDrawer.jsx`:

```jsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PresentationMapOverviewPanel } from './PresentationMapOverviewPanel';
import MapOverviewContextAdapter from '../EmbedMapView/components/MapOverviewContextAdapter';
import MapOverviewLoader from './MapOverviewLoader';

const PresentationMapOverviewDrawer = ({ onClose }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'rgb(35, 35, 35)',
      color: 'white'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h6">Map Overview</Typography>
        {onClose && (
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <MapOverviewContextAdapter>
          <MapOverviewLoader />
          <PresentationMapOverviewPanel />
        </MapOverviewContextAdapter>
      </Box>
    </Box>
  );
};

export default PresentationMapOverviewDrawer;
```

#### 2. Remove Map Overview Tab from Elevation Profile Panel

In `src/features/presentation/components/ElevationProfile/PresentationElevationProfilePanel.js`, remove the Map Overview tab button and rendering logic:

```javascript
// Remove this tab button
_jsx(TabButton, {
    tab: 'mapOverview',
    label: 'Map Overview',
    activeTab: activeTab,
    onClick: () => setActiveTab('mapOverview'),
    isCollapsed: isCollapsed,
    setIsCollapsed: setIsCollapsed
})

// Remove this rendering logic
activeTab === 'mapOverview'
    ? _jsxs(MapOverviewContextAdapter, { 
        children: [
          _jsx(MapOverviewLoader, {}),
          _jsx(PresentationMapOverviewPanel, { key: "mapOverview" })
        ]
      })
    : null
```

#### 3. Add Map Overview Icon and Drawer to Presentation Sidebar

In `src/features/presentation/components/PresentationSidebar/PresentationSidebar.js`, add the Map Overview icon and drawer:

```javascript
// Add imports
import { FileText } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { CircularProgress } from '@mui/material';

// Add lazy-loaded drawer component
const LazyMapOverviewDrawer = lazy(() => import('../MapOverview/PresentationMapOverviewDrawer'));

// Inside the component
export const PresentationSidebar = ({ isOpen, isDistanceMarkersVisible, toggleDistanceMarkersVisibility, isClimbFlagsVisible, toggleClimbFlagsVisibility, isLineMarkersVisible, toggleLineMarkersVisibility }) => {
    // Add state for Map Overview drawer
    const [isMapOverviewOpen, setIsMapOverviewOpen] = useState(false);
    
    // Add handler for Map Overview icon click
    const toggleMapOverviewDrawer = () => {
        setIsMapOverviewOpen(!isMapOverviewOpen);
    };
    
    // Add Map Overview icon to the sidebar list after the Routes icon
    return (_jsxs(ErrorBoundary, { children: [
        _jsx(StyledDrawer, { 
            variant: "permanent", 
            anchor: "left", 
            children: _jsxs(List, { 
                children: [
                    // Routes icon at the very top
                    _jsx(Tooltip, { 
                        title: "Routes", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => {
                                setIsNestedOpen(!isNestedOpen);
                            },
                            'data-active': isNestedOpen,
                            sx: {
                                ...listItemButtonStyle,
                                '&[data-active="true"] .MuiListItemIcon-root svg': {
                                    color: '#2196f3'
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(ListOrdered, {}) 
                            }) 
                        }) 
                    }),
                    
                    // Add Map Overview icon below Routes icon
                    _jsx(Tooltip, { 
                        title: "Map Overview", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: toggleMapOverviewDrawer,
                            'data-active': isMapOverviewOpen,
                            sx: {
                                ...listItemButtonStyle,
                                '&[data-active="true"] .MuiListItemIcon-root svg': {
                                    color: '#2196f3'
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(FileText, {}) 
                            }) 
                        }) 
                    }),
                    
                    _jsx(Divider, { 
                        sx: { 
                            my: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                        } 
                    }),
                    
                    // Rest of the icons...
                ] 
            }) 
        }),
        
        // Add Map Overview drawer
        _jsx(NestedDrawer, {
            variant: "persistent",
            anchor: "left",
            open: isMapOverviewOpen,
            sx: {
                '& .MuiDrawer-paper': {
                    top: '64px', // Position below the header
                    height: 'calc(100% - 64px)', // Adjust height to account for header
                    marginLeft: '56px', // Account for the sidebar width
                    paddingTop: '0px' // Remove any top padding
                }
            },
            children: _jsx(Suspense, {
                fallback: _jsx(CircularProgress, {}),
                children: _jsx(LazyMapOverviewDrawer, {
                    onClose: () => setIsMapOverviewOpen(false)
                })
            })
        }),
        
        // Existing nested drawer for routes
        _jsx(NestedDrawer, { 
            variant: "persistent", 
            anchor: "left", 
            open: isNestedOpen,
            sx: {
                '& .MuiDrawer-paper': {
                    top: '64px', // Position below the header
                    height: 'calc(100% - 64px)', // Adjust height to account for header
                    marginLeft: '56px', // Account for the sidebar width
                    paddingTop: '0px' // Remove any top padding
                }
            },
            children: /* existing routes drawer content */
        })
    ] }));
};
```

#### 4. Add Map Overview Icon and Drawer to Embed Sidebar

In `src/features/presentation/components/EmbedMapView/components/EmbedSidebar.jsx`, add the Map Overview icon and drawer:

```javascript
// Add imports
import { FileText } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { CircularProgress } from '@mui/material';

// Add lazy-loaded drawer component
const LazyMapOverviewDrawer = lazy(() => import('../../../MapOverview/PresentationMapOverviewDrawer'));

// Inside the component
const EmbedSidebar = ({ 
  isOpen, 
  isDistanceMarkersVisible, 
  toggleDistanceMarkersVisibility,
  routeData,
  currentRoute,
  setCurrentRoute,
  isPhotosVisible,
  togglePhotosVisibility,
  isClimbFlagsVisible,
  toggleClimbFlagsVisibility,
  isLineMarkersVisible,
  toggleLineMarkersVisibility,
  visiblePOICategories,
  togglePOICategoryVisibility,
  routeVisibility,
  toggleRouteVisibility,
  map
}) => {
  const [isNestedOpen, setIsNestedOpen] = useState(true);
  const [allComponentsDisabled, setAllComponentsDisabled] = useState(false);
  const [previouslyVisiblePOICategories, setPreviouslyVisiblePOICategories] = useState([]);
  
  // Add state for Map Overview drawer
  const [isMapOverviewOpen, setIsMapOverviewOpen] = useState(false);
  
  // Add handler for Map Overview icon click
  const toggleMapOverviewDrawer = () => {
    setIsMapOverviewOpen(!isMapOverviewOpen);
  };
  
  // Rest of the component...
  
  return (
    <>
      <StyledDrawer variant="permanent" anchor="left">
        <List>
          {/* Routes icon at the very top */}
          <Tooltip title="Routes" placement="right">
            <ListItemButton
              onClick={() => setIsNestedOpen(!isNestedOpen)}
              data-active={isNestedOpen}
              sx={{
                ...listItemButtonStyle,
                '&[data-active="true"] .MuiListItemIcon-root svg': {
                  color: '#2196f3'
                }
              }}
            >
              <ListItemIcon>
                <ListOrdered />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          {/* Add Map Overview icon below Routes icon */}
          <Tooltip title="Map Overview" placement="right">
            <ListItemButton
              onClick={toggleMapOverviewDrawer}
              data-active={isMapOverviewOpen}
              sx={{
                ...listItemButtonStyle,
                '&[data-active="true"] .MuiListItemIcon-root svg': {
                  color: '#2196f3'
                }
              }}
            >
              <ListItemIcon>
                <FileText />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Divider sx={{ my: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* Rest of the icons... */}
        </List>
      </StyledDrawer>
      
      {/* Add Map Overview drawer */}
      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isMapOverviewOpen}
        sx={{
          '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
          }
        }}
      >
        <Suspense fallback={<CircularProgress />}>
          <LazyMapOverviewDrawer
            onClose={() => setIsMapOverviewOpen(false)}
          />
        </Suspense>
      </NestedDrawer>
      
      {/* Existing nested drawer for routes */}
      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isNestedOpen}
        sx={{
          '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
          }
        }}
      >
        {/* Existing routes drawer content */}
      </NestedDrawer>
    </>
  );
};
```

## Benefits

1. **Consistent User Experience**: The Map Overview will have the same implementation in both creation and presentation/embed modes.
2. **Better Organization**: The Map Overview will have its own dedicated space, making it more prominent and easier to find.
3. **Improved Usability**: Users will be able to access the Map Overview directly from the sidebar, without having to navigate through the elevation profile tabs.
4. **Simplified Elevation Profile Panel**: The elevation profile panel will be simpler with fewer tabs.

## Testing Plan

1. Test that the Map Overview tab is removed from the elevation profile panel in Presentation and Embed modes.
2. Test that the Map Overview icon appears in the sidebar below the Routes icon.
3. Test that clicking the Map Overview icon opens the Map Overview drawer.
4. Test that the drawer has the same width as in creation mode.
5. Test that the Map Overview content is displayed correctly in the drawer.
6. Test that the Map Overview data is loaded correctly from the route document.
7. Test that the drawer can be closed by clicking the close button or clicking the Map Overview icon again.
8. Test that the drawer works correctly in both Presentation and Embed modes.

## Implementation Notes

The implementation has been completed with the following enhancements:

1. Added dynamic icon switching - when a drawer is open, its icon changes to a chevron-left icon
2. Made all icons white instead of blue when active for better visibility and consistency
3. Implemented mutual exclusivity between drawers to ensure only one drawer is open at a time
4. Added a double-width drawer (528px) for Map Overview to match creation mode
5. Added proper transparency and blur effects for better visibility of the map behind the drawer
