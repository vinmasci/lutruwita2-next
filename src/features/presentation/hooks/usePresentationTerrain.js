import { useEffect, useState } from 'react';
/**
 * Hook specifically for presentation mode terrain loading
 * Loads terrain in parallel with route display, not blocking the initial render
 */
export const usePresentationTerrain = ({ map, onTerrainLoaded }) => {
    const [isTerrainLoaded, setIsTerrainLoaded] = useState(false);
    useEffect(() => {
        if (!map || isTerrainLoaded)
            return;
        console.log('[PresentationTerrain] Starting terrain load');
        // Load terrain in parallel with route display
        const loadTerrain = () => {
            try {
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14
                });
                map.setTerrain({
                    source: 'mapbox-dem',
                    exaggeration: 1.5
                });
                // Wait for terrain to be ready
                map.once('idle', () => {
                    console.log('[PresentationTerrain] Terrain loaded');
                    setIsTerrainLoaded(true);
                    onTerrainLoaded?.();
                });
            }
            catch (error) {
                console.error('[PresentationTerrain] Error loading terrain:', error);
                // Don't block the app if terrain fails to load
                setIsTerrainLoaded(true);
            }
        };
        // Start loading terrain after a short delay to prioritize route display
        setTimeout(loadTerrain, 100);
        return () => {
            if (map.getSource('mapbox-dem')) {
                map.setTerrain(null);
                map.removeSource('mapbox-dem');
            }
        };
    }, [map, isTerrainLoaded, onTerrainLoaded]);
    return {
        isTerrainLoaded,
        reset: () => setIsTerrainLoaded(false)
    };
};
