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
    // Get the map bounds
    const bounds = [-180, -85, 180, 85];
    // Get clusters
    const clusters = index.getClusters(bounds, Math.floor(zoom));
    // Store the index in a WeakMap for expansion zoom lookups
    indexMap.set(clusters, index);
    console.log('[Clustering] Final result:', {
        totalClusters: clusters.length,
        clusterSizes: clusters.map(c => isCluster(c) ? c.properties.point_count : 1)
    });
    return clusters;
};
export const clusterPhotos = (photos, radius, zoom) => {
    console.log('[Clustering] Starting with:', {
        photoCount: photos.length,
        radius,
        zoom,
        validPhotos: photos.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng).length
    });
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
