import React from 'react';
import { useParams } from 'react-router-dom';
import mapboxgl from '../../../lib/mapbox-gl-adaptive';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useRouteDataLoaderWithFirebase } from './EmbedMapView/hooks/useRouteDataLoaderWithFirebase';
import EmbedMapView from './EmbedMapView/EmbedMapView';

// Make sure we have the Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Firebase-first version of the EmbedMapView component
 * This component attempts to load route data from Firebase first,
 * then falls back to Cloudinary if Firebase fails
 */
export default function FirebaseEmbedMapView() {
    const { stateId } = useParams();
    
    // Use our custom hook that prioritizes Firebase
    const {
        isLoading,
        routeData,
        mapState,
        error,
        currentRoute,
        firebaseStatus
    } = useRouteDataLoaderWithFirebase(stateId);
    
    // If we're still loading, show a loading indicator
    if (isLoading) {
        return (
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" color="white">
                    Loading map data from Firebase...
                </Typography>
                {firebaseStatus.attempted && (
                    <Typography variant="body1" color="white" sx={{ mt: 2, textAlign: 'center', maxWidth: '80%' }}>
                        {firebaseStatus.success 
                            ? 'Successfully loaded data from Firebase!' 
                            : `Falling back to Cloudinary... (${firebaseStatus.error || 'No data found'})`}
                    </Typography>
                )}
            </Box>
        );
    }
    
    // If there was an error, show an error message
    if (error) {
        return (
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <Typography variant="h6" color="error">
                    Error: {error}
                </Typography>
            </Box>
        );
    }
    
    // If we have route data, render a simplified version of the EmbedMapView component
    // We'll pass our data directly to the EmbedMapView component as props
    
    // Create a simplified version of EmbedMapView that uses our data directly
    const SimpleEmbedMapView = () => {
        // Use our data directly without trying to override hooks
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Pass our data directly to EmbedMapView as props */}
                <EmbedMapView 
                    routeData={routeData}
                    mapState={mapState}
                    currentRoute={currentRoute}
                />
            </div>
        );
    };
    
    // Render the simplified EmbedMapView component
    return (
        <>
            <SimpleEmbedMapView />
            
            {/* Add a small indicator to show we're using Firebase */}
            {firebaseStatus.attempted && (
                <Box 
                    sx={{
                        position: 'fixed',
                        bottom: 10,
                        right: 10,
                        backgroundColor: firebaseStatus.success ? 'rgba(0, 128, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        zIndex: 9999
                    }}
                >
                    {firebaseStatus.success 
                        ? 'Firebase: Success' 
                        : `Firebase: Failed (${firebaseStatus.error || 'No data found'})`}
                </Box>
            )}
        </>
    );
}
