import { useEffect, useState } from 'react';
import { createMap } from '../services/mapService';
export function useMap(mapContainer) {
    const [map, setMap] = useState(null);
    useEffect(() => {
        if (!mapContainer.current)
            return;
        const mapInstance = createMap(mapContainer.current);
        setMap(mapInstance);
        return () => {
            mapInstance.setTarget(undefined);
            setMap(null);
        };
    }, [mapContainer]);
    return map;
}
