import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';
import Carousel from 'react-material-ui-carousel';
import { MapPreview } from '../MapPreview/MapPreview';
import { styled } from '@mui/material/styles';
import { 
  getTinyThumbnailUrl, 
  getOptimizedImageUrl, 
  generateSrcSet 
} from '../../../../utils/imageUtils';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  return window.innerWidth <= 768;
};

// Style the image to fill the entire space, cropping if necessary
const SlideImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover', // 'cover' ensures the image fills the container while maintaining aspect ratio
  objectPosition: 'center', // Center the image
  backgroundColor: 'transparent', // Transparent background to show placeholder
  transition: 'opacity 0.3s ease-in-out',
});

// Placeholder component for images that haven't loaded yet
const ImagePlaceholder = styled(Skeleton)({
  width: '100%',
  height: '100%',
  transform: 'none',
  backgroundColor: '#f0f0f0',
});

// Keep MapWrapper for potential fallback or other uses
const MapWrapper = styled(Box)({
  width: '100%',
  height: '100%',
  position: 'relative',
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

// Low quality image placeholder - a tiny version of the image that loads quickly
const LowQualityPlaceholder = styled('img')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
  filter: 'blur(10px)',
  transform: 'scale(1.1)', // Slightly larger to prevent blur edges
  opacity: 0.7,
  transition: 'opacity 0.3s ease-out',
});

// Style for the image container
const ImageContainer = styled(Box)({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative'
});

// Optimized image component with srcset for responsive loading
const OptimizedImage = React.memo(({ src, alt, onLoad, style, sizes = '100vw', isGooglePhoto = false }) => {
  // For Google Photos, skip the optimization and srcSet generation
  if (isGooglePhoto) {
    return _jsx(SlideImage, {
      src: src, // Use the original URL directly
      alt: alt,
      loading: "lazy",
      onLoad: onLoad,
      style: style
    });
  }
  
  // For non-Google photos, proceed with normal optimization
  // Generate srcset for responsive images if it's a Cloudinary URL
  const srcSet = generateSrcSet(src); // Always generate srcset
  
  // Get an optimized version of the image for the src attribute
  // Use consistent settings for all devices
  const optimizedSrc = getOptimizedImageUrl(src, { 
    width: 800, 
    quality: 80,
    format: 'auto'
  }) || src;
  
  // Use consistent sizes attribute
  const responsiveSizes = '(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw';
  
  return _jsx(SlideImage, {
    src: optimizedSrc,
    srcSet: srcSet, // Use srcSet always
    sizes: responsiveSizes, // Use consistent sizes
    alt: alt,
    loading: "lazy",
    onLoad: onLoad,
    style: style,
    onError: (e) => {
      // Fallback to original source if optimized version fails
      if (e.target.src !== src) {
        console.warn('[ImageSlider] Optimized image failed to load, falling back to original');
        e.target.src = src;
      }
    }
  });
});

