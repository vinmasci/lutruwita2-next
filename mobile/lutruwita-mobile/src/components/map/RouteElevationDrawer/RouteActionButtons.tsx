import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Bookmark, Download, Check } from 'lucide-react-native';
import { useSavedRoutes } from '../../../context/FirebaseSavedRoutesContext';
import { useRouteSpecificOfflineMaps } from '../../../context/RouteSpecificOfflineMapsContext';
import { RouteMap } from '../../../services/routeService';

interface RouteActionButtonsProps {
  route: RouteMap;
}

const RouteActionButtons: React.FC<RouteActionButtonsProps> = ({ route }) => {
  const { saveRoute, removeRoute, isRouteSaved } = useSavedRoutes();
  const {
    downloadRoute: downloadRouteOffline,
    deleteRoute: deleteRouteOffline,
    isRouteDownloaded,
    isDownloading: isRouteDownloading,
    currentDownload: currentRouteDownload,
    estimateRouteStorage
  } = useRouteSpecificOfflineMaps();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [routeAvailable, setRouteAvailable] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ tileCount: number; estimatedSize: number } | null>(null);

  // Check if route is available offline
  useEffect(() => {
    if (route) {
      setSaved(isRouteSaved(route.persistentId));
      
      // Check if the route is available offline
      const routeAvailable = isRouteDownloaded(route.persistentId);
      setRouteAvailable(routeAvailable);
      
      // Estimate storage requirements
      if (!routeAvailable) {
        const estimate = estimateRouteStorage(route);
        setStorageEstimate(estimate);
      }
    }
  }, [route, isRouteSaved, isRouteDownloaded, estimateRouteStorage]);

  const handleSaveRoute = async () => {
    if (!route || !route.persistentId) return;
    
    setIsSaving(true);
    try {
      console.log(`[RouteActionButtons] ${saved ? 'Unsaving' : 'Saving'} route ${route.persistentId}`);
      
      if (saved) {
        // Remove from saved routes
        const success = await removeRoute(route.persistentId);
        if (success) {
          console.log(`[RouteActionButtons] Successfully unsaved route ${route.persistentId}`);
          setSaved(false);
        } else {
          console.error(`[RouteActionButtons] Failed to unsave route ${route.persistentId}`);
        }
      } else {
        // Add to saved routes
        const success = await saveRoute(route);
        if (success) {
          console.log(`[RouteActionButtons] Successfully saved route ${route.persistentId}`);
          setSaved(true);
        } else {
          console.error(`[RouteActionButtons] Failed to save route ${route.persistentId}`);
        }
      }
    } catch (error) {
      console.error(`[RouteActionButtons] Error ${saved ? 'removing' : 'saving'} route:`, error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRouteAction = async () => {
    if (!route || !route.persistentId) return;
    
    try {
      if (routeAvailable) {
        // Delete the route
        setIsDownloading(true);
        console.log(`[RouteActionButtons] Deleting route ${route.persistentId}`);
        const success = await deleteRouteOffline(route.persistentId);
        if (success) {
          console.log(`[RouteActionButtons] Successfully deleted route ${route.persistentId}`);
          setRouteAvailable(false);
        } else {
          console.error(`[RouteActionButtons] Failed to delete route ${route.persistentId}`);
        }
        setIsDownloading(false);
      } else {
        // Download the route
        console.log(`[RouteActionButtons] Downloading route ${route.persistentId}`);
        await downloadRouteOffline(route);
      }
    } catch (error) {
      console.error(`[RouteActionButtons] Error ${routeAvailable ? 'deleting' : 'downloading'} route:`, error);
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.saveButton, saved && styles.savedButton]}
        onPress={handleSaveRoute}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Bookmark 
              size={16} 
              color="#ffffff" 
              style={styles.buttonIcon} 
              fill={saved ? "#ffffff" : "none"} 
            />
            <Text style={styles.buttonText}>{saved ? 'Saved' : 'Save'}</Text>
          </>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.button, 
          styles.downloadButton, 
          routeAvailable && styles.downloadedButton,
          (isRouteDownloading && currentRouteDownload?.routeId === route.persistentId) && styles.downloadingButton
        ]}
        onPress={handleRouteAction}
        disabled={isDownloading || isRouteDownloading}
      >
        <>
          {routeAvailable ? (
            <Check size={16} color="#ffffff" style={styles.buttonIcon} />
          ) : (isRouteDownloading && currentRouteDownload?.routeId === route.persistentId) ? (
            <Download size={16} color="#ffffff" style={styles.buttonIcon} />
          ) : (
            <Download size={16} color="#ffffff" style={styles.buttonIcon} />
          )}
          <Text style={styles.buttonText}>
            {routeAvailable ? 'Available Offline' : 
             (isRouteDownloading && currentRouteDownload?.routeId === route.persistentId) ? 
             `Downloading (${Math.round(currentRouteDownload.progress * 100)}%)` : 
             storageEstimate ? `Download Route (~${Math.round(storageEstimate.estimatedSize / 1024 / 1024)}MB)` : 'Download Route'}
          </Text>
        </>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    maxWidth: '48%',
  },
  saveButton: {
    backgroundColor: '#4CAF50', // Green
    marginRight: 8,
  },
  savedButton: {
    backgroundColor: '#2E7D32', // Darker green
  },
  downloadButton: {
    backgroundColor: '#2196F3', // Blue
  },
  downloadedButton: {
    backgroundColor: '#0D47A1', // Darker blue
  },
  downloadingButton: {
    backgroundColor: '#FF9800', // Orange
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 2,
  },
});

export default RouteActionButtons;
