import Supercluster from 'supercluster';

// Detect iOS devices
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// ==========================================
// 2. SUPERCLUSTER CONFIGURATION
// ==========================================
// This creates the clustering engine with specific settings
const createIndex = (radius = 100, maxZoom = 8, minPoints = 2) => {
    // iOS devices get even more aggressive clustering
    if (isIOS) {
        radius = 100;
        maxZoom = 10; // Lower maxZoom to make clusters break apart earlier
        minPoints = 2;
    }
    
    return new Supercluster({
        radius: radius, // Much more aggressive clustering radius
        maxZoom: maxZoom, // Higher maximum zoom level to keep points clustered longer
        minZoom: 0, // Minimum zoom level to cluster points
        minPoints: minPoints, // Cluster even with just 2 points
        map: props => ({
            // Let supercluster handle clustering itself
            // Don't set cluster: true here
            point_count: 1,
            point_count_abbreviated: 1,
            photos: [props.photo]
        }),
        reduce: (accumulated, props) => {
            if (!accumulated.cluster)
                return;
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
const getClusteredPhotos = (photos, zoom, options = {}) => {
    const { radius = 100, maxZoom = 12, minPoints = 2, extraAggressive = false } = options;
    
    // Apply even more aggressive settings if requested
    const clusterRadius = extraAggressive ? 100 : radius;
    const clusterMaxZoom = extraAggressive ? 12 : maxZoom;
    const clusterMinPoints = extraAggressive ? 2 : minPoints;
    // Convert photos to GeoJSON features
    const features = photos
        .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
        .map(photo => ({
        type: 'Feature',
        properties: {
            id: photo.id,
            photo
        },
        geometry: {
            type: 'Point',
            coordinates: [photo.coordinates.lng, photo.coordinates.lat]
        }
    }));
    // Create a new index with the specified parameters
    const index = createIndex(clusterRadius, clusterMaxZoom, clusterMinPoints);
    // Load features into the index
    index.load(features);
    // Get clusters using fixed bounds
    const bounds = [-180, -85, 180, 85];
    // Pass zoom directly to supercluster:
    // zoom=0 -> MAXIMUM clustering
    // zoom=20 -> NO clustering
    const flooredZoom = Math.floor(zoom);
    const clusters = index.getClusters(bounds, flooredZoom);
    // Store the index in a WeakMap for expansion zoom lookups
    indexMap.set(clusters, index);
    return clusters;
};
// ==========================================
// 4. EXPORTED FUNCTIONS
// ==========================================
// Main function that presentation mode uses to get clusters
export const clusterPhotosPresentation = (photos, zoom, _mapBounds, // Ignore mapBounds parameter
    options = {}) => {
    // Round zoom to nearest 0.5 to reduce recalculations
    const roundedZoom = Math.floor(zoom * 2) / 2;
    
    // Apply iOS-specific optimizations
    const iosOptions = isIOS ? { extraAggressive: true } : {};
    
    // Merge provided options with iOS options
    const mergedOptions = { ...options, ...iosOptions };
    
    return getClusteredPhotos(photos, roundedZoom, mergedOptions);
};
// WeakMap to store the index for each set of clusters
const indexMap = new WeakMap();
// Gets the zoom level where a cluster expands
export const getClusterExpansionZoom = (clusterId, clusters) => {
    const index = indexMap.get(clusters);
    if (!index)
        return 0; // Return min zoom if no index
    const expansionZoom = index.getClusterExpansionZoom(clusterId);
    return expansionZoom; // Use zoom level directly
};
// Helper to check if something is a cluster
export const isCluster = (feature) => {
    // Supercluster adds 'cluster' property to cluster features
    // and 'point_count' property indicating the number of points in the cluster
    return feature.properties && 
           'cluster' in feature.properties && 
           feature.properties.cluster === true;
};
