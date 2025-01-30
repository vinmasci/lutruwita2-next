import { POIType } from '../../types/poi.types';
import { LeafletEventHandlerFnMap } from 'leaflet';

export interface POIMarkerProps {
  poi: POIType;
  onClick?: (poi: POIType) => void;
  onDragEnd?: (poi: POIType, newPosition: { lat: number; lng: number }) => void;
  eventHandlers?: LeafletEventHandlerFnMap;
  selected?: boolean;
  className?: string;
}

export interface POIMarkerStyleProps {
  selected?: boolean;
  isDraggable: boolean;
  category: string;
  color?: string;
}
