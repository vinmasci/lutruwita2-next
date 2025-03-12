# EmbedMapView Refactoring Plan

This document outlines a plan to refactor the `EmbedMapView.jsx` component by breaking it down into smaller, more manageable files. The goal is to improve code maintainability and readability by extracting logical sections into separate files.

## Current Structure

The `EmbedMapView.jsx` file is currently a large component that handles:
- Elevation calculations
- Data loading and processing
- Map initialization and configuration
- Photo clustering
- UI rendering
- Various toggle functions for map features

## Refactoring Approach

We'll take an incremental approach, extracting one section at a time to ensure the application remains functional throughout the refactoring process.

## Sections to Extract

### 1. Elevation Calculation Utilities
- **Target File**: `src/features/presentation/components/EmbedMapView/utils/elevationUtils.js`
- **Description**: Pure utility functions for elevation calculations
- **Functions to Extract**:
  - `calculateElevationGained`
  - `calculateElevationLost`
  - `calculateElevationFromArray`
  - `calculateElevationLostFromArray`
- **Checklist**:
  - [ ] Create the utils directory if it doesn't exist
  - [ ] Create the elevationUtils.js file
  - [ ] Extract the elevation calculation functions
  - [ ] Export the functions
  - [ ] Update imports in EmbedMapView.jsx
  - [ ] Test to ensure functionality is maintained

### 2. Data Loading Logic
- **Target File**: `src/features/presentation/components/EmbedMapView/hooks/useRouteDataLoader.js`
- **Description**: Custom hook to handle loading route data from Cloudinary or API
- **Logic to Extract**:
  - The large useEffect hook that handles loading route data
  - Processing and enhancing route data
- **Checklist**:
  - [ ] Create the hooks directory if it doesn't exist
  - [ ] Create the useRouteDataLoader.js file
  - [ ] Extract the data loading logic into a custom hook
  - [ ] Return necessary state values and setter functions
  - [ ] Update EmbedMapView.jsx to use the new hook
  - [ ] Test to ensure data loading works correctly

### 3. Map Initialization Logic
- **Target File**: `src/features/presentation/components/EmbedMapView/hooks/useMapInitialization.js`
- **Description**: Custom hook to handle map initialization and controls
- **Logic to Extract**:
  - The useEffect hook that initializes the map
  - Adding map controls
  - Setting up event listeners
- **Checklist**:
  - [ ] Create the useMapInitialization.js file
  - [ ] Extract the map initialization logic into a custom hook
  - [ ] Return the map instance and map ready state
  - [ ] Update EmbedMapView.jsx to use the new hook
  - [ ] Test to ensure map initialization works correctly

### 4. Photo Clustering Logic
- **Target File**: `src/features/presentation/components/EmbedMapView/hooks/usePhotoClusteringEffect.js`
- **Description**: Custom hook to handle photo clustering based on zoom level
- **Logic to Extract**:
  - The useEffect hook that handles photo clustering
  - Logic for filtering valid photos
- **Checklist**:
  - [ ] Create the usePhotoClusteringEffect.js file
  - [ ] Extract the photo clustering logic into a custom hook
  - [ ] Return the clustered photos
  - [ ] Update EmbedMapView.jsx to use the new hook
  - [ ] Test to ensure photo clustering works correctly

### 5. Map Fitting Logic
- **Target File**: `src/features/presentation/components/EmbedMapView/hooks/useMapFitToRoute.js`
- **Description**: Custom hook to fit the map to route bounds
- **Logic to Extract**:
  - The useEffect hook that fits the map to route bounds
  - Calculating bounds from route coordinates
- **Checklist**:
  - [ ] Create the useMapFitToRoute.js file
  - [ ] Extract the map fitting logic into a custom hook
  - [ ] Update EmbedMapView.jsx to use the new hook
  - [ ] Test to ensure map fitting works correctly

### 6. Toggle Functions
- **Target File**: `src/features/presentation/components/EmbedMapView/utils/toggleHandlers.js`
- **Description**: Utility functions for toggling map features
- **Functions to Extract**:
  - `toggleDistanceMarkersVisibility`
  - `togglePhotosVisibility`
  - `handleClusterClick`
  - `togglePOICategoryVisibility`
  - `toggleRouteVisibility`
- **Checklist**:
  - [ ] Create the toggleHandlers.js file
  - [ ] Extract the toggle functions
  - [ ] Adapt functions to accept necessary parameters
  - [ ] Export the functions
  - [ ] Update EmbedMapView.jsx to use the new functions
  - [ ] Test to ensure toggle functionality works correctly

### 7. UI Components
- **Description**: Extract UI components into separate files
- **Components to Extract**:

#### 7.1 Loading Overlay
- **Target File**: `src/features/presentation/components/EmbedMapView/components/LoadingOverlay.jsx`
- **Checklist**:
  - [ ] Create the LoadingOverlay.jsx file
  - [ ] Extract the loading overlay component
  - [ ] Update EmbedMapView.jsx to use the new component
  - [ ] Test to ensure loading overlay works correctly

#### 7.2 Error Overlay
- **Target File**: `src/features/presentation/components/EmbedMapView/components/ErrorOverlay.jsx`
- **Checklist**:
  - [ ] Create the ErrorOverlay.jsx file
  - [ ] Extract the error overlay component
  - [ ] Update EmbedMapView.jsx to use the new component
  - [ ] Test to ensure error overlay works correctly

#### 7.3 Route Filename Display
- **Target File**: `src/features/presentation/components/EmbedMapView/components/RouteFilename.jsx`
- **Checklist**:
  - [ ] Create the RouteFilename.jsx file
  - [ ] Extract the route filename component
  - [ ] Update EmbedMapView.jsx to use the new component
  - [ ] Test to ensure route filename display works correctly

#### 7.4 Elevation Container
- **Target File**: `src/features/presentation/components/EmbedMapView/components/ElevationContainer.jsx`
- **Checklist**:
  - [ ] Create the ElevationContainer.jsx file
  - [ ] Extract the elevation container component
  - [ ] Update EmbedMapView.jsx to use the new component
  - [ ] Test to ensure elevation container works correctly

### 8. Main Component Refactoring
- **Target File**: `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`
- **Description**: Update the main component to use all extracted pieces
- **Checklist**:
  - [ ] Update imports to use all extracted components and hooks
  - [ ] Simplify the main component to focus on composition
  - [ ] Remove duplicated code
  - [ ] Test the entire component to ensure all functionality is maintained

## Implementation Strategy

To implement these changes safely:

1. Start with extracting the utility functions (elevation calculations, toggle handlers)
2. Then extract the UI components (loading overlay, error overlay, etc.)
3. Next extract the custom hooks (data loading, map initialization)
4. Finally, update the main component to use all these extracted pieces

This approach allows us to refactor one section at a time while keeping the application functional throughout the process.

## Benefits of Refactoring

- **Improved Maintainability**: Smaller files are easier to understand and maintain
- **Better Code Organization**: Logical separation of concerns
- **Enhanced Reusability**: Extracted functions and components can be reused elsewhere
- **Easier Testing**: Smaller, focused components and functions are easier to test
- **Simplified Main Component**: The main component becomes more focused on composition rather than implementation details

## Progress Tracking

- [ ] Elevation Calculation Utilities
- [ ] Data Loading Logic
- [ ] Map Initialization Logic
- [ ] Photo Clustering Logic
- [ ] Map Fitting Logic
- [ ] Toggle Functions
- [ ] UI Components
  - [ ] Loading Overlay
  - [ ] Error Overlay
  - [ ] Route Filename Display
  - [ ] Elevation Container
- [ ] Main Component Refactoring
