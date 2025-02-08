import type { ProcessedRoute as GpxProcessedRoute } from '../../gpx/types/gpx.types';
import type { ProcessedPhoto } from '../../photo/components/Uploader/PhotoUploader.types';
import type { Place } from '../../place/types/place.types';
import type { GeoJSON } from 'geojson';

// Omit routeId from GpxProcessedRoute since we'll redefine it as required
export interface ProcessedRoute extends Omit<GpxProcessedRoute, 'routeId'> {
  id: string;
  routeId: string; // Make this required
  name: string;
  color: string;
  isVisible: boolean;
  gpxData: string;
  rawGpx: string;
  geojson: GeoJSON.FeatureCollection;
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
  location?: [number, number]; // Normalized from coordinates
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
  places: Place[];
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
  places: Place[];
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

export interface RouteContextType {
  routes: ProcessedRoute[];
  isInitialized: boolean;
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
  location: photo.coordinates ? [photo.coordinates.lat, photo.coordinates.lng] : undefined,
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
  coordinates: photo.location ? { lat: photo.location[0], lng: photo.location[1] } : undefined,
  rotation: photo.rotation,
  altitude: photo.altitude
});

// Helper function to ensure a route has a routeId
export const normalizeRoute = (route: GpxProcessedRoute): ProcessedRoute => ({
  ...route,
  routeId: route.routeId || `route-${route.id}`,
  id: route.id,
  name: route.name,
  color: route.color || '#000000',
  isVisible: route.isVisible || true,
  gpxData: route.gpxData,
  rawGpx: route.rawGpx,
  geojson: route.geojson,
  statistics: route.statistics
});
