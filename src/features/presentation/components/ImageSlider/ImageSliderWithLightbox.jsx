import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Skeleton } from '@mui/material';
import Carousel from 'react-material-ui-carousel';
import { styled } from '@mui/material/styles';
import { SimpleLightbox } from '../../../photo/components/PhotoPreview/SimpleLightbox';

// Style the image to fill the entire space, cropping if necessary
const SlideImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
  backgroundColor: 'transparent',
  transition: 'opacity 0.3s ease-in-out',
  cursor: 'pointer', // Add pointer cursor to indicate clickability
});

// Placeholder component for images that haven't loaded yet
const ImagePlaceholder = styled(Skeleton)({
  width: '100%',
  height: '100%',
  transform: 'none',
  backgroundColor: '#f0f0f0',
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
  position: 'relative',
  cursor: 'pointer', // Add pointer cursor to indicate clickability
});

export const ImageSliderWithLightbox = React.memo(({
  photos = [],
  maxPhotos = 20,
  simplifiedMode = true
}) => {
  // State for tracking loaded images
  const [loadedImages, setLoadedImages] = useState({});
  
  // State for lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // State to track current slide index
  const [activeStep, setActiveStep] = useState(0);
  
  // Throttle function to prevent rapid navigation
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Prepare slides array
  const hasPhotos = photos && photos.length > 0;

  // Limit photos to maxPhotos
  const limitedPhotos = useMemo(() => {
    if (!hasPhotos) return [];
    return photos.slice(0, maxPhotos);
  }, [photos, hasPhotos, maxPhotos]);

  // Function to mark an image as loaded
  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  // Handler for when a photo is clicked
  const handlePhotoClick = useCallback((photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  }, []);

  // Handler for closing the lightbox
  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);
  
  // Navigation handlers
  const handleNext = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    setActiveStep((prevStep) => (prevStep + 1) % limitedPhotos.length);
    
    // Add a cooldown period to prevent rapid clicking
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };
  
  const handleBack = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    setActiveStep((prevStep) => (prevStep - 1 + limitedPhotos.length) % limitedPhotos.length);
    
    // Add a cooldown period to prevent rapid clicking
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };
  
  // Only show navigation buttons if there are multiple items to scroll through
  const showNavButtons = useMemo(() => limitedPhotos.length > 1, [limitedPhotos.length]);

  // If there are no photos, return null
  if (!hasPhotos) {
    return null;
  }

  return _jsxs(React.Fragment, {
    children: [
      _jsx(CarouselWrapper, {
        children: _jsx(Carousel, {
          key: `carousel-${limitedPhotos.length}`,
          navButtonsAlwaysVisible: showNavButtons,
          navButtonsProps: {
            style: {
              display: showNavButtons ? 'flex' : 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              transform: 'scale(0.7)',
              padding: '8px'
            }
          },
          autoPlay: false,
          animation: "slide",
          indicators: showNavButtons,
          duration: 300,
          cycleNavigation: true,
          fullHeightHover: false,
          height: "100%",
          index: activeStep,
          next: handleNext,
          prev: handleBack,
          navButtonsWrapperProps: {
            style: { 
              pointerEvents: isNavigating ? 'none' : 'auto'
            }
          },
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
          children: limitedPhotos.map((photo, index) => {
            return _jsx(ImageContainer, {
              onClick: () => handlePhotoClick(photo),
              children: _jsx(SlideImage, {
                src: photo.url,
                alt: `Photo ${index + 1}`,
                onLoad: () => handleImageLoad(index),
                loading: "eager",
                style: { 
                  opacity: loadedImages[index] ? 1 : 0.7,
                  cursor: 'pointer'
                },
                onError: (e) => {
                  console.warn('[ImageSliderWithLightbox] Image failed to load:', photo.url);
                }
              }),
              key: `slide-${index}`
            });
          })
        })
      }),
      lightboxOpen && selectedPhoto && _jsx(SimpleLightbox, {
        photo: selectedPhoto,
        onClose: handleCloseLightbox,
        additionalPhotos: limitedPhotos,
        disableDelete: true
      })
    ]
  });
});

export default ImageSliderWithLightbox;
