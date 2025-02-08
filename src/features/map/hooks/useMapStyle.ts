import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export const useMapStyle = (map: mapboxgl.Map | null) => {
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => {
    if (!map) return;

    const checkStyle = () => {
      if (map.isStyleLoaded()) {
        setIsStyleLoaded(true);
      }
    };

    // Check initial state
    checkStyle();

    // Listen for style load
    map.on('style.load', checkStyle);

    return () => {
      map.off('style.load', checkStyle);
    };
  }, [map]);

  return isStyleLoaded;
};
