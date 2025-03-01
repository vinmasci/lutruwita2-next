import { ProcessedRoute } from '../../../shared/types/gpx.types.js';
import { DraggablePOI, PlaceNamePOI } from '../../../shared/types/poi.types.js';

export interface RouteDescription {
  title?: string;
  description?: string;
  photos?: {
    id: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    dateAdded: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    rotation?: number;
    altitude?: number;
    publicId?: string;
  }[];
}

export interface ProcessedRouteWithDescription extends ProcessedRoute {
  description?: RouteDescription;
}

export interface SavedRouteState {
  id: string;
  persistentId: string;
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string; // Auth0 user ID
  viewCount: number;
  lastViewed?: string;
  
  // Map state
  mapState: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string; // Current map style
  };

  // Route data
  routes: ProcessedRouteWithDescription[]; // From gpx.types.ts, includes all GPX data and processing results
  
  // Photos with metadata
  photos: {
    id: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    dateAdded: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    rotation?: number;
    altitude?: number;
    publicId?: string;
  }[];

  // POIs and Places
  pois: {
    draggable: DraggablePOI[];
    places: PlaceNamePOI[];
  };
}

export interface SaveRouteRequest {
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
}

export interface SaveRouteResponse {
  message: string;
  id: string;
  persistentId: string;
}

export interface LoadRouteResponse {
  route: SavedRouteState;
  message: string;
}

export interface ListRoutesResponse {
  routes: Array<{
    id: string;
    persistentId: string;
    name: string;
    type: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    lastViewed?: string;
  }>;
}

export interface ListPublicRoutesResponse {
  routes: Array<{
    id: string;
    persistentId: string;
    name: string;
    type: string;
    viewCount: number;
    lastViewed?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}
