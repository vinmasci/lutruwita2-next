import React from 'react';
import { MapOverviewProvider } from '../../../../presentation/context/MapOverviewContext.jsx';
import { getMapOverviewData, setMapOverviewData, updateMapOverviewDescription, markMapOverviewChanged } from '../../../../presentation/store/mapOverviewStore';

/**
 * MapOverviewContextAdapter component
 * 
 * This component acts as a bridge for MapOverviewContext.
 * It provides a MapOverviewProvider to its children, ensuring that components
 * that use useMapOverview will work within the EmbedMapView.
 */
const MapOverviewContextAdapter = ({ children }) => {
  return (
    <MapOverviewProvider>
      {children}
    </MapOverviewProvider>
  );
};

export default MapOverviewContextAdapter;
