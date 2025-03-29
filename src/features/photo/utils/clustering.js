import Supercluster from 'supercluster';
const createIndex = () => {
    return new Supercluster({
        radius: 40, // Clustering radius in pixels (reduced for finer control)
        maxZoom: 12, // Maximum zoom level to cluster points (increased to allow more detail)
        minZoom: 0, // Minimum zoom level to cluster points
        map: props => ({
            cluster_id: 0,
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
// Helper function to get a unique identifier from a photo URL
export const getPhotoIdentifier = (url) => {
    if (!url) {
        console.warn('[Clustering] No URL provided for photo identifier');
        return null;
    }
    
    // Try to extract the version number from Cloudinary URL
    const versionMatch = url.match(/\/v(\d+)\//);
    if (versionMatch && versionMatch[1]) {
        console.log(`[Clustering] Extracted version identifier: ${versionMatch[1]} from URL: ${url.substring(0, 50)}...`);
        return versionMatch[1]; // Return the version number
    }
    
    // Try to extract the public ID from Cloudinary URL
    const publicIdMatch = url.match(/\/upload\/(?:v\d+\/)?([^/]+)(?:\.\w+)?$/);
    if (publicIdMatch && publicIdMatch[1]) {
        console.log(`[Clustering] Extracted public ID: ${publicIdMatch[1]} from URL: ${url.substring(0, 50)}...`);
        return publicIdMatch[1]; // Return the public ID
    }
    
    // If we can't extract a clean identifier, use a hash of the URL
    console.log(`[Clustering] Using full URL as identifier for: ${url.substring(0, 50)}...`);
    
    // Create a simple hash of the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return `url-${Math.abs(hash).toString(16)}`;
};

const getClusteredPhotos = (photos, zoom) => {
    // Convert photos to GeoJSON features
    const features = photos
        .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
        .map(photo => ({
        type: 'Feature',
        properties: {
            id: getPhotoIdentifier(photo.url) || `photo-${Math.random().toString(36).substr(2, 9)}`,
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
    // Get the map bounds
    const bounds = [-180, -85, 180, 85];
    // Get clusters
    const clusters = index.getClusters(bounds, Math.floor(zoom));
    // Store the index in a WeakMap for expansion zoom lookups
    indexMap.set(clusters, index);
    return clusters;
};
export const clusterPhotos = (photos, radius, zoom) => {
    return getClusteredPhotos(photos, Math.floor(zoom));
};
// WeakMap to store the index for each set of clusters
const indexMap = new WeakMap();
export const getClusterExpansionZoom = (clusterId, clusters) => {
    const index = indexMap.get(clusters);
    if (!index)
        return 0;
    return index.getClusterExpansionZoom(clusterId);
};
export const isCluster = (feature) => {
    return 'cluster' in feature.properties && feature.properties.cluster === true;
};
