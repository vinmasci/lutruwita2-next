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

export type POIIconName = string;

export interface POIPhoto {
  url: string;
  caption?: string;
}

export interface POIStyle {
  color?: string;
  size?: number;
}

export interface BasePOI {
  id: string;
  routeId?: string;
  position: POIPosition;
  name: string;
  description?: string;
  category: POICategory;
  icon: POIIconName;
  photos?: POIPhoto[];
  style?: POIStyle;
}

export interface DraggablePOI extends BasePOI {
  type: 'draggable';
}

export interface PlaceNamePOI extends BasePOI {
  type: 'place';
  placeId: string;
}

export type POIType = DraggablePOI | PlaceNamePOI;

export interface StoredPOIs {
  draggable: DraggablePOI[];
  places: PlaceNamePOI[];
}
