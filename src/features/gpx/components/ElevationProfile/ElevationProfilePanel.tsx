import { ReactNode, useState } from 'react';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel } from './ElevationProfile.styles';
import { IconButton, Box, ButtonBase } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { RouteDescriptionPanel } from '../RouteDescription/RouteDescriptionPanel';

interface ElevationProfilePanelProps {
  route?: ProcessedRoute;
  header?: ReactNode;
}

type TabType = 'elevation' | 'description';

export const ElevationProfilePanel = ({
  route,
  header
}: ElevationProfilePanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('elevation');

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <ButtonBase
      onClick={() => setActiveTab(tab)}
      sx={{
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        marginRight: '4px',
        '&:hover': {
          backgroundColor: 'rgba(45, 45, 45, 0.9)'
        }
      }}
    >
      {label}
    </ButtonBase>
  );

  return (
    <ElevationPanel className={isCollapsed ? 'collapsed' : ''}>
      <Box sx={{ 
        position: 'absolute', 
        top: '-24px', 
        left: '16px',
        display: 'flex',
        alignItems: 'flex-end'
      }}>
        <TabButton tab="elevation" label="Elevation" />
        <TabButton tab="description" label="Description" />
      </Box>

      <Box sx={{ 
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
      </Box>

      {header}
      {route && activeTab === 'elevation' && <ElevationProfile route={route} />}
      {route && activeTab === 'description' && <RouteDescriptionPanel route={route} />}
    </ElevationPanel>
  );
};
