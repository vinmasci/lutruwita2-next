import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouteService } from "../services/routeService";
import { SavedRouteState, RouteListItem, ProcessedRoute, SerializedPhoto, serializePhoto, deserializePhoto } from "../types/route.types";
import { useMapContext } from "./MapContext";
import { DraggablePOI, PlaceNamePOI } from "../../poi/types/poi.types";
import { usePOIContext } from "../../poi/context/POIContext";
import { usePhotoContext } from "../../photo/context/PhotoContext";
import { usePlaceContext } from "../../place/context/PlaceContext";

interface RouteContextType {
  // Local route state
  routes: ProcessedRoute[];
  currentRoute: ProcessedRoute | null;
  addRoute: (route: ProcessedRoute) => void;
  deleteRoute: (routeId: string) => void;
  setCurrentRoute: (route: ProcessedRoute | null) => void;
  
  // Saved routes state
  savedRoutes: RouteListItem[];
  isSaving: boolean;
  isLoading: boolean;
  isLoadedMap: boolean;
  currentLoadedState: SavedRouteState | null;
  
  // Save/Load operations
  saveCurrentState: (name: string, type: "tourism" | "event" | "bikepacking" | "single", isPublic: boolean) => Promise<void>;
  loadRoute: (id: string) => Promise<void>;
  listRoutes: (filters?: { type?: string; isPublic?: boolean }) => Promise<void>;
  deleteSavedRoute: (id: string) => Promise<void>;
}

const RouteContext = createContext<RouteContextType | null>(null);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Local route state
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [currentRoute, setCurrentRoute] = useState<ProcessedRoute | null>(null);

  // Saved routes state
  const [savedRoutes, setSavedRoutes] = useState<RouteListItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadedMap, setIsLoadedMap] = useState(false);
  const [currentLoadedState, setCurrentLoadedState] = useState<SavedRouteState | null>(null);

  // Context hooks
  const routeService = useRouteService();
  const { map } = useMapContext();
  const { pois, getPOIsForRoute, loadPOIsFromRoute } = usePOIContext();
  const { photos, addPhoto } = usePhotoContext();
  const { places, updatePlace } = usePlaceContext();

  const addRoute = useCallback((route: ProcessedRoute) => {
    setRoutes((prev) => {
      // Filter out any existing route with the same ID
      const filtered = prev.filter((r) => r.id !== route.id);
      
      // If we have a loaded state, mark the route as loaded
      const processedRoute = currentLoadedState ? {
        ...route,
        _type: 'loaded' as const,
        _loadedState: currentLoadedState
      } : route;
      
      return [...filtered, processedRoute];
    });
  }, [currentLoadedState]);

  const deleteRoute = useCallback((routeId: string) => {
    setRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
    setCurrentRoute((prev) => (prev?.routeId === routeId ? null : prev));
  }, []);

  // Save current state to backend
// AFTER:
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
          position: !poi.position,
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
          routes,
          photos: photos.map(serializePhoto),
          pois: pois, // Use the POIs we already retrieved with the correct routeId
          places: Object.values(places),
        };

        console.log('[RouteContext] Full route state to save:', JSON.stringify(routeState, null, 2));
        console.log('[RouteContext] POIs in route state:', routeState.pois);
        console.log('[RouteContext] Sending save request to server...');
        const result = await routeService.saveRoute(routeState);
        console.log('[RouteContext] Save successful. Server response:', result);
        console.log('[RouteContext] POIs have been saved to MongoDB');
        
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
        setIsLoading(true);
        console.log('[RouteContext] Starting to load route:', id);
        const { route } = await routeService.loadRoute(id);
        console.log('[RouteContext] Route loaded from DB:', route);
        console.log('[RouteContext] Route.routes:', route.routes);

        // Set loaded state
        setIsLoadedMap(true);
        setCurrentLoadedState(route);

        // Update route state - preserve structure for future additions
        console.log('[RouteContext] Setting routes state');
        setRoutes(prevRoutes => {
          // Filter out any routes that would conflict with loaded routes
          const nonConflicting = prevRoutes.filter(r => 
            !route.routes.some(loadedRoute => loadedRoute.id === r.id)
          );
          
          // Mark routes as loaded
          const loadedRoutes = route.routes.map(r => ({
            ...r,
            _type: 'loaded' as const,
            _loadedState: route
          }));
          
          return [...nonConflicting, ...loadedRoutes];
        });
        
        // Set current route while maintaining loaded state
        console.log('[RouteContext] Setting current route:', route.routes[0] || null);
        if (route.routes[0]) {
          setCurrentRoute({
            ...route.routes[0],
            _type: 'loaded',
            _loadedState: route,
            routes: route.routes // Preserve full route collection reference
          });
        } else {
          setCurrentRoute(null);
        }
        
        // Update map state if available
        if (map && route.mapState) {
          console.log('[RouteContext] Updating map state');
          map.setZoom(route.mapState.zoom);
          map.setCenter(route.mapState.center);
          map.setBearing(route.mapState.bearing);
          map.setPitch(route.mapState.pitch);
          if (route.mapState.style) {
            map.setStyle(route.mapState.style);
          }
        }
        console.log('[RouteContext] Route load complete');

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
    [routeService, map, addPhoto, loadPOIsFromRoute, updatePlace]
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
        setCurrentRoute,
        
        // Saved routes state
        savedRoutes,
        isSaving,
        isLoading,
        isLoadedMap,
        currentLoadedState,
        
        // Save/Load operations
        saveCurrentState,
        loadRoute,
        listRoutes,
        deleteSavedRoute,
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
