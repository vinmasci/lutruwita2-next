import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProcessedRoute } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ElevationProfileProps {
  route: ProcessedRoute;
  isLoading?: boolean;
  error?: string;
}

export const ElevationProfile = ({ route, isLoading, error }: ElevationProfileProps) => {
  const [data, setData] = useState<{distance: number; elevation: number}[]>([]);

  useEffect(() => {
    if (!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
      setData([]);
      return;
    }

    try {
      const elevationData = route.geojson.features[0].properties?.coordinateProperties?.elevation
        ?.map((elev: number, index: number) => ({
          distance: index * ((route.surface?.distance ?? 0) / 
            (route.geojson.features[0].properties?.coordinateProperties?.elevation?.length || 1)),
          elevation: elev
        }))
        ?.filter((point: {distance: number; elevation: number}) => 
          !isNaN(point.distance) && !isNaN(point.elevation)) || [];

      setData(elevationData);
    } catch (err) {
      console.error('Error processing elevation data:', err);
      setData([]);
    }
  }, [route]);

  if (error) {
    return (
      <Alert variant="destructive" className="h-64">
        <AlertDescription>
          Error loading elevation data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Skeleton className="h-64 w-full" />
    );
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No elevation data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis
            dataKey="distance"
            label={{ value: 'Distance (m)', position: 'bottom' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)} km`}
          />
          <YAxis
            label={{ value: 'Elevation (m)', angle: -90, position: 'left' }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)} m`, 'Elevation']}
            labelFormatter={(label) => `${(label / 1000).toFixed(2)} km`}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#4f46e5"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
