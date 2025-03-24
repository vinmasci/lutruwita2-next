import { ReactNode, useState } from 'react';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel } from './ElevationProfile.styles';
import { IconButton, Box, ButtonBase } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { RouteDescriptionPanel } from '../RouteDescription/RouteDescriptionPanel';
import { EditableMapOverviewPanel } from '../../../presentation/components/MapOverview/EditableMapOverviewPanel';

interface ElevationProfilePanelProps {
  route?: ProcessedRoute;
  header?: ReactNode;
}

type TabType = 'elevation' | 'description' | 'mapOverview';

export const ElevationProfilePanel = ({
  route,
  header
}: ElevationProfilePanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('elevation');
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Default height is 300px, maximized height is 600px
  const panelHeight = isMaximized ? 600 : 300;

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <ButtonBase
      onClick={() => {
        setActiveTab(tab);
        if (isCollapsed) {
          setIsCollapsed(false);
        }
      }}
      sx={{
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        color: 'white',
        padding: '8px 16px', // Increased padding for bigger tabs
        fontSize: '16px', // Increased font size for better readability
        fontWeight: activeTab === tab ? 'bold' : 'normal', // Bold text for active tab
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        marginRight: '8px', // Increased margin for better spacing
        '&:hover': {
          backgroundColor: 'rgba(45, 45, 45, 0.9)'
        }
      }}
    >
      {label}
    </ButtonBase>
  );

  return (
    <ElevationPanel 
      className={isCollapsed ? 'collapsed' : ''} 
      sx={{ height: `${panelHeight}px`, '&.collapsed': { transform: `translateY(${panelHeight}px)` } }}
    >
      {/* Tab buttons - no background container */}
      <Box sx={{ 
        position: 'absolute', 
        top: '-32px', // Adjusted to accommodate larger buttons
        right: '100px', // Position to the left of the control buttons
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 103
        // No background or border styling
      }}>
        <TabButton tab="elevation" label="Elevation" />
        <TabButton tab="mapOverview" label="Map Overview" />
        <TabButton tab="description" label="Description" />
      </Box>
      
      {/* Control buttons (maximize/minimize) as separate circular buttons */}
      <Box sx={{ 
        position: 'absolute', 
        top: '-32px', // Adjusted to accommodate larger buttons
        right: '16px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px', // Space between buttons
        zIndex: 103
      }}>
        <IconButton
          onClick={() => setIsMaximized(!isMaximized)}
          disabled={isCollapsed}
          sx={{ 
            color: 'white',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
            borderRadius: '50%', // Make it circular
            padding: '8px', // Larger button
            width: '36px', // Fixed width
            height: '36px', // Fixed height
            opacity: isCollapsed ? 0.5 : 1,
            '&:hover': {
              backgroundColor: isCollapsed ? 'rgba(26, 26, 26, 0.9)' : 'rgba(45, 45, 45, 0.9)'
            }
          }}
        >
          {isMaximized ? <FullscreenExitIcon fontSize="medium" /> : <FullscreenIcon fontSize="medium" />}
        </IconButton>
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{ 
            color: 'white',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.8)', // Thin white stroke
            borderRadius: '50%', // Make it circular
            padding: '8px', // Larger button
            width: '36px', // Fixed width
            height: '36px', // Fixed height
            '&:hover': {
              backgroundColor: 'rgba(45, 45, 45, 0.9)'
            }
          }}
        >
          {isCollapsed ? <KeyboardArrowUpIcon fontSize="medium" /> : <KeyboardArrowDownIcon fontSize="medium" />}
        </IconButton>
      </Box>

      {header}
      {route && activeTab === 'elevation' && <ElevationProfile route={route} />}
      {route && activeTab === 'description' && <RouteDescriptionPanel route={route} />}
      {activeTab === 'mapOverview' && (
        <EditableMapOverviewPanel />
      )}
    </ElevationPanel>
  );
};
