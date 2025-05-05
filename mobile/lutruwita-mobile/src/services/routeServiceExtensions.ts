import { RouteMap, MapState } from './routeService';

// Extend the RouteMap interface to include offline maps properties
declare module './routeService' {
  interface RouteMap {
    downloadSize?: number;
    downloadedAt?: Date;
  }

  interface MapState {
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }
}
