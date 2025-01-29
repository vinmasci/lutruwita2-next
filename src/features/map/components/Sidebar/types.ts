import { ProcessedRoute } from '../../../gpx/types/gpx.types';

export interface SidebarProps {
  onUploadGpx: (file?: File, processedRoute?: ProcessedRoute) => Promise<void>;
  onSaveMap: () => void;
  onLoadMap: () => void;
  onAddPhotos: () => void;
  onAddPOI: () => void;
  mapReady: boolean;
  onItemClick: (action: string) => void;
  onToggleRoute: () => void;
  onToggleGradient: () => void;
  onToggleSurface: () => void;
  onPlacePOI: () => void;
  onDeleteRoute: (routeId: string) => void;
}

export interface SidebarHookReturn {
  isOpen: boolean;
  toggleSidebar: () => void;
  handleUploadGpx: (file: File) => Promise<void>;
  handleSaveMap: () => void;
  handleLoadMap: () => void;
  handleAddPhotos: () => void;
  handleAddPOI: () => void;
}
