import type { ProcessedRoute as GpxProcessedRoute } from '../../gpx/types/gpx.types';
import type { ProcessedPhoto } from '../../photo/components/Uploader/PhotoUploader.types';
import type { Place } from '../../place/types/place.types';
import type { GeoJSON, LineString } from 'geojson';

// Re-export and extend the GPX types
export interface UnpavedSection {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  surfaceType: 'unpaved' | 'gravel' | 'trail';
}

// Base route interface with common properties
interface BaseRoute extends Omit<GpxProcessedRoute, 'routeId' | 'unpavedSections' | 'status'> {
  id: string;
  routeId: string;
  name: string;
  color: string;
  isVisible: boolean;
  isFocused?: boolean;
  gpxData: string;
  rawGpx: string;
  geojson: GeoJSON.FeatureCollection;
  unpavedSections?: UnpavedSection[];
  status: {
    processingState: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: {
      code: string;
      message: string;
      details?: string;
    };
  };
  statistics: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    maxElevation: number;
    minElevation: number;
    averageSpeed: number;
    movingTime: number;
    totalTime: number;
  };
  mapState?: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string;
  };
}

// Define a serialized version of ProcessedPhoto for storage
export interface SerializedPhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  dateAdded: string; // Store as ISO string
  hasGps: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rotation?: number;
  altitude?: number;
}

export interface SavedRouteState {
  id: string;
  name: string;
  type: "tourism" | "event" | "bikepacking" | "single";
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  viewCount?: number;
  routes: ProcessedRoute[];
  mapState: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string;
  };
  pois: {
    draggable: any[];
    places: any[];
  };
  photos: SerializedPhoto[];
  places?: Place[]; // Made optional as part of migration
}

export interface RouteListItem {
  id: string;
  name: string;
  type: string;
  isPublic: boolean;
  createdAt: string;
  statistics: {
    totalDistance: number;
    [key: string]: any;
  };
}

export interface SaveRouteRequest {
  routes: ProcessedRoute[];
  mapState: SavedRouteState['mapState'];
  pois: SavedRouteState['pois'];
  photos: SerializedPhoto[];
  places?: Place[]; // Made optional as part of migration
  name: string;
  type: SavedRouteState['type'];
  isPublic: boolean;
}

export interface SaveRouteResponse {
  id: string;
  success: boolean;
  message?: string;
}

export interface LoadRouteResponse {
  route: SavedRouteState;
  success: boolean;
  message?: string;
}

export interface ListRoutesResponse {
  routes: RouteListItem[];
  success: boolean;
  message?: string;
}

// Loaded route from saved state
export interface LoadedRoute extends BaseRoute {
  _type: 'loaded';
  _loadedState?: SavedRouteState;
}

// Fresh route from GPX upload
export interface FreshRoute extends BaseRoute {
  _type: 'fresh';
}

// Union type for all route types
export type ProcessedRoute = LoadedRoute | FreshRoute;

export interface RouteContextType {
  routes: ProcessedRoute[];
  isInitialized: boolean;
  isLoadedMap: boolean;
  currentLoadedState: SavedRouteState | null;
  loadRoute: (savedRoute: SavedRouteState) => Promise<void>;
  addRoute: (newRoute: ProcessedRoute) => void;
}

// Helper type to convert ProcessedPhoto to SerializedPhoto
export const serializePhoto = (photo: ProcessedPhoto): SerializedPhoto => ({
  id: photo.id,
  name: photo.name,
  url: photo.url,
  thumbnailUrl: photo.thumbnailUrl,
  dateAdded: photo.dateAdded.toISOString(),
  hasGps: photo.hasGps,
  coordinates: photo.coordinates ? { lat: photo.coordinates.lat, lng: photo.coordinates.lng } : undefined,
  rotation: photo.rotation,
  altitude: photo.altitude
});

// Helper type to convert SerializedPhoto to ProcessedPhoto
export const deserializePhoto = (photo: SerializedPhoto): ProcessedPhoto => ({
  id: photo.id,
  name: photo.name,
  url: photo.url,
  thumbnailUrl: photo.thumbnailUrl,
  dateAdded: new Date(photo.dateAdded),
  hasGps: photo.hasGps,
  coordinates: photo.coordinates,
  rotation: photo.rotation,
  altitude: photo.altitude
});

// Type guard for surface type
const isValidSurfaceType = (type: string): type is UnpavedSection['surfaceType'] => {
  return type === 'unpaved' || type === 'gravel' || type === 'trail';
};

// Helper function to ensure a route has a routeId and proper type
export const normalizeRoute = (route: GpxProcessedRoute): FreshRoute => {
  // Ensure we have a valid status
  const status = route.status || {
    processingState: 'completed' as const,
    progress: 100,
  };

  // Convert unpaved sections with type guard
  const unpavedSections = route.unpavedSections?.map(section => {
    const surfaceType = isValidSurfaceType(section.surfaceType) 
      ? section.surfaceType 
      : 'unpaved';

    return {
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      coordinates: section.coordinates,
      surfaceType
    };
  }) || [];

  const normalized: FreshRoute = {
    ...route,
    _type: 'fresh',
    routeId: route.routeId || `route-${route.id}`,
    id: route.id,
    name: route.name,
    color: route.color || '#000000',
    isVisible: route.isVisible || true,
    gpxData: route.gpxData,
    rawGpx: route.rawGpx,
    geojson: route.geojson,
    statistics: route.statistics,
    status,
    unpavedSections
  };

  return normalized;
};
