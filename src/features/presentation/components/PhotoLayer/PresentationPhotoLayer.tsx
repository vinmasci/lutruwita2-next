import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { LoadedRoute } from '../../../map/types/route.types';
import { SerializedPhoto } from '../../../map/types/route.types';

interface PresentationPhotoLayerProps {
  map: mapboxgl.Map;
}

export const PresentationPhotoLayer: React.FC<PresentationPhotoLayerProps> = ({ map }) => {
  const { currentRoute } = useRouteContext();
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Type guard for LoadedRoute
    if (!map || !currentRoute || currentRoute._type !== 'loaded' || !currentRoute._loadedState?.photos) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const photos = currentRoute._loadedState.photos;

    // Add photo markers
    photos.forEach((photo: SerializedPhoto) => {
      if (!photo.coordinates) return;

      const el = document.createElement('div');
      el.className = 'photo-marker';
      el.style.backgroundImage = `url(${photo.thumbnailUrl || '/images/photo-fallback.svg'})`;
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundSize = 'cover';
      el.style.borderRadius = '4px';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat(photo.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="max-width: 200px;">
                <img src="${photo.thumbnailUrl || '/images/photo-fallback.svg'}" 
                     style="width: 100%; height: auto; border-radius: 4px;" />
              </div>
            `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, currentRoute]);

  return null;
};
