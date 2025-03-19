import { queueMapOperation } from './mapOperationsQueue';

/**
 * Queue a route-specific map operation
 * @param {Object} map - The Mapbox map instance
 * @param {Object} route - The route object
 * @param {Function} operation - The operation function to execute
 * @param {string} name - Name for the operation (for logging)
 * @returns {Promise} - Promise that resolves when the operation is complete
 */
export const queueRouteOperation = (map, route, operation, name = 'routeOperation') => {
    return queueMapOperation((mapInstance) => {
        try {
            operation(mapInstance, route);
        } catch (error) {
            console.error(`[MapOperationsQueue] Error executing route operation ${name}:`, error);
        }
    }, name);
};

/**
 * Safely remove a layer from the map if it exists
 * @param {Object} map - The Mapbox map instance
 * @param {string} layerId - The ID of the layer to remove
 */
export const safeRemoveLayer = (map, layerId) => {
    if (map && map.getLayer && map.getLayer(layerId)) {
        map.removeLayer(layerId);
    }
};

/**
 * Safely remove a source from the map if it exists
 * @param {Object} map - The Mapbox map instance
 * @param {string} sourceId - The ID of the source to remove
 */
export const safeRemoveSource = (map, sourceId) => {
    if (map && map.getSource && map.getSource(sourceId)) {
        map.removeSource(sourceId);
    }
};

/**
 * Clean up all layers and sources for a route
 * @param {Object} map - The Mapbox map instance
 * @param {string} routeId - The ID of the route
 */
export const cleanupRouteLayers = (map, routeId) => {
    if (!map) return;
    
    try {
        // Common layer IDs for a route
        const layersToRemove = [
            `${routeId}-main-line`,
            `${routeId}-main-border`,
            `unpaved-sections-layer-${routeId}`,
            `${routeId}-hover-line`,
            `${routeId}-selected-line`,
            `${routeId}-highlight`
        ];
        
        // Remove all layers
        layersToRemove.forEach(layerId => safeRemoveLayer(map, layerId));
        
        // Common source IDs for a route
        const sourcesToRemove = [
            `${routeId}-main`,
            `unpaved-sections-${routeId}`,
            `${routeId}-hover`,
            `${routeId}-selected`
        ];
        
        // Remove all sources
        sourcesToRemove.forEach(sourceId => safeRemoveSource(map, sourceId));
    } catch (error) {
        console.error('[MapOperationsUtils] Error cleaning up route layers:', error);
    }
};
