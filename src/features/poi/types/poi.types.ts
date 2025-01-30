export interface POIPosition {
  lat: number;
  lng: number;
}

export type POICategory = 
  | 'road-information'
  | 'accommodation'
  | 'food-drink'
  | 'natural-features'
  | 'event-information'
  | 'town-services'
  | 'transportation';

export type POIIconName =
  // Road Information
  | 'triangle-alert' | 'octagon-x' | 'octagon-alert' | 'lock-keyhole'
  | 'lock-keyhole-open' | 'waves' | 'chevrons-left-right-ellipsis'
  | 'triangle-right' | 'audio-waveform' | 'route' | 'train-track' | 'construction'
  // Accommodation
  | 'tent' | 'caravan' | 'concierge-bell' | 'bed-double' | 'bed-single'
  // Food/Drink
  | 'utensils' | 'coffee' | 'droplet' | 'pizza' | 'shopping-cart'
  | 'store' | 'beer' | 'wine'
  // Natural Features
  | 'mountain-snow' | 'tree-pine' | 'binoculars' | 'waves-ladder'
  // Event Information
  | 'circle-play' | 'circle-stop' | 'briefcase-medical'
  | 'battery-charging' | 'x' | 'circle-dot' | 'wrench'
  // Town Services
  | 'hospital' | 'toilet' | 'shower-head' | 'square-parking'
  | 'fuel' | 'mail' | 'bike'
  // Transportation
  | 'bus-front' | 'train-front' | 'plane-takeoff' | 'ship';

export interface POIPhoto {
  url: string;
  caption?: string;
  createdAt: string;
}

export interface BasePOI {
  id: string;
  position: POIPosition;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
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

export type NewPOIInput = 
  | (Omit<DraggablePOI, 'id' | 'createdAt' | 'updatedAt'>) 
  | (Omit<PlaceNamePOI, 'id' | 'createdAt' | 'updatedAt'>);

export interface POIContextType {
  pois: POIType[];
  addPOI: (poi: NewPOIInput) => void;
  removePOI: (id: string) => void;
  updatePOI: (id: string, updates: Partial<Omit<POIType, 'id'>>) => void;
  updatePOIPosition: (id: string, position: POIPosition) => void;
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
  'road-information': { label: 'Road Information', color: '#dc3545' },
  'accommodation': { label: 'Accommodation', color: '#28a745' },
  'food-drink': { label: 'Food & Drink', color: '#ffc107' },
  'natural-features': { label: 'Natural Features', color: '#17a2b8' },
  'event-information': { label: 'Event Information', color: '#6610f2' },
  'town-services': { label: 'Town Services', color: '#fd7e14' },
  'transportation': { label: 'Transportation', color: '#20c997' }
};
