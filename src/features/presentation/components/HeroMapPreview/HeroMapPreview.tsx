import React from 'react';
import { MapPreview } from '../MapPreview/MapPreview';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

interface HeroMapPreviewProps {
  center: [number, number];
  zoom: number;
  routes: any[];
}

const MapPreviewWrapper = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker overlay
  }
});

export const HeroMapPreview: React.FC<HeroMapPreviewProps> = ({ center, zoom, routes }) => {
  return (
    <MapPreviewWrapper>
      <MapPreview
        center={center}
        zoom={zoom + 2} // Zoom in closer for hero view
        routes={routes}
        className="h-full w-full"
      />
    </MapPreviewWrapper>
  );
};
