import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouteService } from "../services/routeService";
import { SavedRouteState, RouteListItem, ProcessedRoute, SerializedPhoto, serializePhoto, deserializePhoto, LoadedRoute } from "../types/route.types";
import { useMapContext } from "./MapContext";
import { DraggablePOI, PlaceNamePOI } from "../../poi/types/poi.types";
import { usePOIContext } from "../../poi/context/POIContext";
import { usePhotoContext } from "../../photo/context/PhotoContext";
import { usePlaceContext } from "../../place/context/PlaceContext";
import { normalizeRoute } from "../utils/routeUtils";

// Type guard to check if a route is a LoadedRoute
const isLoadedRoute = (route: ProcessedRoute): route is LoadedRoute => {
  return route._type === 'loaded';
};

interface RouteContextType {
  // Local route state
  routes: ProcessedRoute[];
  currentRoute: ProcessedRoute | null;
  addRoute: (route: ProcessedRoute) => void;
  deleteRoute: (routeId: string) => void;
  setCurrentRoute: (route: ProcessedRoute | null) => void;
  focusRoute: (routeId: string) => void;
  unfocusRoute: (routeId: string) => void;
  
  // Saved routes state
  savedRoutes: RouteListItem[];
  isSaving: boolean;
  isLoading: boolean;
  isLoadedMap: boolean;
  currentLoadedState: SavedRouteState | null;
  currentLoadedRouteId: string | null;
  hasUnsavedChanges: boolean;
  
  // Save/Load operations
  saveCurrentState: (name: string, type: "tourism" | "event" | "bikepacking" | "single", isPublic: boolean) => Promise<void>;
  loadRoute: (id: string) => Promise<void>;
  listRoutes: (filters?: { type?: string; isPublic?: boolean }) => Promise<void>;
  deleteSavedRoute: (id: string) => Promise<void>;
  clearCurrentWork: () => void;
}

