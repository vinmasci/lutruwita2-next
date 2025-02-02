import { ReactNode, useState } from 'react';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel } from './ElevationProfile.styles';
import { IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface ElevationProfilePanelProps {
  route?: ProcessedRoute;
  header?: ReactNode;
}

export const ElevationProfilePanel = ({
  route,
  header
}: ElevationProfilePanelProps) => {
  console.log('[ElevationProfilePanel] Rendering:', {
    hasRoute: !!route,
    routeId: route?.id
  });

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
        borderBottom: 'none'
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
      {route && <ElevationProfile route={route} />}
    </ElevationPanel>
  );
};
