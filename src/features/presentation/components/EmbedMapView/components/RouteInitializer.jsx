import { useEffect } from 'react';
import useEmbedRouteProcessing from '../hooks/useEmbedRouteProcessing';

/**
 * A component that initializes routes using the embed-specific approach
 * This component should be used inside the EmbedRouteProvider
 */
const RouteInitializer = ({ routes, onInitialized }) => {
    // Use the embed-specific route processing hook
    const { initialized } = useEmbedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            console.log('[RouteInitializer] Routes initialized with embed-specific approach');
            onInitialized?.();
        }
    });

    // This component doesn't render anything
    return null;
};

export default RouteInitializer;
