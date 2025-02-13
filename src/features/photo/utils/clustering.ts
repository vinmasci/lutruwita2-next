import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';

export interface Cluster {
  center: {
    lat: number;
    lng: number;
  };
  photos: ProcessedPhoto[];
}

export const clusterPhotos = (
  photos: ProcessedPhoto[],
  radius: number,
  zoom: number
): (Cluster | ProcessedPhoto)[] => {
  console.log('[Clustering] Starting with:', {
    photoCount: photos.length,
    radius,
    zoom,
    validPhotos: photos.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng).length
  });

  console.log('[Clustering] Current zoom level:', zoom);

  // Show individual photos at high zoom levels (> 11)
  if (zoom > 11) {
    console.log('[Clustering] Zoom level too high, showing individual photos');
    return photos;
  }

  console.log('[Clustering] Creating clusters at zoom level:', zoom);

  // Base radius is 0.5km at zoom level 11, doubles for each zoom level below that
  const zoomFactor = Math.max(0, 11 - zoom);
  const adjustedRadius = 0.5 * Math.pow(2, zoomFactor);
  console.log('[Clustering] Adjusted radius:', adjustedRadius);

  // Filter valid photos
  const validPhotos = photos.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng);
  const processedPhotos = new Set<string>();
  const clusters: (Cluster | ProcessedPhoto)[] = [];

  // Process each photo
  validPhotos.forEach((photo, index) => {
    if (processedPhotos.has(photo.id)) {
      return;
    }

    console.log(`[Clustering] Processing photo ${index}:`, {
      id: photo.id,
      coords: photo.coordinates
    });

    // Find all photos within radius of this photo
    const nearbyPhotos = validPhotos.filter(otherPhoto => {
      if (otherPhoto === photo || processedPhotos.has(otherPhoto.id)) return false;

      const distance = calculateDistance(
        photo.coordinates!.lat,
        photo.coordinates!.lng,
        otherPhoto.coordinates!.lat,
        otherPhoto.coordinates!.lng
      );

      console.log(`[Clustering] Distance to photo ${otherPhoto.id}:`, {
        distance,
        threshold: adjustedRadius,
        isNearby: distance <= adjustedRadius
      });

      return distance <= adjustedRadius;
    });

    // Create a cluster with this photo and any nearby photos
    const clusterPhotos = [photo, ...nearbyPhotos];
    
    if (clusterPhotos.length === 1) {
      clusters.push(photo);
      processedPhotos.add(photo.id);
    } else {
      // Only mark photos as processed if we're actually creating a cluster
      clusterPhotos.forEach(p => processedPhotos.add(p.id));
      const center = {
        lat: clusterPhotos.reduce((sum, p) => sum + p.coordinates!.lat, 0) / clusterPhotos.length,
        lng: clusterPhotos.reduce((sum, p) => sum + p.coordinates!.lng, 0) / clusterPhotos.length
      };

      clusters.push({
        center,
        photos: clusterPhotos
      });
    }
  });

  console.log('[Clustering] Final result:', {
    totalClusters: clusters.length,
    clusterSizes: clusters.map(c => isCluster(c) ? c.photos.length : 1)
  });

  return clusters;
};

// Haversine formula to calculate distance between two points in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const isCluster = (item: Cluster | ProcessedPhoto): item is Cluster => {
  return 'photos' in item;
};
