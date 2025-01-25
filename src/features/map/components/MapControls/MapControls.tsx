import { useMapContext } from '../../context/MapContext';
import { Button } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

export default function MapControls() {
  const { map } = useMapContext();

  if (!map) return null;

  const handleZoomIn = () => {
    const currentZoom = map.getZoom();
    map.zoomTo(currentZoom + 1, { duration: 200 });
  };

  const handleZoomOut = () => {
    const currentZoom = map.getZoom();
    map.zoomTo(currentZoom - 1, { duration: 200 });
  };

  return (
    <div className="map-controls">
      <div className="zoom-controls">
        <Button
          variant="contained"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          sx={{ 
            minWidth: 40,
            padding: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              filter: 'brightness(0.8)'
            },
            '& .MuiTooltip-tooltip': {
              backgroundColor: '#ee5253',
              color: '#ffffff'
            }
          }}
        >
          <ZoomInIcon />
        </Button>
        <Button
          variant="contained"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          sx={{ 
            minWidth: 40,
            padding: 1,
            mt: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              filter: 'brightness(0.8)'
            },
            '& .MuiTooltip-tooltip': {
              backgroundColor: '#ee5253',
              color: '#ffffff'
            }
          }}
        >
          <ZoomOutIcon />
        </Button>
      </div>
    </div>
  );
}
