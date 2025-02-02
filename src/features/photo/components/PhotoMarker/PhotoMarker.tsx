import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import { useMapContext } from '../../../map/context/MapContext';

interface PhotoMarkerProps {
  photo: ProcessedPhoto;
  onClick?: () => void;
}

export const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onClick }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { map } = useMapContext();

  useEffect(() => {
    if (!map || !photo.coordinates) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = 'photo-marker';

    // Create thumbnail container
    const container = document.createElement('div');
    container.className = 'photo-marker-container';
    container.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: transform 0.2s;
      cursor: pointer;
    `;

    // Add thumbnail image
    const img = document.createElement('img');
    img.src = photo.thumbnailUrl;
    img.alt = photo.name;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    container.appendChild(img);
    el.appendChild(container);

    // Add hover effect
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.1)';
    });
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
    });

    // Add click handler
    if (onClick) {
      container.addEventListener('click', onClick);
    }

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([photo.coordinates.lng, photo.coordinates.lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, photo, onClick]);

  return null;
};