// Main component
export const ImageSlider = React.memo(({
  mapPreviewProps,
  photos = [],
  maxPhotos = 10,
  staticMapUrl
}) => {
  // State to track which images have been loaded
  const [loadedImages, setLoadedImages] = useState({});
  // State to track which images have been requested (to prevent duplicate requests)
  const [requestedImages, setRequestedImages] = useState({});
  // State to track which tiny thumbnails have been loaded
  const [loadedThumbnails, setLoadedThumbnails] = useState({});
  // Refs to store the actual Image objects for preloading
  const imageRefs = useRef({});
  // State to track if we're on a mobile device
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  
  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Function to mark an image as loaded
  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  // Function to mark a thumbnail as loaded
  const handleThumbnailLoad = (index) => {
    setLoadedThumbnails(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  // State to track current slide index
  const [activeStep, setActiveStep] = useState(0);
  
  // Throttle function to prevent rapid navigation
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Prepare slides array
  const hasPhotos = photos && photos.length > 0;

  // State to hold the shuffled photos, updated when photos change
  const [shuffledPhotoList, setShuffledPhotoList] = useState([]);
  
  // Update shuffled photos when the input photos change
  useEffect(() => {
    if (!hasPhotos) {
      setShuffledPhotoList([]);
      return;
    }
    const shuffled = [...photos].sort(() => 0.5 - Math.random());
    setShuffledPhotoList(shuffled.slice(0, maxPhotos));
  }, [photos, hasPhotos, maxPhotos]);

// Process photos using the shuffled list - memoized
const photoSlides = useMemo(() => {
  return shuffledPhotoList.map(photo => {
    const url = photo.url || photo.thumbnailUrl;
    
    // If this is a Google photo (has isGooglePhoto flag), use the provided thumbnailUrl
    // Otherwise, generate a tiny thumbnail for blur-up loading
    const thumbnailUrl = photo.isGooglePhoto 
      ? photo.thumbnailUrl 
      : getTinyThumbnailUrl(url, { width: 20, quality: 20 });
    
    return {
      url,
      thumbnailUrl
    };
  });
}, [shuffledPhotoList]); // Depend on the shuffled state

  // Create items array for carousel - depends on photoSlides which depends on shuffledPhotoList
  const items = useMemo(() => {
    const result = [];

    // Add static map image as the first item if URL exists
    if (staticMapUrl) {
      result.push({
        type: 'static-map',
        content: staticMapUrl
      });
    }
    // Fallback: Add Mapbox preview if static URL doesn't exist but mapPreviewProps do
    else if (mapPreviewProps) {
      result.push({
        type: 'map',
        content: mapPreviewProps
      });
    }

    // Add photo slides with their thumbnail URLs
    result.push(...photoSlides.map(photo => ({
        type: 'photo',
        content: photo.url,
        thumbnailUrl: photo.thumbnailUrl
      }))
    );

    return result;
  }, [staticMapUrl, mapPreviewProps, photoSlides]);

  // If there are no photos AND no static map url (or map preview), return null or fallback
  if (!hasPhotos && !staticMapUrl && !mapPreviewProps) {
    return null;
  }

  // Only preload the first image and adjacent images to the current one
  const shouldLoadImage = (index) => {
    // Always load the first image
    if (index === 0) return true;

    // Load current, previous, and next images (consistent for all devices)
    return index === activeStep || 
           index === (activeStep - 1 + items.length) % items.length || // Handle wrap around for previous
           index === (activeStep + 1) % items.length || // Handle wrap around for next
           // Handle wrapping for the last and first images
           (activeStep === 0 && index === items.length - 1) ||
           (activeStep === items.length - 1 && index === 0);
  };
  
  // Function to preload an image
  const preloadImage = (url, index) => {
    // Skip if already requested or not a photo URL
    if (requestedImages[index] || !url || items[index]?.type !== 'photo') return;
    
    // Mark as requested to prevent duplicate requests
    setRequestedImages(prev => ({
      ...prev,
      [index]: true
    }));
    
    // Create a new Image object for preloading
    const img = new Image();
    img.onload = () => handleImageLoad(index);
    img.onerror = (error) => {
      console.warn(`[ImageSlider] Failed to preload image at index ${index}:`, error);
      // Still mark as loaded to prevent UI from waiting indefinitely
      handleImageLoad(index);
    };
    
    // Check if this is a Google Places photo
    const isGooglePhoto = url.includes('googleapis.com');
    
    // For Google Photos, use the original URL
    // For other photos, use the optimized URL
    img.src = isGooglePhoto 
      ? url 
      : (getOptimizedImageUrl(url, { 
          width: 800, 
          quality: 80,
          format: 'auto'
        }) || url);
    
    // Store the Image object in the ref
    imageRefs.current[index] = img;
  };
  
  // Preload images when active step changes
  useEffect(() => {
    if (items.length === 0) return;
    
    // Preload current image and adjacent ones
    const indicesToPreload = [
      activeStep,
      (activeStep + 1) % items.length,
      (activeStep - 1 + items.length) % items.length
    ];
    
    indicesToPreload.forEach(index => {
      if (items[index]?.type === 'photo') {
        preloadImage(items[index].content, index);
      }
    });
  }, [activeStep, items.length]);
  
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
  
  // Only show navigation buttons if there are multiple items to scroll through
  // Use useMemo to recalculate this value when items change
  const showNavButtons = useMemo(() => items.length > 1, [items.length]);
  
  // Log for debugging
  useEffect(() => {
    if (items.length > 1) {
      console.log('[ImageSlider] Multiple items detected, navigation buttons should be visible:', items.length);
    }
  }, [items.length]);

  return _jsx(CarouselWrapper, {
    children: _jsx(Carousel, {
      key: `carousel-${items.length}`, // Add key to force re-render when items change
      navButtonsAlwaysVisible: showNavButtons,
      navButtonsProps: {
        style: {
          display: showNavButtons ? 'flex' : 'none', // Hide buttons completely when not needed
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: 'white',
          transform: 'scale(0.7)', // Make buttons smaller
          padding: '8px'
        }
      },
      autoPlay: false,
      animation: "slide", // Use slide animation
      indicators: showNavButtons, // Only show indicators if there are multiple items
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
              _jsx(OptimizedImage, {
                src: item.content,
                alt: "Map location",
                onLoad: () => handleImageLoad(index),
                style: { opacity: loadedImages[index] ? 1 : 0 }
                // sizes is now handled within the OptimizedImage component
              })
            ) : (
              // Placeholder while loading
              _jsx(ImagePlaceholder, {
                variant: "rectangular",
                animation: "wave" // Use consistent wave animation
              })
            ),
            key: `slide-${index}`
          });
        } else if (item.type === 'map') {
          // Render Mapbox preview (fallback)
          return _jsx(MapWrapper, {
            children: shouldLoadImage(index) ? (
              _jsx(MapPreview, { ...item.content })
            ) : (
              // Placeholder while loading
              _jsx(ImagePlaceholder, {
                variant: "rectangular",
                animation: "wave"
              })
            ),
            key: `slide-${index}`
          });
        } else { // item.type === 'photo'
          // Enhanced rendering with blur-up loading
          return _jsxs(ImageContainer, {
            children: [
              // Show tiny thumbnail as placeholder while loading
              item.thumbnailUrl && !loadedImages[index] && _jsx(LowQualityPlaceholder, {
                src: item.thumbnailUrl,
                alt: "",
                onLoad: () => handleThumbnailLoad(index),
                style: { 
                  opacity: loadedThumbnails[index] && !loadedImages[index] ? 0.7 : 0 
                }
              }),
              
              // Only create actual image element when it should be loaded
              shouldLoadImage(index) ? (
                _jsx(OptimizedImage, {
                  src: item.content,
                  alt: `Route photo ${index}`,
                  onLoad: () => handleImageLoad(index),
                  style: { opacity: loadedImages[index] ? 1 : 0 },
                  // Pass isGooglePhoto flag if the URL contains "googleapis.com" (Google Places photos)
                  isGooglePhoto: item.content.includes('googleapis.com')
                  // sizes is now handled within the OptimizedImage component
                })
              ) : (
                // Placeholder when not in view and no thumbnail
                !item.thumbnailUrl && _jsx(ImagePlaceholder, {
                  variant: "rectangular",
                  animation: "wave" // Use consistent wave animation
                })
              )
            ],
            key: `slide-${index}`
          });
        }
      })
    })
  });
});
