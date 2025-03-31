import Supercluster from 'supercluster';

// Detect iOS devices
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const createIndex = (radius = 150, maxZoom = 16, minPoints = 2) => {
  // iOS devices get even more aggressive clustering
  if (isIOS) {
    radius = 200;
    maxZoom = 18;
    minPoints = 2;
  }

  return new Supercluster({
    radius: radius, // Much more aggressive clustering radius
    maxZoom: maxZoom, // Higher maximum zoom level to keep points clustered longer
    minZoom: 0, // Minimum zoom level to cluster points
    minPoints: minPoints, // Cluster even with just 2 points
    map: props => ({
      cluster_id: 0,
      point_count: 1,
      point_count_abbreviated: 1,
      pois: [props.poi]
    }),
    reduce: (accumulated, props) => {
      if (!accumulated.cluster) return;
      accumulated.point_count += props.point_count;
      accumulated.point_count_abbreviated = accumulated.point_count;
      accumulated.pois = [...accumulated.pois, ...props.pois];
    }
  });
};

// WeakMap to store the index for each set of clusters
const indexMap = new WeakMap();

export const clusterPOIs = (pois, zoom, options = {}) => {
  const { radius = 150, maxZoom = 16, minPoints = 2, extraAggressive = false } = options;
  
  // Apply even more aggressive settings if requested
  const clusterRadius = extraAggressive ? 180 : radius;
  const clusterMaxZoom = extraAggressive ? 18 : maxZoom;
  const clusterMinPoints = extraAggressive ? 2 : minPoints;
  
  // Convert POIs to GeoJSON features
  const features = pois
    .filter(p => p.coordinates && p.coordinates.length === 2)
    .map(poi => ({
      type: 'Feature',
      properties: {
        id: poi.id,
        poi
      },
      geometry: {
        type: 'Point',
        coordinates: [poi.coordinates[0], poi.coordinates[1]]
      }
    }));

  // Create a new index with the specified parameters
  const index = createIndex(clusterRadius, clusterMaxZoom, clusterMinPoints);
  
  // Load features into the index
  index.load(features);
  
  // Get the map bounds
  const bounds = [-180, -85, 180, 85];
  
  // Round zoom to nearest 0.5 to reduce recalculations
  const roundedZoom = Math.floor(zoom * 2) / 2;
  
  // Get clusters
  const clusters = index.getClusters(bounds, roundedZoom);
  
  // Store the index in a WeakMap for expansion zoom lookups
  indexMap.set(clusters, index);
  
  return clusters;
};

export const getClusterExpansionZoom = (clusterId, clusters) => {
  const index = indexMap.get(clusters);
  if (!index) return 0;
  return index.getClusterExpansionZoom(clusterId);
};

export const isCluster = (feature) => {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
};
