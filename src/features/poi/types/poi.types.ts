import { SavedRouteState } from '../../map/types/route.types';

export interface POIPosition {
  lat: number;
  lng: number;
}

export type POICategory = 
  | 'road-information'
  | 'accommodation'
  | 'food-drink'
  | 'natural-features'
  | 'town-services'
  | 'transportation'
  | 'event-information';

export type POIIconName =
  // Road Information
  | 'TrafficCone' | 'Octagon' | 'AlertOctagon' | 'Lock'
  | 'Unlock' | 'WaterCrossing' | 'ChevronsRightLeft'
  | 'ArrowUpRight' | 'AudioWaveform' | 'Route' | 'RailTrail' | 'Construction'
  | 'HikeABike'
  // Accommodation
  | 'Tent' | 'Car' | 'Bell' | 'BedDouble' | 'BedSingle'
  // Food/Drink
  | 'Utensils' | 'Coffee' | 'Droplet' | 'Pizza' | 'ShoppingCart'
  | 'Store' | 'Beer' | 'Wine'
  // Natural Features
  | 'Mountain' | 'TreePine' | 'Binoculars' | 'Swimming'
  // Town Services
  | 'Hospital' | 'Toilet' | 'ShowerHead' | 'ParkingSquare'
  | 'Fuel' | 'Mail' | 'Bike'
  // Transportation
  | 'Bus' | 'TrainStation' | 'Plane' | 'Ship'
  // Event Information
  | 'PlayCircle' | 'StopCircle' | 'Stethoscope'
  | 'BatteryCharging' | 'X' | 'CircleDot' | 'Wrench' | 'Flag';

export interface POIPhoto {
  url: string;
  caption?: string;
}

export interface BasePOI {
  id: string;
  position: POIPosition;
  name: string;
  description?: string;
  category: POICategory;
  icon: POIIconName;
  photos?: POIPhoto[];
  style?: {
    color?: string;
    size?: number;
  };
}

export interface DraggablePOI extends BasePOI {
  type: 'draggable';
}

export interface PlaceNamePOI extends BasePOI {
  type: 'place';
  placeId: string;
}

export type POIType = DraggablePOI | PlaceNamePOI;

export type NewPOIInput = Omit<DraggablePOI, 'id'> | Omit<PlaceNamePOI, 'id'>;

export interface POIContextType {
  pois: POIType[];
  isLoading: boolean;
  error: Error | null;
  addPOI: (poi: NewPOIInput) => void;
  removePOI: (id: string) => void;
  updatePOI: (id: string, updates: Partial<Omit<POIType, 'id'>>) => void;
  updatePOIPosition: (id: string, position: POIPosition) => void;
  getPOIsForRoute: (routeId?: string) => SavedRouteState['pois'];
  loadPOIsFromRoute: (routePOIs: SavedRouteState['pois']) => void;
}

export interface StoredPOIs {
  draggable: DraggablePOI[];
  places: PlaceNamePOI[];
}

// Icon types
export interface POIIconProps {
  name: POIIconName;
  category: POICategory;
  color?: string;
  size?: number;
  className?: string;
}

export const POI_CATEGORIES: Record<POICategory, { label: string; color: string }> = {
  'road-information': { label: 'Road Information', color: '#ff5252' },
  'accommodation': { label: 'Accommodation', color: '#8e44ad' },
  'food-drink': { label: 'Food & Drink', color: '#e67e22' },
  'natural-features': { label: 'Natural Features', color: '#27ae60' },
  'town-services': { label: 'Town Services', color: '#3dc1d3' },
  'transportation': { label: 'Transportation', color: '#20c997' },
  'event-information': { label: 'Event Information', color: '#34495e' }
};
