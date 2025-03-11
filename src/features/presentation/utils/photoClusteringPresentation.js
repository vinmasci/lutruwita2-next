import Supercluster from 'supercluster';
// ==========================================
// 2. SUPERCLUSTER CONFIGURATION
// ==========================================
// This creates the clustering engine with specific settings
const createIndex = () => {
    return new Supercluster({
        radius: 80, // Increased clustering radius for more aggressive clustering
        maxZoom: 12, // Decreased maximum zoom level to cluster points at higher zoom levels
        minZoom: 0, // Minimum zoom level to cluster points
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
const getClusteredPhotos = (photos, zoom) => {
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
    // Create a new index for each clustering operation
    const index = createIndex();
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
export const clusterPhotosPresentation = (photos, zoom, _mapBounds // Ignore mapBounds parameter
) => {
    return getClusteredPhotos(photos, Math.floor(zoom));
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
