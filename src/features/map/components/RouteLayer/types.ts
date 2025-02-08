import mapboxgl from 'mapbox-gl';
import { ProcessedRoute } from '../../types/route.types';

export interface RouteLayerProps {
  map: mapboxgl.Map;
  route: ProcessedRoute;
}
