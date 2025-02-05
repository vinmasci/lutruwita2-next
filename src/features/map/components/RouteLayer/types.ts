import mapboxgl from 'mapbox-gl';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';

export interface RouteLayerProps {
  map: mapboxgl.Map;
  route: ProcessedRoute;
}
