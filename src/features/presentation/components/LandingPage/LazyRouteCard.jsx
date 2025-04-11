import React, { useState, useEffect, useRef } from 'react';
import { RouteCard } from './RouteCard.jsx';
import { Box, Skeleton, Grid, CircularProgress } from '@mui/material';

/**
 * LazyRouteCard component that only renders the actual RouteCard
 * when it's about to enter the viewport
 */
const LazyRouteCard = ({ route, threshold = 0.1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef(null);
  
  // Set up the Intersection Observer to detect when the card is about to enter the viewport
  useEffect(() => {
    // Skip if already loaded
    if (isLoaded) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the card becomes visible, set isVisible to true
        if (entry.isIntersecting) {
          console.log(`[LazyRouteCard] Card ${route.id || route.persistentId} is now visible`);
          setIsVisible(true);
          
          // Once we've detected visibility, we can disconnect the observer
          observer.disconnect();
        }
      },
      {
        // Root is the viewport by default
        rootMargin: '200px', // Start loading when within 200px of viewport
        threshold: threshold // Trigger when this percentage of the element is visible
      }
    );
    
    // Start observing the card element
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, [route.id, route.persistentId, threshold, isLoaded]);
  
  // When the card becomes visible, mark it as loaded after a short delay
  useEffect(() => {
    if (isVisible && !isLoaded) {
      // Small delay to stagger loading and prevent too many simultaneous requests
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, isLoaded]);
  
  // Render a skeleton placeholder until the card is loaded
  if (!isLoaded) {
    return (
      <Box 
        ref={cardRef} 
        sx={{ 
          height: '100%', 
          borderRadius: 1, 
          overflow: 'hidden',
          boxShadow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper'
        }}
      >
        {/* Map preview area with loading indicator */}
        <Box 
          sx={{ 
            position: 'relative',
            paddingTop: '56.25%', // 16:9 aspect ratio
            bgcolor: '#f5f5f5'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircularProgress size={40} />
          </Box>
        </Box>
        
        {/* Card content area */}
        <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Title */}
          <Skeleton variant="text" width="80%" height={24} animation="wave" />
          
          {/* Location */}
          <Skeleton variant="text" width="60%" height={16} animation="wave" sx={{ mb: 1 }} />
          
          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 1 }}>
            <Skeleton variant="rectangular" width={60} height={20} animation="wave" />
            <Skeleton variant="rectangular" width={60} height={20} animation="wave" />
            <Skeleton variant="rectangular" width={80} height={20} animation="wave" />
          </Box>
          
          {/* User info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Skeleton variant="circular" width={20} height={20} animation="wave" sx={{ mr: 1 }} />
            <Skeleton variant="text" width={100} height={16} animation="wave" />
          </Box>
          
          {/* Divider */}
          <Skeleton variant="rectangular" width="100%" height={1} animation="wave" sx={{ my: 1 }} />
          
          {/* Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
            <Skeleton variant="rectangular" width={60} height={22} animation="wave" sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width={80} height={16} animation="wave" />
          </Box>
        </Box>
      </Box>
    );
  }
  
  // Once loaded, render the actual RouteCard with full width
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexGrow: 1 }}>
      <RouteCard route={route} />
    </Box>
  );
};

export default LazyRouteCard;
