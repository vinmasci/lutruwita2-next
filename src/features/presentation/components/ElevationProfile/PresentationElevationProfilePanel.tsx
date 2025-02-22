import { ReactNode, useState, useEffect } from 'react';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { PresentationElevationProfile } from './PresentationElevationProfile';
import { ButtonBase, IconButton, Box } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { PresentationRouteDescriptionPanel } from '../RouteDescription';
import { PresentationWeatherProfile } from '../WeatherProfile/PresentationWeatherProfile';
import { ElevationPanel, TabContainer, CollapseButton } from './PresentationElevationProfile.styles';

type TabType = 'elevation' | 'description' | 'weather';

interface PresentationElevationProfilePanelProps {
  route: ProcessedRoute;
  header?: ReactNode;
}

export const PresentationElevationProfilePanel = ({
  route,
  header
}: PresentationElevationProfilePanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('elevation');

  useEffect(() => {
    console.log('PresentationElevationProfilePanel MOUNTED!');
  }, []);

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
          backgroundColor: 'rgba(35, 35, 35, 0.9)'
        }
      }}
    >
      {label}
    </ButtonBase>
  );

  return (
    <ElevationPanel className={isCollapsed ? 'collapsed' : ''}>
      <TabContainer>
        <TabButton tab="elevation" label="Elevation" />
        <TabButton tab="description" label="Description" />
        <TabButton tab="weather" label="Weather" />
        <CollapseButton>
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
        </CollapseButton>
      </TabContainer>

      {header}
      <Box sx={{ 
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        '& > *': {
          flex: 1,
          minHeight: 0
        }
      }}>
        {route && activeTab === 'elevation' && <PresentationElevationProfile route={route} isLoading={false} />}
        {route && activeTab === 'description' && <PresentationRouteDescriptionPanel route={route} />}
        {route && activeTab === 'weather' && <PresentationWeatherProfile route={route} />}
      </Box>
    </ElevationPanel>
  );
};
