import { useState, useEffect } from 'react';
import { useGpxProcessing } from '../../../gpx/hooks/useGpxProcessing';
import { useMapContext } from '../../context/MapContext';
import { useLineContext } from '../../../lineMarkers/context/LineContext';
export const useSidebar = (props) => {
    // All hooks must be called before any other code
    const { setPoiPlacementMode, setPoiPlacementClick } = useMapContext();
    const { setIsDrawing } = useLineContext();
    const { isProcessing } = useGpxProcessing();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [error, setError] = useState(null);
    const handleAddPhotos = () => {
        if (activeDrawer === 'photos') {
            setIsDrawerOpen(false);
            setActiveDrawer(null);
        }
        else {
            setIsDrawerOpen(true);
            setActiveDrawer('photos');
            props.onItemClick('photos');
        }
    };
    const handleUploadGpx = async (file) => {
        if (file) {
            try {
                setError(null);
                await props.onUploadGpx(file);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to upload GPX file');
            }
        }
        else {
            if (activeDrawer === 'gpx') {
                setIsDrawerOpen(false);
                setActiveDrawer(null);
                setError(null);
            }
            else {
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
    const { startDrawing, stopDrawing } = useLineContext();

    const handleAddLine = () => {
        if (activeDrawer === 'line') {
            setIsDrawerOpen(false);
            setActiveDrawer(null);
            stopDrawing();
        } else {
            setIsDrawerOpen(false);
            setActiveDrawer('line');
            startDrawing();
            props.onItemClick('line');
        }
    };

    const handleAddPOI = () => {
        if (activeDrawer === 'poi') {
            setIsDrawerOpen(false);
            setActiveDrawer(null);
            setPoiPlacementMode(false);
            setPoiPlacementClick(undefined);
        }
        else {
            setIsDrawerOpen(true);
            setActiveDrawer('poi');
            props.onItemClick('poi');
            props.onAddPOI();
        }
    };
    return {
        isDrawerOpen,
        activeDrawer,
        isProcessing,
        error,
        handleToggleRoute: props.onToggleRoute,
        handleToggleGradient: props.onToggleGradient,
        handleToggleSurface: props.onToggleSurface,
        handleUploadGpx,
        handlePlacePOI: props.onPlacePOI,
        handleAddPOI,
        handleAddPhotos,
        handleAddLine
    };
};
