import { useEffect, useState } from 'react';
import { Map } from 'ol';
import { createMap } from '../services/mapService';

export function useMap(mapContainer: React.RefObject<HTMLDivElement>) {
  const [map, setMap] = useState<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = createMap(mapContainer.current);
    setMap(mapInstance);

    return () => {
      mapInstance.setTarget(undefined);
      setMap(null);
    };
  }, [mapContainer]);

  return map;
}
