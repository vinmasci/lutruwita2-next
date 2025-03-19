import { useState, useEffect } from 'react';
import { useGpxProcessing } from '../../../gpx/hooks/useGpxProcessing';
import { useMapContext } from '../../context/MapContext';
import { useTextboxTabs } from '../../../presentation/context/TextboxTabsContext';

export const useSidebar = (props) => {
    // All hooks must be called before any other code
    const { setPoiPlacementMode, setPoiPlacementClick } = useMapContext();
    const { isProcessing } = useGpxProcessing();
    const { toggleDrawer: toggleTextboxTabsDrawer, isDrawerOpen: isTextboxTabsDrawerOpen, closeDrawer: closeTextboxTabsDrawer, openDrawer: openTextboxTabsDrawer } = useTextboxTabs();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [error, setError] = useState(null);
    const handleAddPhotos = () => {
        if (activeDrawer === 'photos') {
            setIsDrawerOpen(false);
            setActiveDrawer(null);
        }
        else {
            // Close TextboxTabs drawer if it's open
            if (isTextboxTabsDrawerOpen) {
                closeTextboxTabsDrawer();
            }
            
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
                // Close TextboxTabs drawer if it's open
                if (isTextboxTabsDrawerOpen) {
                    closeTextboxTabsDrawer();
                }
                
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
    
    // No bidirectional coordination effect - this was causing the TextboxTabs drawer to close immediately
    const handleAddPOI = () => {
        if (activeDrawer === 'poi') {
            setIsDrawerOpen(false);
            setActiveDrawer(null);
            setPoiPlacementMode(false);
            setPoiPlacementClick(undefined);
        }
        else {
            // Close TextboxTabs drawer if it's open
            if (isTextboxTabsDrawerOpen) {
                closeTextboxTabsDrawer();
            }
            
            setIsDrawerOpen(true);
            setActiveDrawer('poi');
            props.onItemClick('poi');
            props.onAddPOI();
        }
    };

    const handleTextboxTabs = () => {
        // Always close other drawers first
        setIsDrawerOpen(false);
        setActiveDrawer(null);
        
        // If TextboxTabs drawer is already open, close it
        if (isTextboxTabsDrawerOpen) {
            closeTextboxTabsDrawer();
        } else {
            // Otherwise, open it
            openTextboxTabsDrawer();
        }
        
        // Notify parent component
        if (props.onItemClick) {
            props.onItemClick('textboxTabs');
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
        handleTextboxTabs
    };
};
