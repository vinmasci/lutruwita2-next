import Supercluster from 'supercluster';

// Detect mobile devices
const isMobile = () => window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Detect iOS devices
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Detect low-end devices if possible
const isLowEndDevice = () => navigator.deviceMemory && navigator.deviceMemory <= 4;

// ==========================================
// 2. SUPERCLUSTER CONFIGURATION
// ==========================================
// This creates the clustering engine with specific settings
const createIndex = (radius = 100, maxZoom = 8, minPoints = 2) => {
    // Mobile devices get more aggressive clustering
    if (isMobile()) {
        radius = 150; // Increase radius for more aggressive clustering
        maxZoom = 6;  // Lower maxZoom to keep clusters longer
        minPoints = 2;
    }
    
    // Low-end devices get even more aggressive clustering
    if (isLowEndDevice()) {
        radius = 180;
        maxZoom = 5;
        minPoints = 2;
    }
    
    // iOS devices get the most aggressive clustering
    if (isIOS) {
        radius = 200; // Significantly larger radius
        maxZoom = 5;  // Very low maxZoom to maintain clusters longer
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
    
    // Apply even more aggressive settings if requested or at low zoom levels
    const isLowZoom = zoom < 6;
    const shouldBeExtraAggressive = extraAggressive || isLowZoom;
    
    // Base settings
    let clusterRadius = radius;
    let clusterMaxZoom = maxZoom;
    let clusterMinPoints = minPoints;
    
    // Apply extra aggressive settings if needed
    if (shouldBeExtraAggressive) {
        // For mobile devices at low zoom, be extremely aggressive
        if (isMobile() && isLowZoom) {
            clusterRadius = 200;
            clusterMaxZoom = 4;
            clusterMinPoints = 2;
        } else {
            clusterRadius = 150;
            clusterMaxZoom = 6;
            clusterMinPoints = 2;
        }
    }
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
    // More aggressive zoom rounding for mobile devices
    // Round to whole numbers on mobile, 0.5 on desktop
    const roundedZoom = isMobile() ? 
        Math.floor(zoom) : 
        Math.floor(zoom * 2) / 2;
    
    // Apply device-specific optimizations
    let deviceOptions = {};
    
    if (isIOS) {
        deviceOptions = { extraAggressive: true };
    } else if (isLowEndDevice()) {
        deviceOptions = { extraAggressive: true };
    } else if (isMobile()) {
        deviceOptions = { extraAggressive: zoom < 8 }; // Only be extra aggressive at lower zooms
    }
    
    // Merge provided options with device-specific options
    const mergedOptions = { ...options, ...deviceOptions };
    
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
