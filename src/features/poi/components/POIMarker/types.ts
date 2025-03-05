import { POIType } from '../../types/poi.types';

export interface POIMarkerProps {
  poi: POIType;
  onClick?: (poi: POIType) => void;
  onDragEnd?: (poi: POIType, coordinates: [number, number]) => void;
  selected?: boolean;
  className?: string;
}
