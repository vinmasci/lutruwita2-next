import { useState, useEffect } from 'react';
import { SidebarProps } from './types';
import { useGpxProcessing } from '../../../gpx/hooks/useGpxProcessing';
import { useMapContext } from '../../context/MapContext';

export const useSidebar = (props: SidebarProps) => {
  // All hooks must be called before any other code
  const { setPoiPlacementMode, setPoiPlacementClick } = useMapContext();
  const { processGpxFile, isProcessing } = useGpxProcessing();
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleAddPhotos = () => {
    if (activeDrawer === 'photos') {
      setIsDrawerOpen(false);
      setActiveDrawer(null);
    } else {
      setIsDrawerOpen(true);
      setActiveDrawer('photos');
      props.onItemClick('photos');
      props.onAddPhotos();
    }
  };

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

  // Reset POI placement mode when drawer closes or changes
  useEffect(() => {
    if (!isDrawerOpen || activeDrawer !== 'poi') {
      setPoiPlacementMode(false);
      setPoiPlacementClick(undefined);
    }
  }, [isDrawerOpen, activeDrawer, setPoiPlacementMode, setPoiPlacementClick]);

  const handleAddPOI = () => {
    if (activeDrawer === 'poi') {
      setIsDrawerOpen(false);
      setActiveDrawer(null);
      setPoiPlacementMode(false);
      setPoiPlacementClick(undefined);
    } else {
      setIsDrawerOpen(true);
      setActiveDrawer('poi');
      props.onItemClick('poi');
      props.onAddPOI();
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
    handlePlacePOI: props.onPlacePOI,
    handleAddPOI,
    handleAddPhotos
  };
};
