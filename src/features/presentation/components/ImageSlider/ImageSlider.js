import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime"; // Revert Fragment import
import React, { useState } from 'react';
import { Box } from '@mui/material';
import Carousel from 'react-material-ui-carousel';
import { MapPreview } from '../MapPreview/MapPreview';
import { styled } from '@mui/material/styles';

// Style the image to fill the entire space, cropping if necessary
const SlideImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover', // 'cover' ensures the image fills the container while maintaining aspect ratio
  objectPosition: 'center', // Center the image
  backgroundColor: '#f0f0f0', // Light gray background while loading
});

// Keep MapWrapper for potential fallback or other uses
const MapWrapper = styled(Box)({
  width: '100%',
  height: '100%',
});

// Wrapper to ensure the carousel takes up the full space
const CarouselWrapper = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  '& .MuiPaper-root': {
    height: '100%',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    overflow: 'hidden'
  }
});

// Style for the image container
const ImageContainer = styled(Box)({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative'
});

// Remove IconButton and CloseIcon imports if no longer needed
// import { IconButton } from '@mui/material';
// import CloseIcon from '@mui/icons-material/Close';

export const ImageSlider = ({
  mapPreviewProps,
  photos = [],
  maxPhotos = 10,
  staticMapUrl // Remove isEditing and onRemovePhoto props
}) => {
  // State to track which images have been loaded
  const [loadedImages, setLoadedImages] = useState({});
  
  // Function to mark an image as loaded
  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  // Only preload the first image and adjacent images to the current one
  const shouldLoadImage = (index) => {
    // Always load the first image
    if (index === 0) return true;
    
    // Load images adjacent to the current active step
    return index === activeStep || 
           index === activeStep - 1 || 
           index === activeStep + 1 || 
           // Handle wrapping for the last and first images
           (activeStep === 0 && index === items.length - 1) ||
           (activeStep === items.length - 1 && index === 0);
  };
  // Prepare slides array
  const hasPhotos = photos && photos.length > 0;

  // Revert photo processing logic
  const photoSlides = hasPhotos
    ? (() => {
        // If we have fewer photos than maxPhotos, just use all of them
        if (photos.length <= maxPhotos) {
          return photos.map(photo => photo.url || photo.thumbnailUrl);
        }
        // Otherwise, select random photos
        const shuffled = [...photos].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, maxPhotos).map(photo => photo.url || photo.thumbnailUrl);
      })()
    : [];

  // If there are no photos AND no static map url (or map preview), return null or fallback
  if (!hasPhotos && !staticMapUrl && !mapPreviewProps) {
    return null;
  }

  // Create items array for carousel
  const items = [];

  // Add static map image as the first item if URL exists
  if (staticMapUrl) {
    items.push({
      type: 'static-map',
      content: staticMapUrl
    });
  }
  // Fallback: Add Mapbox preview if static URL doesn't exist but mapPreviewProps do
  else if (mapPreviewProps) {
     items.push({
       type: 'map',
       content: mapPreviewProps
     });
  }

  // Revert items.push logic
  items.push(...photoSlides.map(url => ({
      type: 'photo',
      content: url
    }))
  );

  // State to track current slide index
  const [activeStep, setActiveStep] = useState(0);
  
  // Throttle function to prevent rapid navigation
  const [isNavigating, setIsNavigating] = useState(false);
  
  const handleNext = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    setActiveStep((prevStep) => (prevStep + 1) % items.length);
    
    // Add a cooldown period to prevent rapid clicking
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };
  
  const handleBack = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    setActiveStep((prevStep) => (prevStep - 1 + items.length) % items.length);
    
    // Add a cooldown period to prevent rapid clicking
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };
  
  return _jsx(CarouselWrapper, {
    children: _jsx(Carousel, {
      navButtonsAlwaysVisible: true,
      autoPlay: false,
      animation: "slide", // Use slide animation
      indicators: true,
      duration: 300, // Add a reasonable duration
      cycleNavigation: true,
      fullHeightHover: false,
      height: "100%",
      index: activeStep,
      next: handleNext,
      prev: handleBack,
      navButtonsWrapperProps: {
        // Disable rapid clicking
        style: { 
          pointerEvents: isNavigating ? 'none' : 'auto'
        }
      },
      // Customize the navigation buttons to be smaller and more transparent
      navButtonsProps: {
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: 'white',
          transform: 'scale(0.7)', // Make buttons smaller
          padding: '8px'
        }
      },
      // Make the indicators smaller and more subtle
      indicatorContainerProps: {
        style: {
          marginTop: '8px',
          textAlign: 'center'
        }
      },
      indicatorIconButtonProps: {
        style: {
          padding: '2px',
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      activeIndicatorIconButtonProps: {
        style: {
          color: 'white'
        }
      },
      sx: { 
        height: '100%',
        '& .MuiPaper-root': {
          height: '100%'
        }
      },
      children: items.map((item, index) => {
        if (item.type === 'static-map') {
          // Render static map image
          return _jsx(ImageContainer, {
            children: shouldLoadImage(index) ? (
              _jsx(SlideImage, {
                src: item.content,
                alt: "Map location", // Add alt text
                loading: "lazy", // Native lazy loading
                onLoad: () => handleImageLoad(index)
              })
            ) : (
              // Placeholder while loading
              _jsx(Box, {
                sx: { 
                  width: '100%', 
                  height: '100%', 
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }
              })
            )
          }, `slide-${index}`);
        } else if (item.type === 'map') {
           // Render Mapbox preview (fallback)
           return _jsx(MapWrapper, {
             children: shouldLoadImage(index) ? (
               _jsx(MapPreview, { ...item.content })
             ) : (
               // Placeholder while loading
               _jsx(Box, {
                 sx: { 
                   width: '100%', 
                   height: '100%', 
                   backgroundColor: '#f0f0f0',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }
               })
             )
           }, `slide-${index}`);
        } else { // item.type === 'photo'
          // Revert to original simple rendering without Fragment or button
          return _jsx(ImageContainer, {
            children: shouldLoadImage(index) ? (
              _jsx(SlideImage, {
                src: item.content, // This should be the photo URL
                alt: `Route photo ${index}`,
                loading: "lazy", // Native lazy loading
                onLoad: () => handleImageLoad(index)
              })
            ) : (
              // Placeholder while loading
              _jsx(Box, {
                sx: { 
                  width: '100%', 
                  height: '100%', 
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }
              })
            )
          }, `slide-${index}`);
        }
      })
    })
  });
};
