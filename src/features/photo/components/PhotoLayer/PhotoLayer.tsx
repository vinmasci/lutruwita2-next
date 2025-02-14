import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { PhotoMarker } from '../PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../PhotoCluster/PhotoCluster';
import { PhotoPreviewModal } from '../PhotoPreview/PhotoPreviewModal';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import { clusterPhotos, isCluster, PhotoOrCluster, PhotoFeature, ClusterFeature, getClusterExpansionZoom } from '../../utils/clustering';
import './PhotoLayer.css';

export const PhotoLayer: React.FC = () => {
  const { map } = useMapContext();
  const { photos } = usePhotoContext();
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedPhoto | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ProcessedPhoto[] | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  // Listen for zoom changes
  useEffect(() => {
    if (!map) return;
    
    const handleZoom = () => {
      const newZoom = map.getZoom();
      console.log('[PhotoLayer] Zoom changed:', newZoom);
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
    return photos.filter(p => {
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
  }, [photos, normalizeCoordinates]);

  const clusteredItems = useMemo(() => {
    if (!map || zoom === null) return [];
    return clusterPhotos(validPhotos, 0, zoom);
  }, [validPhotos, map, zoom]);

  const handleClusterClick = useCallback((cluster: ClusterFeature) => {
    if (!map) return;

    // Get the zoom level to expand this cluster and add additional zoom for more aggressive zooming
    const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id);
    const targetZoom = Math.min(expansionZoom + 1.5, 20); // Add 1.5 zoom levels, but cap at 20
    
    // Get the cluster's coordinates
    const [lng, lat] = cluster.geometry.coordinates;

    // Zoom to the cluster's location with more aggressive zoom
    map.easeTo({
      center: [lng, lat],
      zoom: targetZoom
    });

    // If it's a small cluster, show the photos
    if (cluster.properties.point_count <= 4) {
      setSelectedCluster(cluster.properties.photos);
      if (cluster.properties.point_count === 1) {
        setSelectedPhoto(cluster.properties.photos[0]);
      }
    }
  }, [map]);

  return (
    <div className="photo-layer">
      {clusteredItems.map(item => 
        isCluster(item) ? (
          <PhotoCluster
            key={`cluster-${item.properties.cluster_id}`}
            cluster={item}
            onClick={() => handleClusterClick(item)}
          />
        ) : (
          <PhotoMarker
            key={item.properties.id}
            photo={item.properties.photo}
            onClick={() => setSelectedPhoto(item.properties.photo)}
          />
        )
      )}

      {selectedPhoto && (
        <PhotoPreviewModal
          key={`preview-${selectedPhoto.id}`}
          photo={selectedPhoto}
          onClose={() => {
            setSelectedPhoto(null);
            setSelectedCluster(null);
          }}
          additionalPhotos={selectedCluster}
        />
      )}
    </div>
  );
};
