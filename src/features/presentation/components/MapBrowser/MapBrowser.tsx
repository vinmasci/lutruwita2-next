import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicRouteMetadata } from '../../types/route.types';
import { publicRouteService } from '../../services/publicRoute.service';
import { MapPreview } from '../MapPreview/MapPreview';
import mapboxgl from 'mapbox-gl';

// Set Mapbox token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type RouteType = 'tourism' | 'event' | 'bikepacking' | 'single';

interface MapFilters {
  type?: RouteType;
  sortBy: 'recent' | 'views' | 'distance' | 'elevation';
  sortOrder: 'asc' | 'desc';
}

// Helper function to calculate total distance from route segments
const calculateTotalDistance = (route: PublicRouteMetadata): number => {
  return route.routes.reduce((total, segment) => {
    const feature = segment.geojson?.features?.[0];
    if (feature?.properties?.distance) {
      return total + feature.properties.distance;
    }
    return total;
  }, 0);
};

// Helper function to calculate total elevation from route segments
const calculateTotalElevation = (route: PublicRouteMetadata): number => {
  return route.routes.reduce((total, segment) => {
    const feature = segment.geojson?.features?.[0];
    if (feature?.properties?.elevationGain) {
      return total + feature.properties.elevationGain;
    }
    return total;
  }, 0);
};

export const MapBrowser: React.FC = () => {
  const [maps, setMaps] = useState<PublicRouteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>({
    sortBy: 'recent',
    sortOrder: 'desc'
  });

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        setLoading(true);
        setError(null);
        const routes = await publicRouteService.listRoutes(filters.type);
        
        // Sort routes based on filters
        const sortedRoutes = [...routes].sort((a, b) => {
          const multiplier = filters.sortOrder === 'desc' ? -1 : 1;
          
          switch (filters.sortBy) {
            case 'views':
              return multiplier * (b.viewCount - a.viewCount);
            case 'recent':
              return multiplier * (
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            case 'distance':
              return multiplier * (
                calculateTotalDistance(b) - calculateTotalDistance(a)
              );
            case 'elevation':
              return multiplier * (
                calculateTotalElevation(b) - calculateTotalElevation(a)
              );
            default:
              return 0;
          }
        });
        
        setMaps(sortedRoutes);
      } catch (error) {
        setError('Failed to load maps. Please try again later.');
        console.error('Error fetching maps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<MapFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Filters */}
      <div className="mb-8 bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.type || ''}
            onChange={(e) => handleFilterChange({ 
              type: e.target.value ? e.target.value as RouteType : undefined 
            })}
          >
            <option value="">All Types</option>
            <option value="tourism">Tourism</option>
            <option value="event">Event</option>
            <option value="bikepacking">Bikepacking</option>
            <option value="single">Single</option>
          </select>

          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as MapFilters['sortBy'] })}
          >
            <option value="recent">Recently Added</option>
            <option value="views">Most Viewed</option>
            <option value="distance">Distance</option>
            <option value="elevation">Elevation Gain</option>
          </select>

          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Map Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {maps.map((map) => (
          <Link
            key={map.id}
            to={`/maps/${map.id}`}
            className="block bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              <MapPreview
                center={map.mapState.center}
                zoom={map.mapState.zoom}
                geojson={map.routes[0]?.geojson}
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">{map.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {map.type.charAt(0).toUpperCase() + map.type.slice(1)}
              </p>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>{map.viewCount} views</span>
                <span className="mx-2">•</span>
                <span>
                  {new Date(map.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {error && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-red-600">{error}</h3>
          <button 
            onClick={() => handleFilterChange(filters)} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {!error && maps.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No maps found</h3>
          <p className="mt-2 text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};
