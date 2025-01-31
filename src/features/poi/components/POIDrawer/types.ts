import { POICategory, POIIconName, POIType, NewPOIInput } from '../../types/poi.types';

export type POICreationMode = 'map' | 'place';

export interface POIFormData {
  name: string;
  description?: string;
  category: POICategory;
  icon: POIIconName;
  photos?: File[];
}

export interface POIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface POIDrawerState {
  mode: POICreationMode | null;
  step: 'mode-select' | 'location-select' | 'icon-select' | 'details';
  selectedCategory: POICategory | null;
  selectedIcon: POIIconName | null;
  selectedLocation: { lat: number; lng: number } | null;
  selectedPlaceId: string | null;
  formData: POIFormData | null;
  isSubmitting: boolean;
  error: string | null;
}

export interface POIModeSelectionProps {
  onModeSelect: (mode: POICreationMode) => void;
}

export interface POILocationInstructionsProps {
  mode: POICreationMode;
  onCancel: () => void;
}

export interface POIIconSelectionProps {
  mode: POIDrawerState['mode'];
  selectedIcon: POIDrawerState['selectedIcon'];
  onIconSelect: (icon: POIDrawerState['selectedIcon']) => void;
  onBack: () => void;
  startDrag: (icon: POIDrawerState['selectedIcon'], category: POIDrawerState['selectedCategory']) => void;
}

export interface POIDetailsFormProps {
  mode: POICreationMode;
  initialData?: POIFormData;
  onSubmit: (data: POIFormData) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export interface POIDrawerHeaderProps {
  step: POIDrawerState['step'];
  mode: POICreationMode | null;
  onClose: () => void;
}

export interface POIDrawerFooterProps {
  step: POIDrawerState['step'];
  mode: POICreationMode | null;
  onBack?: () => void;
  onNext?: () => void;
  isSubmitting?: boolean;
}

export interface POIIconGridProps {
  category: POICategory;
  selectedIcon: POIIconName | null;
  onIconSelect: (icon: POIIconName) => void;
}

export interface POICategoryListProps {
  selectedCategory: POICategory | null;
  onCategorySelect: (category: POICategory) => void;
}
