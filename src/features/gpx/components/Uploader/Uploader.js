import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { normalizeRoute } from '../../../map/types/route.types';
import UploaderUI from './UploaderUI';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import { Box, Typography, Button } from '@mui/material';
const Uploader = ({ onUploadComplete, onDeleteRoute }) => {
    console.log('[Uploader] Component initializing');
    const { processGpx, isLoading: processingLoading, error } = useClientGpxProcessing();
    const { isMapReady } = useMapContext();
    const { addRoute, deleteRoute, setCurrentRoute, routes, updateRoute } = useRouteContext();
    const [initializing, setInitializing] = useState(true);
    useEffect(() => {
        // Only set initializing to false once map is ready
        if (isMapReady) {
            setInitializing(false);
        }
    }, [isMapReady]);
    // Show loading state only during actual processing, not initialization
    const isLoading = !initializing && processingLoading;
    // Don't show anything during initialization
    if (initializing) {
        return null;
    }
    const handleFileAdd = async (file) => {
        console.log('[Uploader] File add triggered', { fileName: file.name });
        if (!isMapReady) {
            console.error('[Uploader] Map not ready for processing');
            return;
        }
        try {
            const fileContent = await file.text();
            const result = await processGpx(file);
            if (result) {
                // Use normalizeRoute to ensure proper type and structure
                const processedRoute = normalizeRoute(result);
                addRoute(processedRoute);
                // Only set as current route if it's the first one
                if (!routes.length) {
                    setCurrentRoute(processedRoute);
                }
                onUploadComplete(processedRoute);
            }
        }
        catch (error) {
            console.error('[Uploader] Error processing file:', error);
        }
    };
    const handleFileDelete = (fileId) => {
        console.debug('[Uploader][DELETE] Starting deletion process for file:', fileId);
        console.debug('[Uploader][DELETE] Current routes:', routes.map(r => ({
            id: r.id,
            routeId: r.routeId,
            name: r.name,
            type: r._type
        })));
        // Find the route using the routeId
        const route = routes.find(r => r.routeId === fileId);
        if (!route) {
            console.error('[Uploader][DELETE] Could not find route with id:', fileId);
            return;
        }
        try {
            // First clean up map layers
            if (onDeleteRoute) {
                console.debug('[Uploader][DELETE] Calling onDeleteRoute with routeId:', fileId);
                onDeleteRoute(fileId);
            }
            // Brief delay to ensure map cleanup is complete
            setTimeout(() => {
                // Then update route context state
                console.debug('[Uploader][DELETE] Calling deleteRoute with routeId:', fileId);
                deleteRoute(fileId);
                console.debug('[Uploader][DELETE] Route deletion complete for:', fileId);
            }, 100);
        }
        catch (error) {
            console.error('[Uploader][DELETE] Error deleting route:', error);
            console.error('[Uploader][DELETE] Error details:', {
                fileId,
                error: error instanceof Error ? error.message : error
            });
        }
    };
    const handleFileRename = async (fileId, newName) => {
        try {
            // Simply update the name for this route
            updateRoute(fileId, { name: newName });
        }
        catch (error) {
            console.error('[Uploader] Error renaming route:', error);
        }
    };
    return (_jsx(ErrorBoundary, { fallback: _jsxs(Box, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { color: "error", gutterBottom: true, children: "Something went wrong with the GPX uploader." }), _jsx(Button, { variant: "contained", onClick: () => window.location.reload(), sx: { mt: 1 }, children: "Reload Page" })] }), children: _jsx(UploaderUI, { isLoading: isLoading, error: error, onFileAdd: handleFileAdd, onFileDelete: handleFileDelete, onFileRename: handleFileRename }) }));
};
export default Uploader;
