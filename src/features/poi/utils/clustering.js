import Supercluster from 'supercluster';

const createIndex = () => {
  return new Supercluster({
    radius: 40, // Clustering radius in pixels
    maxZoom: 12, // Maximum zoom level to cluster points
    minZoom: 0, // Minimum zoom level to cluster points
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

export const clusterPOIs = (pois, zoom) => {
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

  // Create a new index for each clustering operation
  const index = createIndex();
  
  // Load features into the index
  index.load(features);
  
  // Get the map bounds
  const bounds = [-180, -85, 180, 85];
  
  // Get clusters
  const clusters = index.getClusters(bounds, Math.floor(zoom));
  
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
