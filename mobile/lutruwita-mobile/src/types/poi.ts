/**
 * POI (Point of Interest) types for the mobile app
 * Based on the web app implementation but simplified for mobile
 */

// POI coordinates as [longitude, latitude]
export type POICoordinates = [number, number];

// POI categories
export type POICategory = 
  | 'road-information'
  | 'accommodation'
  | 'food-drink'
  | 'natural-features'
  | 'town-services'
  | 'transportation'
  | 'event-information';

// POI icon names
export type POIIconName =
  // Road Information
  | 'TrafficCone' | 'Octagon' | 'AlertOctagon' | 'Lock'
  | 'Unlock' | 'WaterCrossing' | 'ChevronsRightLeft'
  | 'ArrowUpRight' | 'AudioWaveform' | 'Route' | 'RailTrail' | 'Construction'
  | 'HikeABike' | 'RemoteArea' | 'HeavyTraffic'
  // Accommodation
  | 'Tent' | 'Car' | 'BedDouble' | 'BedSingle' | 'Huts'
  // Food/Drink
  | 'Utensils' | 'Coffee' | 'Droplet' | 'Pizza' | 'ShoppingCart'
  | 'Store' | 'Beer' | 'Wine'
  // Natural Features
  | 'Mountain' | 'TreePine' | 'Binoculars' | 'Swimming' | 'MountainBikePark'
  // Town Services
  | 'Hospital' | 'Toilet' | 'ShowerHead' | 'ParkingSquare'
  | 'Fuel' | 'Mail' | 'Bike'
  // Transportation
  | 'Bus' | 'TrainStation' | 'Plane' | 'Ship'
  // Event Information
  | 'PlayCircle' | 'StopCircle' | 'Stethoscope'
  | 'BatteryCharging' | 'X' | 'Wrench' | 'Flag';

// POI photo
export interface POIPhoto {
  url: string;
  caption?: string;
}

// Base POI interface
export interface BasePOI {
  id: string;
  coordinates: POICoordinates;
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

// Draggable POI
export interface DraggablePOI extends BasePOI {
  type: 'draggable';
}

// Place POI (from Google Places or other location services)
export interface PlacePOI extends BasePOI {
  type: 'place';
  placeId: string;
}

// Union type for all POI types
export type POI = DraggablePOI | PlacePOI;

// Input for creating a new POI
export type NewPOIInput = Omit<DraggablePOI, 'id'> | Omit<PlacePOI, 'id'>;

// POI mode for the app
export type POIMode = 'none' | 'regular' | 'place';

// Category definitions with labels and colors
export const POI_CATEGORIES: Record<POICategory, { label: string; color: string }> = {
  'road-information': { label: 'Road Information', color: '#ff5252' },
  'accommodation': { label: 'Accommodation', color: '#8e44ad' },
  'food-drink': { label: 'Food & Drink', color: '#e67e22' },
  'natural-features': { label: 'Natural Features', color: '#27ae60' },
  'town-services': { label: 'Town Services', color: '#0a3d62' },
  'transportation': { label: 'Transportation', color: '#20c997' },
  'event-information': { label: 'Event Information', color: '#34495e' }
};
