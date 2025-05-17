import React, { useState, useEffect } from 'react';
import { getFirebaseStatus } from '../services/firebaseOptimizedRouteService';

/**
 * A component that displays the current Firebase data loading status
 * This helps users see when data is being loaded from Firebase and whether it was successful
 */
const FirebaseStatusIndicator = ({ position = 'bottom-right', showDetails = true }) => {
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Helper function to check if we're in presentation mode
  const isPresentationMode = () => {
    if (typeof window === 'undefined') return false;
    
    // Check if the current URL path indicates presentation mode
    const path = window.location.pathname;
    return path.startsWith('/preview') || 
           path.startsWith('/embed') || 
           path === '/'; // Landing page is also presentation mode
  };

  // Update status every 500ms, but only if in presentation mode
  useEffect(() => {
    // Skip in creation mode
    if (!isPresentationMode()) {
      console.log('[FirebaseStatusIndicator] In creation mode, skipping Firebase status updates');
      return;
    }

    // Initialize status
    const initialStatus = getFirebaseStatus();
    setStatus(initialStatus);
    
    const interval = setInterval(() => {
      const currentStatus = getFirebaseStatus();
      setStatus(currentStatus);
      
      // Show the indicator when loading or when there's a recent status change
      if (currentStatus.isLoading || currentStatus.lastLoadTime) {
        setVisible(true);
        
        // Auto-hide after 5 seconds if not loading
        if (!currentStatus.isLoading) {
          setTimeout(() => {
            setVisible(false);
          }, 5000);
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Position styles
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'bottom-right':
      default:
        return { bottom: '20px', right: '20px' };
    }
  };

  // Don't render if not visible or if status is null
  if (!visible || !status) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...getPositionStyle(),
        backgroundColor: status.isLoading ? '#4285F4' : 
                         status.success ? '#34A853' : 
                         status.error ? '#EA4335' : '#FBBC05',
        color: status.error || status.success ? 'white' : 'black',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        maxWidth: expanded ? '300px' : '200px'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {status.isLoading ? (
            <span style={{ marginRight: '8px' }}>🔄</span>
          ) : status.success ? (
            <span style={{ marginRight: '8px' }}>✅</span>
          ) : status.error ? (
            <span style={{ marginRight: '8px' }}>❌</span>
          ) : (
            <span style={{ marginRight: '8px' }}>ℹ️</span>
          )}
          <span style={{ fontWeight: 'bold' }}>
            {status.isLoading ? 'Loading from Firebase...' : 
             status.success ? 'Firebase Load Success' : 
             status.error ? 'Firebase Error' : 'Firebase Status'}
          </span>
        </div>
        <span style={{ marginLeft: '8px', fontSize: '12px' }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      
      {expanded && showDetails && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '12px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          paddingTop: '8px'
        }}>
          {status.lastLoadedRoute && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Route ID:</strong> {status.lastLoadedRoute.substring(0, 8)}...
            </div>
          )}
          {status.lastLoadTime && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Load Time:</strong> {status.lastLoadTime}ms
            </div>
          )}
          {status.error && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Error:</strong> {status.error}
            </div>
          )}
          <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
            Click to {expanded ? 'collapse' : 'expand'}
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseStatusIndicator;
