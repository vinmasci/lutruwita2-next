import { POIType } from '../../types/poi.types';

export interface POIMarkerProps {
  poi: POIType;
  onClick?: () => void;
}
