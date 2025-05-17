import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useClientGpxProcessing } from '../../hooks/useClientGpxProcessing';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { normalizeRoute } from '../../../map/types/route.types';
import UploaderUI from './UploaderUI';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import { Box, Typography, Button } from '@mui/material';
import { autoSaveGpxToFirebase, deleteAutoSaveFromFirebase } from '../../../../services/firebaseGpxAutoSaveService';
import { useAutoSave } from '../../../../context/AutoSaveContext';
import { useAuth0 } from '@auth0/auth0-react';
const Uploader = ({ onUploadComplete, onDeleteRoute }) => {
    console.log('[Uploader] Component initializing');
    const { processGpx, isLoading: processingLoading, error } = useClientGpxProcessing();
    const { isMapReady } = useMapContext();
    const { addRoute, deleteRoute, setCurrentRoute, routes, updateRoute, setChangedSections } = useRouteContext();
    const autoSave = useAutoSave();
    const { user, isAuthenticated } = useAuth0();
    const [initializing, setInitializing] = useState(true);
    useEffect(() => {
        // Only set initializing to false once map is ready
        if (isMapReady) {
            setInitializing(false);
        }
    }, [isMapReady]);
    // State for debug logs and loading
    const [debugLog, setDebugLog] = useState([]);
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
        
        setDebugLog([`Processing ${file.name}...`]);
        
        try {
            const result = await processGpx(file, (message) => {
                setDebugLog(prev => [...prev, message]);
            });
            if (result) {
                // Use normalizeRoute to ensure proper type and structure
                const processedRoute = normalizeRoute(result);
                addRoute(processedRoute);
                // Only set as current route if it's the first one
                if (!routes.length) {
                    setCurrentRoute(processedRoute);
                }
                // Explicitly mark routes as changed after GPX upload
                console.log('[Uploader] Explicitly marking routes as changed after GPX upload');
                setChangedSections(prev => ({...prev, routes: true}));
                
                // Auto-save to Firebase
                try {
                    // Get the current user ID from Auth0
                    const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                    
                    console.log('[Uploader] Auto-saving GPX data to Firebase with userId:', userId);
                    setDebugLog(prev => [...prev, 'Auto-saving to Firebase...']);
                    
                    // Start auto-save in the global context
                    if (autoSave) {
                        autoSave.startAutoSave();
                    }
                    
                    // Check if there's an existing autoSaveId in the context
                    const existingAutoSaveId = autoSave?.autoSaveId || null;
                    
                    if (existingAutoSaveId) {
                        console.log('[Uploader] Using existing auto-save ID:', existingAutoSaveId);
                        setDebugLog(prev => [...prev, `Using existing auto-save ID: ${existingAutoSaveId}`]);
                    } else {
                        console.log('[Uploader] No existing auto-save ID found, will create new one');
                    }
                    
                    // Call the auto-save function with the autoSave context, existingAutoSaveId (for temporary saves),
                    // and loadedPermanentRouteId (for permanent saves)
                    const loadedPermanentRouteId = autoSave?.loadedPermanentRouteId || null;
                    if (loadedPermanentRouteId) {
                        console.log('[Uploader] A permanent route is loaded, auto-saving to permanent ID:', loadedPermanentRouteId);
                        setDebugLog(prev => [...prev, `Auto-saving to permanent route ID: ${loadedPermanentRouteId}`]);
                    }

                    const autoSaveResultId = await autoSaveGpxToFirebase(
                        processedRoute,
                        userId,
                        file.name,
                        autoSave, // Pass the full autoSave context object
                        existingAutoSaveId, // ID of existing temporary auto-save (from gpx_auto_saves)
                        loadedPermanentRouteId // ID of loaded permanent route (from user_saved_routes)
                    );
                    
                    if (autoSaveResultId) {
                        console.log('[Uploader] GPX data auto-saved to Firebase successfully', { autoSaveId: autoSaveResultId });
                        setDebugLog(prev => [...prev, 'Auto-save to Firebase complete']);
                        
                        // Update the global context with the successful auto-save
                        // autoSaveResultId will be the ID from either gpx_auto_saves or user_saved_routes
                        if (autoSave) {
                            autoSave.completeAutoSave(autoSaveResultId, processedRoute.routeId);
                        }
                    } else {
                        console.warn('[Uploader] Failed to auto-save GPX data to Firebase');
                        setDebugLog(prev => [...prev, 'Auto-save to Firebase failed']);
                    }
                } catch (autoSaveError) {
                    console.error('[Uploader] Error auto-saving to Firebase:', autoSaveError);
                    setDebugLog(prev => [...prev, `Auto-save error: ${autoSaveError.message}`]);
                    
                    // Update the global context with the error
                    if (autoSave) {
                        autoSave.setAutoSaveError(autoSaveError);
                    }
                    
                    // Continue with normal flow even if auto-save fails
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
        
        // Find the route using the routeId
        const route = routes.find(r => r.routeId === fileId);
        if (!route) {
            console.error('[Uploader][DELETE] Could not find route with id:', fileId);
            return;
        }
        
        try {
            // First clean up map layers via the onDeleteRoute callback if provided
            if (onDeleteRoute) {
                console.debug('[Uploader][DELETE] Calling onDeleteRoute with routeId:', fileId);
                onDeleteRoute(fileId);
            }
            
            // Then update route context state to remove the route
            console.debug('[Uploader][DELETE] Calling deleteRoute with routeId:', fileId);
            deleteRoute(fileId);
            
            // Explicitly mark routes as changed after deletion
            console.log('[Uploader][DELETE] Explicitly marking routes as changed after deletion');
            setChangedSections(prev => ({...prev, routes: true}));
            
            // Delete from Firebase if authenticated
            try {
                // Get the current user ID from Auth0
                const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                
                console.log('[Uploader][DELETE] Deleting route from Firebase with userId:', userId);
                setDebugLog(prev => [...prev, 'Deleting from Firebase...']);
                
                // Call the delete function with the autoSave context
                deleteAutoSaveFromFirebase(fileId, userId, autoSave)
                    .then(success => {
                        if (success) {
                            console.log('[Uploader][DELETE] Route deleted from Firebase successfully');
                            setDebugLog(prev => [...prev, 'Delete from Firebase complete']);
                        } else {
                            console.warn('[Uploader][DELETE] Failed to delete route from Firebase');
                            setDebugLog(prev => [...prev, 'Delete from Firebase failed']);
                        }
                    })
                    .catch(error => {
                        console.error('[Uploader][DELETE] Error deleting from Firebase:', error);
                        setDebugLog(prev => [...prev, `Delete error: ${error.message}`]);
                    });
            } catch (deleteError) {
                console.error('[Uploader][DELETE] Error during Firebase deletion:', deleteError);
                setDebugLog(prev => [...prev, `Delete error: ${deleteError.message}`]);
                // Continue with normal flow even if Firebase deletion fails
            }
            
            // Force a map redraw after deletion with a longer delay to ensure cleanup is complete
            if (window.map) {
                setTimeout(() => {
                    try {
                        console.debug('[Uploader][DELETE] Forcing map redraw after route deletion');
                        window.map.resize();
                        
                        // Additional map refresh to ensure rendering is updated
                        if (window.map.repaint) {
                            window.map.repaint = true;
                        }
                        
                        // Trigger another resize after a short delay for good measure
                        setTimeout(() => {
                            try {
                                window.map.resize();
                            } catch (error) {
                                console.error('[Uploader][DELETE] Error on second map resize:', error);
                            }
                        }, 300);
                    } catch (error) {
                        console.error('[Uploader][DELETE] Error resizing map:', error);
                    }
                }, 300); // Increased delay to ensure all cleanup operations complete
            }
            
            console.debug('[Uploader][DELETE] Route deletion complete for:', fileId);
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
            
            // Explicitly mark routes as changed after rename
            console.log('[Uploader] Explicitly marking routes as changed after rename');
            setChangedSections(prev => ({...prev, routes: true}));
        }
        catch (error) {
            console.error('[Uploader] Error renaming route:', error);
        }
    };
    return (_jsx(ErrorBoundary, { fallback: _jsxs(Box, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { color: "error", gutterBottom: true, children: "Something went wrong with the GPX uploader." }), _jsx(Button, { variant: "contained", onClick: () => window.location.reload(), sx: { mt: 1 }, children: "Reload Page" })] }), children: _jsx(UploaderUI, { isLoading: isLoading, error: error, debugLog: debugLog, onFileAdd: handleFileAdd, onFileDelete: handleFileDelete, onFileRename: handleFileRename }) }));
};
export default Uploader;
