import { SavedRouteState } from '../../map/types/route.types';

export interface PublicRouteMetadata {
  id: string;
  persistentId: string;
  name: string;
  type: string;
  viewCount: number;
  lastViewed?: string;
  createdAt: string;
  updatedAt: string;
  mapState: {
    zoom: number;
    center: [number, number];
    bearing: number;
    pitch: number;
    style?: string;
  };
  routes: Array<{
    routeId: string;
    name: string;
    geojson: any;
    statistics?: {
      totalDistance: number;
      elevationGain: number;
      elevationLoss: number;
      maxElevation: number;
      minElevation: number;
      averageSpeed: number;
      movingTime: number;
      totalTime: number;
    };
  }>;
}

export interface PublicRouteDetails extends SavedRouteState {
  viewCount: number;
  lastViewed?: string;
}

export interface ListPublicRoutesResponse {
  routes: PublicRouteMetadata[];
}

// The API now returns the route data directly
export type LoadPublicRouteResponse = PublicRouteDetails;
