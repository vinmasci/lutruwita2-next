import Supercluster from 'supercluster';

// Detect mobile devices - consistent with isMobileDevice in PresentationPhotoLayer.js
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
const createIndex = (radius = 100, maxZoom = 14, minPoints = 2) => {
    // Use consistent radius of 100px for all devices
    radius = 100;
    
    // Keep zoom levels consistent across devices
    if (isMobile()) {
        maxZoom = 14;
        minPoints = 2;
    }
    
    if (isLowEndDevice()) {
        maxZoom = 15;
        minPoints = 2;
    }
    
    if (isIOS) {
        maxZoom = 16;
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
    const { radius = 100, maxZoom = 14, minPoints = 2, extraAggressive = false } = options;
    
    // Use consistent radius of 100px for all devices and zoom levels
    let clusterRadius = 100;
    let clusterMaxZoom = maxZoom;
    let clusterMinPoints = minPoints;
    
    // Keep other settings but ensure radius stays at 100px
    const isLowZoom = zoom < 6;
    const shouldBeExtraAggressive = extraAggressive || isLowZoom;
    
    if (shouldBeExtraAggressive) {
        clusterMaxZoom = 14;
        clusterMinPoints = 2;
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