const RouteContext = createContext<RouteContextType | null>(null);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Local route state
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [currentRoute, setCurrentRoute] = useState<ProcessedRoute | null>(null);
  
  const focusRoute = useCallback((routeId: string) => {
    setRoutes(prev => prev.map(route => ({
      ...route,
      isFocused: route.routeId === routeId
    })));
  }, []);

  const unfocusRoute = useCallback((routeId: string) => {
    setRoutes(prev => prev.map(route => ({
      ...route,
      isFocused: route.routeId === routeId ? false : route.isFocused
    })));
  }, []);

  const setCurrentRouteWithDebug = useCallback((route: ProcessedRoute | null) => {
    console.debug('[RouteContext] Setting current route:', {
      from: currentRoute ? {
        routeId: currentRoute.routeId,
        type: currentRoute._type,
        hasLoadedState: isLoadedRoute(currentRoute) && !!currentRoute._loadedState,
        hasGeojson: !!currentRoute.geojson,
        loadedStateId: isLoadedRoute(currentRoute) ? currentRoute._loadedState?.id : undefined
      } : 'none',
      to: route ? {
        routeId: route.routeId,
        type: route._type,
        hasLoadedState: isLoadedRoute(route) && !!route._loadedState,
        hasGeojson: !!route.geojson,
        loadedStateId: isLoadedRoute(route) ? route._loadedState?.id : undefined
      } : 'none'
    });
    setCurrentRoute(route);
  }, [currentRoute]);

  // Saved routes state
  const [savedRoutes, setSavedRoutes] = useState<RouteListItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadedMap, setIsLoadedMap] = useState(false);
  const [currentLoadedState, setCurrentLoadedState] = useState<SavedRouteState | null>(null);
  const [currentLoadedRouteId, setCurrentLoadedRouteId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Context hooks
  const routeService = useRouteService();
  const { map } = useMapContext();
  const { pois, getPOIsForRoute, loadPOIsFromRoute } = usePOIContext();
  const { photos, addPhoto } = usePhotoContext();
  const { places, updatePlace } = usePlaceContext();

  const addRoute = useCallback((route: ProcessedRoute) => {
    console.debug('[RouteContext] Adding route:', {
      routeId: route.routeId,
      type: route._type,
      hasLoadedState: !!currentLoadedState,
      existingRoutes: routes.length,
      hasGeojson: !!route.geojson
    });

    setRoutes((prev) => {
      let baseRoutes: ProcessedRoute[] = [];
      
      // If we have a loaded state, start with routes from that state
      if (currentLoadedState) {
        baseRoutes = currentLoadedState.routes.map(r => ({
          ...r,
          _type: 'loaded' as const,
          _loadedState: currentLoadedState
        }));
      }
      
      // Filter out any existing route with the same ID from both loaded and fresh routes
      const filtered = baseRoutes.filter(r => r.id !== route.id);
      const freshRoutes = prev.filter(r => r._type === 'fresh' && r.id !== route.id);
      
      // Add the new route
      const processedRoute = currentLoadedState ? {
        ...route,
        _type: 'loaded' as const,
        _loadedState: currentLoadedState
      } : {
        ...route,
        _type: 'fresh' as const
      };
      
      console.debug('[RouteContext] Processed route:', {
        routeId: processedRoute.routeId,
        type: processedRoute._type,
        hasGeojson: !!processedRoute.geojson,
        hasLoadedState: isLoadedRoute(processedRoute) && !!processedRoute._loadedState
      });
      
      setHasUnsavedChanges(true);
      return [...filtered, ...freshRoutes, processedRoute];
    });
  }, [currentLoadedState]);

  const deleteRoute = useCallback((routeId: string) => {
    console.debug('[RouteContext][DELETE] Starting deletion process for route:', routeId);
    console.debug('[RouteContext][DELETE] Current state:', {
      allRoutes: routes.map(r => ({
        id: r.id,
        routeId: r.routeId,
        name: r.name,
        type: r._type,
        isCurrentRoute: currentRoute?.routeId === r.routeId
      })),
      currentRoute: currentRoute ? {
        id: currentRoute.id,
        routeId: currentRoute.routeId,
        name: currentRoute.name,
        type: currentRoute._type
      } : null
    });
    
    // Clean up map layers first if we have access to the map
    if (map) {
      console.debug('[RouteContext][DELETE] Cleaning up map layers for route:', routeId);
      const cleanupLayers = (routeId: string) => {
        const style = map.getStyle();
        if (!style) return;
        
        // Find and remove all layers for this route
        const routeLayers = style.layers
          ?.filter(layer => layer.id.startsWith(routeId))
          .map(layer => layer.id) || [];
        
        console.debug('[RouteContext][DELETE] Found layers to remove:', routeLayers);
          
        routeLayers.forEach(layerId => {
          if (map.getLayer(layerId)) {
            try {
              console.debug('[RouteContext][DELETE] Removing layer:', layerId);
              map.removeLayer(layerId);
            } catch (error) {
              console.error('[RouteContext][DELETE] Error removing layer:', layerId, error);
            }
          }
        });
        
        // Remove associated sources
        const routeSources = [`${routeId}-main`];
        console.debug('[RouteContext][DELETE] Removing sources:', routeSources);
        
        routeSources.forEach(sourceId => {
          if (map.getSource(sourceId)) {
            try {
              console.debug('[RouteContext][DELETE] Removing source:', sourceId);
              map.removeSource(sourceId);
            } catch (error) {
              console.error('[RouteContext][DELETE] Error removing source:', sourceId, error);
            }
          }
        });
      };
      
      cleanupLayers(routeId);
    }
    
    setRoutes((prev) => {
      console.debug('[RouteContext][DELETE] Filtering routes. Before:', {
        count: prev.length,
        routes: prev.map(r => ({
          id: r.id,
          routeId: r.routeId,
          name: r.name,
          type: r._type,
          matchesDeleteId: r.routeId === routeId
        }))
      });

      const filtered = prev.filter((route) => {
        const shouldKeep = route.routeId !== routeId;
        console.debug('[RouteContext][DELETE] Route evaluation:', {
          routeId: route.routeId,
          name: route.name,
          type: route._type,
          matchesDeleteId: route.routeId === routeId,
          shouldKeep
        });
        return shouldKeep;
      });

      console.debug('[RouteContext][DELETE] Routes after filtering:', {
        count: filtered.length,
        remainingIds: filtered.map(r => ({
          id: r.id,
          routeId: r.routeId,
          name: r.name,
          type: r._type
        }))
      });
      return filtered;
    });
    
    setCurrentRoute((prev) => {
      console.debug('[RouteContext][DELETE] Updating current route:', {
        previous: prev ? {
          id: prev.id,
          routeId: prev.routeId,
          name: prev.name,
          type: prev._type
        } : null,
        isBeingDeleted: prev?.routeId === routeId
      });

      const newCurrent = prev?.routeId === routeId ? null : prev;
      
      console.debug('[RouteContext][DELETE] New current route:', newCurrent ? {
        id: newCurrent.id,
        routeId: newCurrent.routeId,
        name: newCurrent.name,
        type: newCurrent._type
      } : null);
      
      return newCurrent;
    });
    
    setHasUnsavedChanges(true);
    console.debug('[RouteContext][DELETE] Deletion process complete for route:', routeId);
  }, [map]);

  // Clear current work
  const clearCurrentWork = useCallback(() => {
    console.debug('[RouteContext] Clearing current work');
    
    // Clean up map layers for all routes first
    if (map) {
      routes.forEach(route => {
        const routeId = route.routeId || route.id;
        console.debug('[RouteContext] Cleaning up map layers for route:', routeId);
        const style = map.getStyle();
        if (!style) return;
        
        // Find and remove all layers for this route
        const routeLayers = style.layers
          ?.filter(layer => layer.id.startsWith(routeId))
          .map(layer => layer.id) || [];
          
        routeLayers.forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        });
        
        // Remove associated sources
        const routeSources = [`${routeId}-main`];
        routeSources.forEach(sourceId => {
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        });
      });
    }
    
    setRoutes([]);
    setCurrentRoute(null);
    setCurrentLoadedState(null);
    setCurrentLoadedRouteId(null);
    setHasUnsavedChanges(false);
    setIsLoadedMap(false);
  }, [map, routes]);

  // Save current state to backend
  // Helper function to round coordinates to 5 decimal places
  const roundCoordinate = (value: number): number => {
    return Number(value.toFixed(5));
  };

  // Helper function to round coordinates in route data
  const roundRouteCoordinates = (route: ProcessedRoute): ProcessedRoute => {
    const roundedRoute = { ...route };
    
    // Round coordinates in unpavedSections
    if (roundedRoute.unpavedSections) {
      roundedRoute.unpavedSections = roundedRoute.unpavedSections.map(section => ({
        ...section,
        coordinates: section.coordinates.map(coord => 
          [roundCoordinate(coord[0]), roundCoordinate(coord[1])] as [number, number]
        )
      }));
    }
    
    return roundedRoute;
  };

  const saveCurrentState = useCallback(
  async (
    name: string,
    type: "tourism" | "event" | "bikepacking" | "single",
    isPublic: boolean
  ) => {
    try {
      console.log('[RouteContext] Starting save with:', { name, type, isPublic });
      console.log('[RouteContext] Getting POIs from local state...');
      const pois = getPOIsForRoute();
      console.log('[RouteContext] POIs retrieved:', JSON.stringify(pois, null, 2));
      
      // Validate POIs
      const allPois = [...pois.draggable, ...pois.places];
      const invalidPoi = allPois.find(poi => {
        // Skip validation for string POIs (these are just IDs)
        if (typeof poi === 'string') return false;
        
        // Now TypeScript knows poi is a DraggablePOI | PlaceNamePOI
        const missing = {
          id: !poi.id,
          coordinates: !poi.coordinates || !Array.isArray(poi.coordinates) || poi.coordinates.length !== 2,
          name: !poi.name,
          category: !poi.category,
          icon: !poi.icon,
          ...(poi.type === 'place' ? { placeId: !poi.placeId } : {})
        };
        
        if (Object.values(missing).some(v => v)) {
          console.error('[RouteContext] Invalid POI found:', {
            missingFields: missing,
            poi: poi
          });
          return true;
        }
        return false;
      });
      
      if (invalidPoi) {
        throw new Error('Invalid POI data found - missing required fields');
      }
        
        if (!routes.length) {
          throw new Error('No route data to save');
        }
        
        setIsSaving(true);
        const routeState: SavedRouteState = {
          id: "", // Will be set by backend
          name,
          type,
          isPublic,
          createdAt: "", // Will be set by backend
          updatedAt: "", // Will be set by backend
          userId: "", // Will be set by backend
          mapState: map ? {
            zoom: map.getZoom(),
            center: [map.getCenter().lng, map.getCenter().lat],
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            style: map.getStyle()?.name || undefined
          } : {
            zoom: 0,
            center: [0, 0],
            bearing: 0,
            pitch: 0
          },
          routes: routes.map(roundRouteCoordinates),
          photos: photos.map(serializePhoto),
          pois: pois, // Use the POIs we already retrieved with the correct routeId
        };

        console.log('[RouteContext] Full route state to save:', JSON.stringify(routeState, null, 2));
        console.log('[RouteContext] POIs in route state:', routeState.pois);
        console.log('[RouteContext] Sending save request to server...');
        
        let result;
        if (currentLoadedRouteId) {
          // This is an update to an existing route
          routeState.id = currentLoadedRouteId;
          result = await routeService.saveRoute(routeState);
          
          // Update the loaded state to reflect the changes
          setCurrentLoadedState(routeState);
        } else {
          // This is a new route
          result = await routeService.saveRoute(routeState);
          setCurrentLoadedRouteId(result.id);
        }
        
        console.log('[RouteContext] Save successful. Server response:', result);
        console.log('[RouteContext] POIs have been saved to MongoDB');
        
        // Update the existing routes array in place if this was an update
        if (currentLoadedRouteId) {
          setRoutes(prevRoutes => 
            prevRoutes.map(route => {
              if (route.id === currentLoadedRouteId) {
                return {
                  ...route,
                  _type: 'loaded' as const,
                  _loadedState: {
                    ...currentLoadedState,
                    ...routeState,
                    id: currentLoadedRouteId
                  }
                };
              }
              return route;
            })
          );
        }
        
        setHasUnsavedChanges(false);
        
        // Refresh the routes list
        await listRoutes();
      } catch (error) {
        console.error('[RouteContext] Save failed:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to save route');
      } finally {
        setIsSaving(false);
      }
    },
    [map, routes, photos, getPOIsForRoute, places, routeService]
  );

  // Load a saved route
  const loadRoute = useCallback(
    async (id: string) => {
      try {
        if (hasUnsavedChanges) {
          // In a real implementation, you would show a confirmation dialog here
          console.warn('Unsaved changes will be lost');
        }
        
        setIsLoading(true);
        clearCurrentWork(); // This clears all existing routes
        console.debug('[RouteContext] Starting to load route:', id);
        const { route } = await routeService.loadRoute(id);
        console.debug('[RouteContext] Route loaded from DB:', {
          id: route.id,
          name: route.name,
          routeCount: route.routes.length,
          hasGeojson: route.routes[0]?.geojson != null
        });

        // Set loaded state
        setIsLoadedMap(true);
        setCurrentLoadedState(route);
        setCurrentLoadedRouteId(id);

        // Update route state with ONLY the loaded routes
        console.debug('[RouteContext] Setting routes state');
        const loadedRoutes = route.routes.map(r => ({
          ...r,
          _type: 'loaded' as const,
          _loadedState: route
        }));
        
        console.debug('[RouteContext] Routes state update:', {
          loadedRoutes: loadedRoutes.length
        });
        
        setRoutes(loadedRoutes); // Only set the loaded routes, no combining with previous routes
        
        // Set current route using normalizeRoute utility
        if (route.routes[0]) {
          const normalizedRoute = normalizeRoute(route);
          console.debug('[RouteContext] Setting normalized route:', {
            routeId: normalizedRoute.routeId,
            type: normalizedRoute._type,
            hasGeojson: !!normalizedRoute.geojson
          });
          setCurrentRouteWithDebug(normalizedRoute);
        } else {
          console.debug('[RouteContext] No routes to set as current');
          setCurrentRouteWithDebug(null);
        }
        
        // Update map state if available
        if (map && route.mapState) {
          console.debug('[RouteContext] Updating map state:', route.mapState);
          map.setZoom(route.mapState.zoom);
          map.setCenter(route.mapState.center);
          map.setBearing(route.mapState.bearing);
          map.setPitch(route.mapState.pitch);
          if (route.mapState.style) {
            map.setStyle(route.mapState.style);
          }
        }
        console.debug('[RouteContext] Route load complete');

          // Update photos context
          if (route.photos) {
            photos.forEach(photo => URL.revokeObjectURL(photo.url)); // Clean up old URLs
            addPhoto(route.photos.map(deserializePhoto));
          }

          // Update POIs context
          if (route.pois) {
            loadPOIsFromRoute(route.pois);
          }

          // Update places context
          if (route.places) {
            // Update each place individually
            for (const place of route.places) {
              await updatePlace(place.id, place);
            }
          }
        
      } catch (error) {
        console.error("Failed to load route:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [routeService, map, addPhoto, loadPOIsFromRoute, updatePlace, setCurrentRouteWithDebug]
  );

  // List saved routes
  const listRoutes = useCallback(
    async (filters?: { type?: string; isPublic?: boolean }) => {
      try {
        const { routes } = await routeService.listRoutes(filters);
        setSavedRoutes(routes);
      } catch (error) {
        console.error("Failed to list routes:", error);
        throw error;
      }
    },
    [routeService]
  );

  // Delete a saved route
  const deleteSavedRoute = useCallback(
    async (id: string) => {
      try {
        await routeService.deleteRoute(id);
        setSavedRoutes((prev) => prev.filter((route) => route.id !== id));
      } catch (error) {
        console.error("Failed to delete route:", error);
        throw error;
      }
    },
    [routeService]
  );

  return (
    <RouteContext.Provider
      value={{
        // Local route state
        routes,
        currentRoute,
        addRoute,
        deleteRoute,
        setCurrentRoute: setCurrentRouteWithDebug,
        focusRoute,
        unfocusRoute,
        
        // Saved routes state
        savedRoutes,
        isSaving,
        isLoading,
        isLoadedMap,
        currentLoadedState,
        currentLoadedRouteId,
        hasUnsavedChanges,
        
        // Save/Load operations
        saveCurrentState,
        loadRoute,
        listRoutes,
        deleteSavedRoute,
        clearCurrentWork,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within a RouteProvider');
  }
  return context;
};
