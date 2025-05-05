import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { getFirebaseStatus, FirebaseStatus } from '../../services/firebaseOptimizedRouteService';

interface FirebaseStatusIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showDetails?: boolean;
}

/**
 * A component that displays the current Firebase data loading status
 * This helps users see when data is being loaded from Firebase and whether it was successful
 */
const FirebaseStatusIndicator: React.FC<FirebaseStatusIndicatorProps> = ({ 
  position = 'bottom-right', 
  showDetails = true 
}) => {
  const [status, setStatus] = useState<FirebaseStatus>(getFirebaseStatus());
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Update status every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = getFirebaseStatus();
      setStatus(currentStatus);
      
      // Show the indicator when loading or when there's a recent status change
      if (currentStatus.isLoading || currentStatus.lastLoadTime) {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
        
        // Auto-hide after 5 seconds if not loading
        if (!currentStatus.isLoading) {
          const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true
            }).start(() => {
              setVisible(false);
            });
          }, 5000);
          
          return () => clearTimeout(timer);
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [fadeAnim]);

  // Get position style based on position prop
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: 20, left: 20 };
      case 'top-right':
        return { top: 20, right: 20 };
      case 'bottom-left':
        return { bottom: 20, left: 20 };
      case 'bottom-right':
      default:
        return { bottom: 20, right: 20 };
    }
  };

  // Get background color based on status
  const getBackgroundColor = () => {
    if (status.isLoading) return '#4285F4'; // Blue
    if (status.success) return '#34A853';   // Green
    if (status.error) return '#EA4335';     // Red
    return '#FBBC05';                       // Yellow
  };

  // Get status icon
  const getStatusIcon = () => {
    if (status.isLoading) return '🔄';
    if (status.success) return '✅';
    if (status.error) return '❌';
    return 'ℹ️';
  };

  // Get status text
  const getStatusText = () => {
    if (status.isLoading) return 'Loading from Firebase...';
    if (status.success) return 'Firebase Load Success';
    if (status.error) return 'Firebase Error';
    return 'Firebase Status';
  };

  // Don't render if not visible
  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        getPositionStyle(),
        { 
          backgroundColor: getBackgroundColor(),
          opacity: fadeAnim,
          width: expanded ? 300 : 200
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.icon}>{getStatusIcon()}</Text>
            <Text style={styles.title}>{getStatusText()}</Text>
          </View>
          <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
        </View>
        
        {expanded && showDetails && (
          <View style={styles.details}>
            {status.lastLoadedRoute && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Route ID:</Text>
                <Text style={styles.detailValue}>
                  {status.lastLoadedRoute.substring(0, 8)}...
                </Text>
              </View>
            )}
            
            {status.lastLoadTime !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Load Time:</Text>
                <Text style={styles.detailValue}>{status.lastLoadTime}ms</Text>
              </View>
            )}
            
            {status.error && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Error:</Text>
                <Text style={styles.detailValue}>{status.error}</Text>
              </View>
            )}
            
            <Text style={styles.hint}>
              Tap to {expanded ? 'collapse' : 'expand'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 300
  },
  touchable: {
    width: '100%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    marginRight: 8,
    fontSize: 16
  },
  title: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 14
  },
  expandIcon: {
    marginLeft: 8,
    fontSize: 12,
    color: 'white'
  },
  details: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    paddingTop: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  detailLabel: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 12
  },
  detailValue: {
    color: 'white',
    fontSize: 12
  },
  hint: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default FirebaseStatusIndicator;
