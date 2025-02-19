import { useState, useEffect } from 'react';
export const useMapStyle = (map) => {
    const [isStyleLoaded, setIsStyleLoaded] = useState(false);
    useEffect(() => {
        if (!map)
            return;
        const checkStyle = () => {
            const style = map.getStyle();
            const layerCount = style?.layers?.length ?? 0;
            const hasLayers = layerCount > 0;
            console.debug('[useMapStyle] Checking style:', {
                isStyleLoaded: map.isStyleLoaded(),
                hasStyle: !!style,
                hasLayers,
                layerCount
            });
            // For satellite-streets style, check for both satellite and street layers
            // Check if the style is loaded and has layers
            // Only check if we have layers, since isStyleLoaded() seems unreliable
            if (hasLayers) {
                console.debug('[useMapStyle] Style is ready');
                setIsStyleLoaded(true);
            }
            else {
                console.debug('[useMapStyle] Style not ready yet');
            }
        };
        const handleStyleEvent = () => checkStyle();
        // Check initial state
        checkStyle();
        // Listen for style events
        map.on('styledata', handleStyleEvent);
        map.on('style.load', handleStyleEvent);
        return () => {
            map.off('styledata', handleStyleEvent);
            map.off('style.load', handleStyleEvent);
        };
    }, [map]);
    return isStyleLoaded;
};
