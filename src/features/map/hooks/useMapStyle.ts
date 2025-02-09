import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export const useMapStyle = (map: mapboxgl.Map | null) => {
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => {
    if (!map) {
      console.debug('[useMapStyle] No map instance provided');
      return;
    }

    console.debug('[useMapStyle] Initializing with map:', {
      loaded: map.loaded(),
      styleLoaded: map.isStyleLoaded(),
      style: map.getStyle()?.name
    });

    const checkStyle = () => {
      const style = map.getStyle();
      const hasRequiredLayers = style?.layers?.some(l => 
        l.id === 'settlement-major-label' || 
        l.id === 'settlement-minor-label' || 
        l.id === 'settlement-subdivision-label'
      );

      console.debug('[useMapStyle] Checking style:', {
        styleLoaded: map.isStyleLoaded(),
        hasStyle: !!style,
        hasRequiredLayers,
        style: style?.name,
        layers: style?.layers?.map(l => l.id)
      });

      // Consider style loaded if we have the required layers
      if (hasRequiredLayers) {
        console.debug('[useMapStyle] Style loaded successfully - required layers found');
        setIsStyleLoaded(true);
      }
    };

    // Handle style data events
    const handleStyleData = () => {
      console.debug('[useMapStyle] Style data event received');
      checkStyle();
    };

    // Handle style load events
    const handleStyleLoad = () => {
      console.debug('[useMapStyle] Style load event received');
      checkStyle();
    };

    // Check initial state
    checkStyle();

    // Listen for style events
    map.on('styledata', handleStyleData);
    map.on('style.load', handleStyleLoad);

    return () => {
      console.debug('[useMapStyle] Cleaning up listeners');
      map.off('styledata', handleStyleData);
      map.off('style.load', handleStyleLoad);
    };
  }, [map]);

  return isStyleLoaded;
};
