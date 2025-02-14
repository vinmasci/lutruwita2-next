import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';
import Supercluster from 'supercluster';
import { BBox, Feature, Point } from 'geojson';

export interface PhotoFeature extends Feature<Point> {
  properties: {
    id: string;
    photo: ProcessedPhoto;
  };
}

export interface ClusterFeature extends Feature<Point> {
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: number;
    photos: ProcessedPhoto[];
  };
}

export type PhotoOrCluster = PhotoFeature | ClusterFeature;

let index: Supercluster<PhotoFeature['properties'], ClusterFeature['properties']> | null = null;

const createIndex = () => {
  index = new Supercluster({
    radius: 60, // Clustering radius in pixels
    maxZoom: 16, // Maximum zoom level to cluster points
    minZoom: 0, // Minimum zoom level to cluster points
    map: props => ({
      cluster: true as const,
      cluster_id: 0,
      point_count: 1,
      point_count_abbreviated: 1,
      photos: [props.photo]
    }),
    reduce: (accumulated, props) => {
      if (!accumulated.cluster) return;
      accumulated.point_count += props.point_count;
      accumulated.point_count_abbreviated = accumulated.point_count;
      accumulated.photos = [...accumulated.photos, ...props.photos];
    }
  });
};

const getClusteredPhotos = (photos: ProcessedPhoto[], zoom: number): PhotoOrCluster[] => {
  // Convert photos to GeoJSON features
  const features: PhotoFeature[] = photos
    .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
    .map(photo => ({
      type: 'Feature',
      properties: {
        id: photo.id,
        photo
      },
      geometry: {
        type: 'Point',
        coordinates: [photo.coordinates!.lng, photo.coordinates!.lat]
      }
    }));

  if (!index) return [];

  // Load features into the index
  index.load(features);

  // Get the map bounds
  const bounds: BBox = [-180, -85, 180, 85];

  // Get clusters
  const clusters = index.getClusters(bounds, Math.floor(zoom)) as PhotoOrCluster[];

  console.log('[Clustering] Final result:', {
    totalClusters: clusters.length,
    clusterSizes: clusters.map(c => isCluster(c) ? c.properties.point_count : 1)
  });

  return clusters;
};

export const clusterPhotos = (
  photos: ProcessedPhoto[],
  radius: number,
  zoom: number
): PhotoOrCluster[] => {
  console.log('[Clustering] Starting with:', {
    photoCount: photos.length,
    radius,
    zoom,
    validPhotos: photos.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng).length
  });

  if (!index) {
    createIndex();
  }
  return getClusteredPhotos(photos, zoom);
};

export const getClusterExpansionZoom = (clusterId: number): number => {
  if (!index) return 0;
  return index.getClusterExpansionZoom(clusterId);
};

export const isCluster = (feature: PhotoOrCluster): feature is ClusterFeature => {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
};
