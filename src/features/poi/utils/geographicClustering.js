/**
 * Geographic clustering utility for POIs
 * This approach clusters POIs based on their real-world geographic distance
 * rather than screen pixel distance, creating more stable clusters.
 */

/**
 * Calculate the distance between two points in meters using the Haversine formula
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Calculate the center point of a cluster of POIs
 * @param {Array} pois - Array of POIs in the cluster
 * @returns {Array} [longitude, latitude] of the center point
 */
export const calculateClusterCenter = (pois) => {
  if (!pois || pois.length === 0) return [0, 0];
  
  // Simple average of coordinates
  const sumLat = pois.reduce((sum, poi) => sum + poi.coordinates[1], 0);
  const sumLng = pois.reduce((sum, poi) => sum + poi.coordinates[0], 0);
  
  return [
    sumLng / pois.length,
    sumLat / pois.length
  ];
};

/**
 * Create geographic clusters from POIs based on real-world distance
 * @param {Array} pois - Array of POIs to cluster
 * @param {number} distanceThreshold - Distance threshold in meters (default: 500m)
 * @returns {Array} Array of cluster objects
 */
export const createGeographicClusters = (pois, distanceThreshold = 500) => {
  if (!pois || pois.length === 0) return [];
  
  const clusters = [];
  const assigned = new Set();
  
  // Sort POIs by category to keep similar POIs together when possible
  const sortedPois = [...pois].sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return 0;
  });
  
  for (const poi of sortedPois) {
    if (assigned.has(poi.id)) continue;
    
    const cluster = {
      pois: [poi],
      id: `geo-cluster-${clusters.length + 1}`
    };
    assigned.add(poi.id);
    
    // Find all POIs within the distance threshold
    for (const otherPoi of sortedPois) {
      if (assigned.has(otherPoi.id)) continue;
      
      const distance = calculateDistance(
        poi.coordinates[1], poi.coordinates[0], 
        otherPoi.coordinates[1], otherPoi.coordinates[0]
      );
      
      if (distance <= distanceThreshold) {
        cluster.pois.push(otherPoi);
        assigned.add(otherPoi.id);
      }
    }
    
    // Calculate the center of the cluster
    cluster.center = calculateClusterCenter(cluster.pois);
    
    // Add point count and other properties needed for rendering
    cluster.pointCount = cluster.pois.length;
    
    clusters.push(cluster);
  }
  
  return clusters;
};

/**
 * Convert geographic clusters to GeoJSON format for rendering
 * @param {Array} clusters - Array of geographic clusters
 * @returns {Array} Array of GeoJSON features representing clusters and individual POIs
 */
export const clustersToGeoJSON = (clusters) => {
  if (!clusters || clusters.length === 0) return [];
  
  const features = [];
  
  clusters.forEach(cluster => {
    if (cluster.pointCount > 1) {
      // Create a cluster feature
      features.push({
        type: 'Feature',
        properties: {
          cluster: true,
          cluster_id: cluster.id,
          point_count: cluster.pointCount,
          point_count_abbreviated: cluster.pointCount,
          pois: cluster.pois
        },
        geometry: {
          type: 'Point',
          coordinates: cluster.center
        }
      });
    } else if (cluster.pois.length === 1) {
      // Create an individual POI feature
      const poi = cluster.pois[0];
      features.push({
        type: 'Feature',
        properties: {
          id: poi.id,
          poi
        },
        geometry: {
          type: 'Point',
          coordinates: poi.coordinates
        }
      });
    }
  });
  
  return features;
};

/**
 * Main function to create geographic clusters and convert to GeoJSON
 * @param {Array} pois - Array of POIs to cluster
 * @param {Object} options - Options for clustering
 * @param {number} options.distanceThreshold - Distance threshold in meters (default: 500m)
 * @param {boolean} options.isMobile - Whether the device is mobile (uses more aggressive clustering)
 * @returns {Array} Array of GeoJSON features
 */
export const clusterPOIsGeographically = (pois, options = {}) => {
  const { 
    distanceThreshold = 500,
    isMobile = false
  } = options;
  
  // Filter out POIs with invalid coordinates
  const validPOIs = pois.filter(p => p.coordinates && p.coordinates.length === 2);
  
  // If distance threshold is 0, don't cluster at all
  if (distanceThreshold === 0) {
    // Return individual POIs as GeoJSON features without clustering
    return validPOIs.map(poi => ({
      type: 'Feature',
      properties: {
        id: poi.id,
        poi
      },
      geometry: {
        type: 'Point',
        coordinates: poi.coordinates
      }
    }));
  }
  
  // Use more aggressive clustering on mobile
  const effectiveThreshold = isMobile ? distanceThreshold * 2 : distanceThreshold;
  
  // Create geographic clusters
  const clusters = createGeographicClusters(validPOIs, effectiveThreshold);
  
  // Convert to GeoJSON
  return clustersToGeoJSON(clusters);
};
