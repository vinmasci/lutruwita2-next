import { ReactNode } from 'react';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel, ElevationContent } from './ElevationProfile.styles';
import { IconButton, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ElevationProfilePanelProps {
  route?: ProcessedRoute;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  header?: ReactNode;
}

export const ElevationProfilePanel = ({
  route,
  isCollapsed = false,
  onToggleCollapse,
  header
}: ElevationProfilePanelProps) => {
  return (
    <ElevationPanel className={isCollapsed ? 'collapsed' : ''}>
      {header}
      <ElevationContent>
        {route && <ElevationProfile route={route} />}
      </ElevationContent>
    </ElevationPanel>
  );
};
