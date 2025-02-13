import React, { useEffect, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { PhotoMarker } from '../PhotoMarker/PhotoMarker';
import { PhotoCluster } from '../PhotoCluster/PhotoCluster';
import { PhotoPreviewModal } from '../PhotoPreview/PhotoPreviewModal';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import './PhotoLayer.css';

const CLUSTER_RADIUS = 50; // pixels for clustering nearby photos

interface PhotoClusterType {
  photos: ProcessedPhoto[];
  center: { lng: number; lat: number };
}

export const PhotoLayer: React.FC = () => {
  const { map } = useMapContext();
  const { photos } = usePhotoContext();
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedPhoto | null>(null);

  // Helper function to calculate distance between two points
  const calculateDistance = useCallback((point1: mapboxgl.Point, point2: mapboxgl.Point): number => {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  }, []);

  // Helper function to normalize coordinates within valid bounds
  const normalizeCoordinates = useCallback((lng: number, lat: number) => {
    // Normalize longitude to [-180, 180]
    let normalizedLng = lng;
    while (normalizedLng > 180) normalizedLng -= 360;
    while (normalizedLng < -180) normalizedLng += 360;
    
    // Clamp latitude to [-90, 90]
    const normalizedLat = Math.max(-90, Math.min(90, lat));
    
    return { lng: normalizedLng, lat: normalizedLat };
  }, []);

  // Helper function to calculate cluster center with normalization
  const calculateClusterCenter = useCallback((clusterPhotos: ProcessedPhoto[]): { lng: number; lat: number } => {
    const validPhotos = clusterPhotos.filter(p => p.coordinates);

    if (validPhotos.length === 0) {
      console.warn('No valid coordinates in cluster, using fallback position');
      return { lng: 0, lat: 0 }; // Fallback to null island rather than throwing
    }

    const center = validPhotos.reduce(
      (acc, p) => {
        const normalized = normalizeCoordinates(p.coordinates!.lng, p.coordinates!.lat);
        acc.lng += normalized.lng;
        acc.lat += normalized.lat;
        return acc;
      },
      { lng: 0, lat: 0 }
    );

    return normalizeCoordinates(
      center.lng / validPhotos.length,
      center.lat / validPhotos.length
    );
  }, [normalizeCoordinates]);

  // Cluster photos based on pixel distance only
  const { clusters, singlePhotos } = useMemo(() => {
    if (!map) return { clusters: [], singlePhotos: [] };

    try {
      // Create spatial index for better performance with coordinate normalization
      console.log('Total photos:', photos.length);
      console.log('Photos:', photos);
      
      const points = photos
        .filter(p => {
          if (!p.coordinates) {
            console.warn('Photo missing coordinates:', p.id);
            return false;
          }
          if (!p.coordinates.lng || !p.coordinates.lat) {
            console.warn('Photo has invalid coordinates:', p.id, p.coordinates);
            return false;
          }
          return true;
        });
      console.log('Photos with valid coordinates:', points.length);
      
      const projectedPoints = points
        .map(p => {
          const normalized = normalizeCoordinates(p.coordinates!.lng, p.coordinates!.lat);
          try {
            const point = map.project([normalized.lng, normalized.lat]);
      return {
        photo: p,
        point
      };
          } catch (err) {
            console.warn(`Failed to project coordinates for photo ${p.id}:`, err);
            return null;
          }
        })
        .filter((p): p is { photo: ProcessedPhoto; point: mapboxgl.Point } => p !== null);

      const clusteredPhotos: PhotoClusterType[] = [];
      const singlePhotos: ProcessedPhoto[] = [];
      const processed = new Set<string>();

      console.log('Projected points:', projectedPoints.length);

      for (let i = 0; i < projectedPoints.length; i++) {
        if (processed.has(projectedPoints[i].photo.id)) continue;

        const cluster: ProcessedPhoto[] = [projectedPoints[i].photo];
        processed.add(projectedPoints[i].photo.id);

        // Find nearby points using spatial index
        for (let j = i + 1; j < projectedPoints.length; j++) {
          if (processed.has(projectedPoints[j].photo.id)) continue;

          const distance = calculateDistance(projectedPoints[i].point, projectedPoints[j].point);
          
          if (distance <= CLUSTER_RADIUS) {
            cluster.push(projectedPoints[j].photo);
            processed.add(projectedPoints[j].photo.id);
          }
        }

        if (cluster.length > 1) {
          console.log('Found cluster with', cluster.length, 'photos');
          try {
            const center = calculateClusterCenter(cluster);
            clusteredPhotos.push({ photos: cluster, center });
          } catch (error) {
            console.error('Failed to calculate cluster center:', error);
            // If cluster center calculation fails, treat photos as individual
            cluster.forEach(photo => singlePhotos.push(photo));
          }
        } else {
          // Single photo
          singlePhotos.push(cluster[0]);
        }
      }

      return {
        clusters: clusteredPhotos,
        singlePhotos: singlePhotos
      };
    } catch (error) {
      console.error('Error during clustering:', error);
      return { clusters: [], singlePhotos: [] };
    }
  }, [map, photos, calculateDistance, calculateClusterCenter]);

  const handleClusterClick = useCallback((clusterPhotos: ProcessedPhoto[]) => {
    if (!map || clusterPhotos.length === 0) return;

    try {
      // Calculate bounds of all photos in cluster
      const bounds = new mapboxgl.LngLatBounds();
      const validPhotos = clusterPhotos.filter(photo => 
        photo.coordinates &&
        photo.coordinates.lng >= -180 && photo.coordinates.lng <= 180 &&
        photo.coordinates.lat >= -90 && photo.coordinates.lat <= 90
      );

      if (validPhotos.length === 0) {
        console.error('No valid coordinates in cluster for zooming');
        return;
      }

      validPhotos.forEach(photo => {
        bounds.extend([photo.coordinates!.lng, photo.coordinates!.lat]);
      });

      // Zoom to fit all photos with animation
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16, // Zoom in enough to see individual photos clearly
        duration: 500,
        essential: true
      });
    } catch (error) {
      console.error('Error handling cluster click:', error);
    }
  }, [map]);

  return (
    <>
      {singlePhotos.map(photo => (
        <PhotoMarker
          key={photo.id}
          photo={photo}
          onClick={() => setSelectedPhoto(photo)}
        />
      ))}

      {clusters.map((cluster, index) => (
        <PhotoCluster
          key={`cluster-${index}`}
          photos={cluster.photos}
          coordinates={cluster.center}
          onClick={() => handleClusterClick(cluster.photos)}
        />
      ))}

      {selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
};
