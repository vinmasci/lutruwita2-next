import { ReactNode, useState } from 'react';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { PresentationElevationProfile } from './PresentationElevationProfile';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const ElevationPanel = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: '56px', // Width of the sidebar
  right: 0,
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  zIndex: 102,
  height: 220,
  '&.collapsed': {
    transform: 'translateY(220px)'
  }
}));

interface PresentationElevationProfilePanelProps {
  route: ProcessedRoute;
  header?: ReactNode;
}

export const PresentationElevationProfilePanel = ({
  route,
  header
}: PresentationElevationProfilePanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ElevationPanel className={isCollapsed ? 'collapsed' : ''}>
      <div style={{ 
        position: 'absolute', 
        top: '-24px', 
        right: '16px',
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: 'none',
        zIndex: 102
      }}>
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          size="small"
          sx={{ 
            color: 'white',
            padding: '2px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          {isCollapsed ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </div>
      {header}
      {route && <PresentationElevationProfile route={route} />}
    </ElevationPanel>
  );
};
