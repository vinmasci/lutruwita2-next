import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export const useMapStyle = (map: mapboxgl.Map | null) => {
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => {
    if (!map) return;

    const checkStyle = () => {
      const style = map.getStyle();
      // For satellite-streets style, check for both satellite and street layers
      // Check if the style is loaded and has layers
      if (map.isStyleLoaded() && style && style.layers && style.layers.length > 0) {
        setIsStyleLoaded(true);
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
