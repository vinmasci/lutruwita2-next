import { ProcessedRoute as GpxProcessedRoute, UnpavedSection } from '../../gpx/types/gpx.types';
import { ProcessedPhoto } from '../../photo/components/Uploader/PhotoUploader.types';

export interface RouteDescription {
  title?: string;
  description?: string;
  photos?: ProcessedPhoto[];
}

export interface ProcessedRoute extends Omit<GpxProcessedRoute, 'color'> {
  order?: number;  // Optional in type but will be set in normalizeRoute
  description?: RouteDescription;
  isFocused?: boolean;
  _type?: 'loaded' | 'fresh';
  _loadedState?: any;
  routeId?: string;
  persistentId?: string;  // Added persistentId property
  color: string;  // Required color property
}

export interface SavedRouteState {
  id: string;
  name: string;
  photos: ProcessedPhoto[];
  pois: any[];
  routes: ProcessedRoute[];
  persistentId?: string;
  type?: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic?: boolean;
  places?: any[];
  mapState?: {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
    padding: { top: number; bottom: number; left: number; right: number };
    bbox: [number, number, number, number];
    style: string;
  };
}

export interface LoadedRoute extends ProcessedRoute {
  routeId: string;
  _type: 'loaded';
  _loadedState: any;
}

export interface RouteListItem {
  id: string;
  name: string;
  dateAdded: string;
  photos: number;
  pois: number;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
  persistentId: string;
}

export interface SaveRouteRequest {
  name: string;
  photos: ProcessedPhoto[];
  pois: any[];
  routes: ProcessedRoute[];
}

export interface SaveRouteResponse {
  id: string;
  persistentId: string;
}

export interface LoadRouteResponse {
  route: SavedRouteState;
}

export interface ListRoutesResponse {
  routes: RouteListItem[];
}

export type { UnpavedSection };

export const normalizeRoute = (route: ProcessedRoute): ProcessedRoute => {
  return {
    ...route,
    routeId: route.routeId || `route-${route.id}`,
    order: route.order ?? 0, // Ensure order is set with a default value
    color: route.color || '#ee5253' // Default to the original red color
  };
};
