import { ProcessedRoute } from '../../gpx/types/gpx.types';
import { DraggablePOI, PlaceNamePOI } from '../../poi/types/poi.types';
import { Place } from '../../place/types/place.types';

export interface SavedRouteState {
  id: string;
  name: string;
  type: 'tourism' | 'event' | 'bikepacking' | 'single';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  
  mapState: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string;
  };

  routes: ProcessedRoute[];
  
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
  id: string;
  message: string;
}

export interface LoadRouteResponse {
  route: SavedRouteState;
  message: string;
}

export interface RouteListItem {
  id: string;
  name: string;
  type: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListRoutesResponse {
  routes: RouteListItem[];
}
