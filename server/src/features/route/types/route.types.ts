import { ProcessedRoute } from '../../../shared/types/gpx.types.js';
import { DraggablePOI, PlaceNamePOI } from '../../../shared/types/poi.types.js';
import { Place } from '../../../shared/types/place.types.js';

export interface SavedRouteState {
  id: string;
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string; // Auth0 user ID
  
  // Map state
  mapState: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string; // Current map style
  };

  // Route data
  routes: ProcessedRoute[]; // From gpx.types.ts, includes all GPX data and processing results
  
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
  }[];

  // POIs and Places
  pois: {
    draggable: DraggablePOI[];
    places: PlaceNamePOI[];
  };
  places: Place[];
}

export interface SaveRouteRequest {
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
}

export interface SaveRouteResponse {
  message: string;
}

export interface LoadRouteResponse {
  route: SavedRouteState;
  message: string;
}

export interface ListRoutesResponse {
  routes: Array<{
    id: string;
    name: string;
    type: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}
