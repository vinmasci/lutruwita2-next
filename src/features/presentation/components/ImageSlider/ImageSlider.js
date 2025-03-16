import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
});

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

export const ImageSlider = ({ mapPreviewProps, photos = [], maxPhotos = 10 }) => {
  // Prepare slides array
  const hasPhotos = photos && photos.length > 0;
  
  // Get random photos instead of the first ones
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
  
  // If there are no photos, just return the map preview
  if (!hasPhotos) {
    return _jsx(MapPreview, { ...mapPreviewProps });
  }
  
  // Create items array for carousel
  const items = [
    // First item is always the map
    {
      type: 'map',
      content: mapPreviewProps
    },
    // Then add photo items
    ...photoSlides.map(url => ({
      type: 'photo',
      content: url
    }))
  ];
  
  return _jsx(CarouselWrapper, {
    children: _jsx(Carousel, {
      navButtonsAlwaysVisible: true,
      autoPlay: false,
      animation: "none", // No animation at all
      indicators: true,
      duration: 0, // No animation duration
      cycleNavigation: true,
      fullHeightHover: false,
      height: "100%",
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
        if (item.type === 'map') {
          return _jsx(MapWrapper, {
            children: _jsx(MapPreview, { ...item.content })
          }, `slide-${index}`);
        } else {
          return _jsx(ImageContainer, {
            children: _jsx(SlideImage, {
              src: item.content,
              alt: `Route photo ${index}`
            })
          }, `slide-${index}`);
        }
      })
    })
  });
};
