import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouteContext } from '../../../map/context/RouteContext';
import { SerializedPhoto } from '../../../map/types/route.types';
import { clusterPhotos, isCluster, getClusterExpansionZoom } from '../../../photo/utils/clustering';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
import mapboxgl from 'mapbox-gl';
import './PresentationPhotoLayer.css';

interface PresentationPhotoLayerProps {
  map: mapboxgl.Map;
}

export const PresentationPhotoLayer: React.FC<PresentationPhotoLayerProps> = ({ map }) => {
  const { currentRoute } = useRouteContext();
  const [zoom, setZoom] = useState<number | null>(null);
  const markersRef = useRef<Array<mapboxgl.Marker>>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<SerializedPhoto | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<SerializedPhoto[] | null>(null);

  // Listen for zoom changes
  useEffect(() => {
    if (!map) return;
    
    const handleZoom = () => {
      const newZoom = map.getZoom();
      setZoom(newZoom);
    };

    map.on('zoom', handleZoom);
    // Set initial zoom
    setZoom(map.getZoom());

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  // Helper function to normalize coordinates within valid bounds for safety
  const normalizeCoordinates = useCallback((lng: number, lat: number) => {
    // Normalize longitude to [-180, 180]
    let normalizedLng = lng;
    while (normalizedLng > 180) normalizedLng -= 360;
    while (normalizedLng < -180) normalizedLng += 360;
    
    // Clamp latitude to [-90, 90]
    const normalizedLat = Math.max(-90, Math.min(90, lat));
    
    return { lng: normalizedLng, lat: normalizedLat };
  }, []);

  // Filter photos to only include those with valid coordinates
  const validPhotos = useMemo(() => {
    if (!currentRoute || currentRoute._type !== 'loaded' || !currentRoute._loadedState?.photos) {
      return [];
    }

    return currentRoute._loadedState.photos.filter((p: SerializedPhoto) => {
      if (!p.coordinates) {
        console.warn('Photo missing coordinates:', p.id);
        return false;
      }
      if (typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
        console.warn('Photo has invalid coordinates:', p.id, p.coordinates);
        return false;
      }
      // Normalize coordinates for safety
      const normalized = normalizeCoordinates(p.coordinates.lng, p.coordinates.lat);
      p.coordinates.lng = normalized.lng;
      p.coordinates.lat = normalized.lat;
      return true;
    });
  }, [currentRoute, normalizeCoordinates]);

  useEffect(() => {
    if (!map || zoom === null || validPhotos.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker: mapboxgl.Marker) => marker.remove());
    markersRef.current = [];

    // Get clustered items
    // Convert SerializedPhoto to ProcessedPhoto
    const processedPhotos = validPhotos.map(photo => ({
      ...photo,
      dateAdded: new Date(photo.dateAdded)
    }));
    
    const clusteredItems = clusterPhotos(processedPhotos, 0, zoom);

    clusteredItems.forEach(item => {
      const el = document.createElement('div');
      
      if (isCluster(item)) {
        // Cluster marker
        el.className = 'photo-cluster';
        el.setAttribute('data-zoom', Math.floor(zoom).toString());
        
        const container = document.createElement('div');
        container.className = 'photo-cluster-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'photo-cluster-bubble';
        
        const count = document.createElement('div');
        count.className = 'photo-cluster-count';
        count.textContent = item.properties.point_count.toString();
        
        // Add preview image
        const preview = document.createElement('img');
        preview.src = item.properties.photos[0].thumbnailUrl || '/images/photo-fallback.svg';
        preview.alt = item.properties.photos[0].name || 'Photo preview';
        preview.className = 'photo-cluster-preview';
        preview.onerror = () => {
          preview.src = '/images/photo-fallback.svg';
          preview.alt = 'Failed to load photo';
        };
        
        const point = document.createElement('div');
        point.className = 'photo-cluster-point';
        
        bubble.appendChild(preview);
        bubble.appendChild(count);
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);
        
        // Add click handler for clusters
        el.addEventListener('click', () => {
          const expansionZoom = getClusterExpansionZoom(item.properties.cluster_id);
          const targetZoom = Math.min(expansionZoom + 1.5, 20);
          
          const [lng, lat] = item.geometry.coordinates;
          map.easeTo({
            center: [lng, lat],
            zoom: targetZoom
          });
        });
      } else {
        // Single photo marker
        el.className = 'photo-marker';
        el.setAttribute('data-zoom', Math.floor(zoom).toString());
        
        const container = document.createElement('div');
        container.className = 'photo-marker-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'photo-marker-bubble';
        
        const img = document.createElement('img');
        img.src = item.properties.photo.thumbnailUrl || '/images/photo-fallback.svg';
        
        const point = document.createElement('div');
        point.className = 'photo-marker-point';
        
        bubble.appendChild(img);
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);

        // Add click handler for single photos
        el.addEventListener('click', () => {
          const photo = {
            ...item.properties.photo,
            dateAdded: new Date(item.properties.photo.dateAdded)
          };
          setSelectedPhoto(photo as any); // Using type assertion since we know the structure matches
        });
      }

      const coordinates = isCluster(item) 
        ? item.geometry.coordinates.slice(0, 2) as [number, number]
        : item.properties.photo.coordinates 
          ? [item.properties.photo.coordinates.lng, item.properties.photo.coordinates.lat] as [number, number]
          : undefined;

      if (!coordinates) return;

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

      return () => {
        markersRef.current.forEach((marker: mapboxgl.Marker) => marker.remove());
        markersRef.current = [];
      };
    }, [map, zoom, validPhotos]);

    return (
      <>
        {selectedPhoto && (
          <PhotoPreviewModal
            photo={selectedPhoto as any}
            onClose={() => {
              setSelectedPhoto(null);
              setSelectedCluster(null);
            }}
            additionalPhotos={selectedCluster as any}
          />
        )}
      </>
    );
};
