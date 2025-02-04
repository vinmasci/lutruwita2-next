import React, { createContext, useContext, useState, useCallback } from "react";
import { ProcessedRoute } from "../../gpx/types/gpx.types";
import { useRouteService } from "../services/routeService";
import { SavedRouteState, RouteListItem } from "../types/route.types";
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

  // Context hooks
  const routeService = useRouteService();
  const { map } = useMapContext();
  const { pois, addPOI } = usePOIContext();
  const { photos, addPhoto } = usePhotoContext();
  const { places, updatePlace } = usePlaceContext();

  const addRoute = useCallback((route: ProcessedRoute) => {
    setRoutes((prev) => {
      const filtered = prev.filter((r) => r.id !== route.id);
      return [...filtered, route];
    });
  }, []);

  const deleteRoute = useCallback((routeId: string) => {
    setRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
    setCurrentRoute((prev) => (prev?.routeId === routeId ? null : prev));
  }, []);

  // Save current state to backend
  const saveCurrentState = useCallback(
    async (
      name: string,
      type: "tourism" | "event" | "bikepacking" | "single",
      isPublic: boolean
    ) => {
      try {
        console.log('Starting saveCurrentState with:', { name, type, isPublic });
        console.log('Current routes:', routes);
        console.log('Current map state:', map ? {
          zoom: map.getZoom(),
          center: map.getCenter(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          style: map.getStyle()?.name
        } : 'No map instance');
        
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
            style: map.getStyle()?.name
          } : {
            zoom: 0,
            center: [0, 0],
            bearing: 0,
            pitch: 0
          },
          routes,
          photos: photos.map(photo => ({
            id: photo.id,
            name: photo.name,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            dateAdded: photo.dateAdded.toISOString(),
            coordinates: photo.coordinates,
            rotation: photo.rotation,
            altitude: photo.altitude,
            hasGps: !!photo.coordinates
          })),
          pois: {
            draggable: pois.filter(poi => poi.type === 'draggable') as DraggablePOI[],
            places: pois.filter(poi => poi.type === 'place') as PlaceNamePOI[]
          },
          places: Object.values(places),
        };

        console.log('Prepared route state:', routeState);
        
        const result = await routeService.saveRoute(routeState);
        console.log('Save route API response:', result);
        
        // Refresh the routes list after saving
        await listRoutes();
        console.log('Routes list refreshed');
        return;
      } catch (error) {
        console.error("Failed to save route:", error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [map, routes, photos, pois, places, routeService]
  );

  // Load a saved route
  const loadRoute = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        const { route } = await routeService.loadRoute(id);

        // Update route state
        setRoutes(route.routes);
        setCurrentRoute(route.routes[0] || null);
        
        // Update map state if available
        if (map && route.mapState) {
          map.setZoom(route.mapState.zoom);
          map.setCenter(route.mapState.center);
          map.setBearing(route.mapState.bearing);
          map.setPitch(route.mapState.pitch);
          if (route.mapState.style) {
            map.setStyle(route.mapState.style);
          }
        }

          // Update photos context
          if (route.photos) {
            const processedPhotos = route.photos.map(photo => ({
              ...photo,
              dateAdded: new Date(photo.dateAdded),
              hasGps: !!photo.coordinates // Set hasGps based on coordinates presence
            }));
            photos.forEach(photo => URL.revokeObjectURL(photo.url)); // Clean up old URLs
            addPhoto(processedPhotos);
          }

          // Update POIs context
          if (route.pois) {
            // Add each POI individually
            [...route.pois.draggable, ...route.pois.places].forEach(poi => {
              addPOI({
                ...poi,
                type: poi.type,
                position: poi.position,
                name: poi.name,
                placeId: poi.type === 'place' ? (poi as any).placeId : undefined
              });
            });
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
    [routeService, map, addPhoto, addPOI, updatePlace]
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
