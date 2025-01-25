import { useState } from 'react';
import { SidebarProps } from './types';
import { useGpxProcessing } from '../../../gpx/hooks/useGpxProcessing';

export const useSidebar = (props: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { processGpxFile, isProcessing } = useGpxProcessing();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleUploadGpx = async (file?: File) => {
    if (file) {
      try {
        setError(null);
        await props.onUploadGpx(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload GPX file');
      }
    } else {
      if (activeDrawer === 'gpx') {
        setIsDrawerOpen(false);
        setActiveDrawer(null);
        setError(null);
      } else {
        setIsDrawerOpen(true);
        setActiveDrawer('gpx');
        props.onItemClick('gpx');
      }
    }
  };

  return {
    isOpen,
    isDrawerOpen,
    activeDrawer,
    isProcessing,
    error,
    toggleSidebar,
    handleToggleRoute: props.onToggleRoute,
    handleToggleGradient: props.onToggleGradient,
    handleToggleSurface: props.onToggleSurface,
    handleUploadGpx,
    handleSaveMap: props.onSaveMap,
    handleLoadMap: props.onLoadMap,
    handlePlacePOI: props.onPlacePOI
  };
};
