// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================
// These define the shape of photo points and clusters
import { ProcessedPhoto } from '../../photo/components/Uploader/PhotoUploader.types';
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

// ==========================================
// 2. SUPERCLUSTER CONFIGURATION
// ==========================================
// This creates the clustering engine with specific settings
const createIndex = () => {
  return new Supercluster({
    radius: 40, // Fixed clustering radius in pixels
    maxZoom: 20, // Maximum zoom level to cluster points
    minZoom: 0,  // Minimum zoom level to cluster points
    map: props => ({
      cluster: true as const,  // THIS MARKS EVERYTHING AS A CLUSTER
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

// ==========================================
// 3. CLUSTERING FUNCTION
// ==========================================
// This is where photos are converted to GeoJSON and clustered
const getClusteredPhotos = (photos: ProcessedPhoto[], zoom: number): PhotoOrCluster[] => {
  console.log('[getClusteredPhotos] Processing with zoom:', zoom);
  
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

  // Create a new index for each clustering operation
  const index = createIndex();
  
  // Load features into the index
  index.load(features);

  // Get clusters using fixed bounds
  const bounds: BBox = [-180, -85, 180, 85];
  // Pass zoom directly to supercluster:
  // zoom=0 -> MAXIMUM clustering
  // zoom=20 -> NO clustering
  const flooredZoom = Math.floor(zoom);
  console.log('[getClusteredPhotos] Getting clusters with zoom:', zoom, 'Floor:', flooredZoom);
  
  const clusters = index.getClusters(bounds, flooredZoom) as PhotoOrCluster[];

  // Store the index in a WeakMap for expansion zoom lookups
  indexMap.set(clusters, index);

  // Log cluster details
  const clusterSizes = clusters.map(c => isCluster(c) ? c.properties.point_count : 1);
  const totalClusters = clusters.length;
  const singlePhotos = clusterSizes.filter(size => size === 1).length;
  const groupedPhotos = clusterSizes.filter(size => size > 1).length;

  console.log('[getClusteredPhotos] Clustering results:', {
    totalClusters,
    singlePhotos,
    groupedPhotos,
    zoomLevel: flooredZoom,
    clusterSizes
  });

  return clusters;
};

// ==========================================
// 4. EXPORTED FUNCTIONS
// ==========================================
// Main function that presentation mode uses to get clusters
export const clusterPhotosPresentation = (
  photos: ProcessedPhoto[],
  zoom: number,
  _mapBounds?: BBox // Ignore mapBounds parameter
): PhotoOrCluster[] => {
  console.log('[clusterPhotosPresentation] Input zoom:', zoom, 'Floored zoom:', Math.floor(zoom));
  return getClusteredPhotos(photos, Math.floor(zoom));
};

// WeakMap to store the index for each set of clusters
const indexMap = new WeakMap<PhotoOrCluster[], Supercluster>();

// Gets the zoom level where a cluster expands
export const getClusterExpansionZoom = (clusterId: number, clusters: PhotoOrCluster[]): number => {
  const index = indexMap.get(clusters);
  if (!index) return 0;  // Return min zoom if no index
  const expansionZoom = index.getClusterExpansionZoom(clusterId);
  console.log('[getClusterExpansionZoom] Cluster:', clusterId, 'Expansion zoom:', expansionZoom);
  return expansionZoom;  // Use zoom level directly
};

// Helper to check if something is a cluster
export const isCluster = (feature: PhotoOrCluster): feature is ClusterFeature => {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
};
