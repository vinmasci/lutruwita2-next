import { ReactNode } from 'react';
import { ProcessedRoute } from '../../types/gpx.types';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel } from './ElevationProfile.styles';

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

  return (
    <ElevationPanel>
      {header}
      {route && <ElevationProfile route={route} />}
    </ElevationPanel>
  );
};
