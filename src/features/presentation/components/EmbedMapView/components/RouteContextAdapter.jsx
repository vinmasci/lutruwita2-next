import React from 'react';
import { RouteProvider } from '../../../../map/context/RouteContext';
import { useEmbedRouteContext } from '../context/EmbedRouteContext';

/**
 * RouteContextAdapter component
 * 
 * This component acts as a bridge between EmbedRouteContext and RouteContext.
 * It consumes the EmbedRouteContext and provides a compatible RouteContext to its children.
 * This allows components that use useRouteContext to work within the EmbedMapView.
 */
const RouteContextAdapter = ({ children }) => {
  // Get data from EmbedRouteContext
  const embedRouteContext = useEmbedRouteContext();
  
  // Create a compatible value for RouteContext
  const routeContextValue = {
    // Map embedRouteContext properties to routeContext properties
    routes: embedRouteContext.routes,
    currentRoute: embedRouteContext.currentRoute,
    addRoute: embedRouteContext.addRoute,
    deleteRoute: embedRouteContext.deleteRoute,
    setCurrentRoute: embedRouteContext.setCurrentRoute,
    focusRoute: embedRouteContext.focusRoute,
    unfocusRoute: embedRouteContext.unfocusRoute,
    updateRoute: embedRouteContext.updateRoute,
    reorderRoutes: embedRouteContext.reorderRoutes,
    
    // Saved routes state
    savedRoutes: embedRouteContext.savedRoutes,
    isSaving: embedRouteContext.isSaving,
    isLoading: embedRouteContext.isLoading,
    isLoadedMap: embedRouteContext.isLoadedMap,
    currentLoadedState: embedRouteContext.currentLoadedState,
    currentLoadedPersistentId: embedRouteContext.currentLoadedPersistentId,
    hasUnsavedChanges: embedRouteContext.hasUnsavedChanges,
    
    // Change tracking
    setChangedSections: embedRouteContext.setChangedSections,
    
    // Save/Load operations
    saveCurrentState: embedRouteContext.saveCurrentState,
    loadRoute: embedRouteContext.loadRoute,
    listRoutes: embedRouteContext.listRoutes,
    deleteSavedRoute: embedRouteContext.deleteSavedRoute,
    clearCurrentWork: embedRouteContext.clearCurrentWork,
    pendingRouteBounds: embedRouteContext.pendingRouteBounds,
    
    // Header settings
    headerSettings: embedRouteContext.headerSettings,
    updateHeaderSettings: embedRouteContext.updateHeaderSettings,
    
    // Line data
    loadedLineData: embedRouteContext.loadedLineData
  };
  
  // Provide RouteContext with the adapted value
  return (
    <RouteProvider value={routeContextValue}>
      {children}
    </RouteProvider>
  );
};

export default RouteContextAdapter;
