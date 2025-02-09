import { POICategory, POIIconName, POIType, NewPOIInput, POIMode } from '../../types/poi.types';

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
  onModeSelect: (mode: POIMode) => void;
}

export interface POILocationInstructionsProps {
  mode: POIMode;
  onCancel: () => void;
}

export interface POIIconSelectionProps {
  mode: POIMode;
  selectedIcon: POIDrawerState['selectedIcon'];
  onIconSelect: (icon: POIDrawerState['selectedIcon']) => void;
  onBack: () => void;
  startDrag: (icon: POIDrawerState['selectedIcon'], category: POIDrawerState['selectedCategory']) => void;
}

export interface POIDetailsFormProps {
  mode: POIMode;
  initialData?: POIFormData;
  onSubmit: (data: POIFormData) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export interface POIDrawerHeaderProps {
  step: POIDrawerState['step'];
  mode: POIMode;
  onClose: () => void;
}

export interface POIDrawerFooterProps {
  step: POIDrawerState['step'];
  mode: POIMode;
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
