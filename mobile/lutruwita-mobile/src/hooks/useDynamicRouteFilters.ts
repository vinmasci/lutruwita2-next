import { useState, useEffect } from 'react';
import { RouteMap, RouteData } from '../services/routeService';

// Extended interface for RouteData with surface information
interface RouteDataWithSurface extends RouteData {
  surface?: {
    surfaceTypes?: Array<{
      type: string;
      distance: number;
    }>;
  };
}

// Helper function to calculate unpaved percentage
const calculateUnpavedPercentage = (route: RouteMap): number => {
  // Check if we have the metadata field first
  if (route.metadata && route.metadata.unpavedPercentage !== undefined) {
    return route.metadata.unpavedPercentage;
  }
  
  // Fallback to calculation from routes if metadata is not available
  try {
    const totalDistance = route.routes
      .filter(r => r.statistics?.totalDistance)
      .reduce((total, r) => total + r.statistics.totalDistance, 0);
    
    if (!totalDistance) return 0;
    
    // If we have surface types, calculate from there
    let unpavedPercentage = 0;
    
    // Check if any route has surface types
    const hasSurfaceTypes = route.routes.some(r => {
      const routeWithSurface = r as RouteDataWithSurface;
      return routeWithSurface.surface && 
             routeWithSurface.surface.surfaceTypes && 
             routeWithSurface.surface.surfaceTypes.length > 0;
    });
    
    if (hasSurfaceTypes) {
      let totalUnpavedDistance = 0;
      let totalRouteDistance = 0;
      
      route.routes.forEach(r => {
        const routeWithSurface = r as RouteDataWithSurface;
        if (routeWithSurface.surface && routeWithSurface.surface.surfaceTypes) {
          routeWithSurface.surface.surfaceTypes.forEach(surface => {
            if (surface.type && surface.type.toLowerCase().includes('unpaved')) {
              totalUnpavedDistance += surface.distance || 0;
            }
            totalRouteDistance += surface.distance || 0;
          });
        }
      });
      
      if (totalRouteDistance > 0) {
        unpavedPercentage = Math.round((totalUnpavedDistance / totalRouteDistance) * 100);
      }
    } else {
      // If no surface data, use a default percentage (10%)
      unpavedPercentage = 10;
    }
    
    return unpavedPercentage;
  } catch (error) {
    console.error('Error calculating unpaved percentage:', error);
    return 0;
  }
};

// Interface for available filters
export interface AvailableFilters {
  location: boolean;
  distance: boolean;
  surface: boolean;
  routeType: boolean;
}

// Interface for the hook return value
export interface DynamicRouteFiltersResult {
  // Map type
  selectedMapType: string;
  setSelectedMapType: (type: string) => void;
  
  // Filter states
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  surfaceType: string;
  setSurfaceType: (type: string) => void;
  distanceFilter: string;
  setDistanceFilter: (filter: string) => void;
  routeTypeFilter: string;
  setRouteTypeFilter: (filter: string) => void;
  
  // Available options
  availableFilters: AvailableFilters;
  availableStates: string[];
  availableRegions: string[];
  availableMapTypes: string[];
  
  // Results
  filteredRoutes: RouteMap[];
  displayedRoutes: RouteMap[];
  hasMore: boolean;
  
  // Actions
  loadMoreRoutes: () => void;
  getActiveFilterCount: () => number;
}

export const useDynamicRouteFilters = (allRoutes: RouteMap[]): DynamicRouteFiltersResult => {
  // Map type state
  const [selectedMapType, setSelectedMapType] = useState<string>('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [surfaceType, setSurfaceType] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('any');
  const [routeTypeFilter, setRouteTypeFilter] = useState<string>('all');
  
  // Results
  const [filteredRoutes, setFilteredRoutes] = useState<RouteMap[]>([]);
  const [displayedRoutes, setDisplayedRoutes] = useState<RouteMap[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [hasMore, setHasMore] = useState<boolean>(false);
  
  // Get available filters based on map type
  const getAvailableFilters = (): AvailableFilters => {
    switch(selectedMapType.toLowerCase()) {
      case 'tourism':
        return {
          location: true,
          distance: false,
          surface: false,
          routeType: false
        };
      default: // bikepacking, event, single
        return {
          location: true,
          distance: true,
          surface: true,
          routeType: true
        };
    }
  };
  
  const availableFilters = getAvailableFilters();
  
  // Dynamically generate available states from route metadata
  const availableStates = (() => {
    if (!allRoutes.length) {
      return [];
    }
    
    // Extract unique states from route metadata
    const states = allRoutes
      .filter(route => route.metadata?.state)
      .map(route => route.metadata?.state)
      .filter((state): state is string => state !== undefined);
    
    // Return unique states
    return Array.from(new Set(states)).sort();
  })();
  
  // Dynamically generate available regions based on selected state
  const availableRegions = (() => {
    if (!selectedState || !allRoutes.length) {
      return [];
    }
    
    // Extract unique regions (LGAs) from route metadata for the selected state
    // LGAs can be comma-separated in the metadata
    const regions: string[] = [];
    
    allRoutes
      .filter(route => route.metadata?.state === selectedState && route.metadata?.lga)
      .forEach(route => {
        if (route.metadata?.lga) {
          // Split LGAs by comma and trim whitespace
          const lgas = route.metadata.lga.split(',').map(lga => lga.trim());
          regions.push(...lgas);
        }
      });
    
    // Return unique regions
    return Array.from(new Set(regions)).sort();
  })();
  
  // Dynamically generate available map types from route metadata
  const availableMapTypes = (() => {
    if (!allRoutes.length) {
      return [];
    }
    
    // Extract unique map types from routes
    const types = allRoutes
      .filter(route => route.type)
      .map(route => route.type.charAt(0).toUpperCase() + route.type.slice(1)); // Capitalize first letter
    
    // Return unique map types
    return Array.from(new Set(types)).sort();
  })();
  
  // Load more routes
  const loadMoreRoutes = () => {
    const nextVisibleCount = visibleCount + 6;
    setVisibleCount(nextVisibleCount);
    setDisplayedRoutes(filteredRoutes.slice(0, nextVisibleCount));
    setHasMore(nextVisibleCount < filteredRoutes.length);
  };
  
  // Get the number of active filters
  const getActiveFilterCount = (): number => {
    let count = 0;
    
    if (selectedState) count++;
    if (selectedRegion) count++;
    if (surfaceType !== 'all' && availableFilters.surface) count++;
    if (distanceFilter !== 'any' && availableFilters.distance) count++;
    if (routeTypeFilter !== 'all' && availableFilters.routeType) count++;
    
    return count;
  };
  
  // Apply filters to routes
  useEffect(() => {
    // If there are no routes, explicitly set empty arrays
    if (!allRoutes.length) {
      setFilteredRoutes([]);
      setDisplayedRoutes([]);
      setHasMore(false);
      return;
    }
    
    let result = [...allRoutes];
    
    // Filter by map type first (skip filtering if "all" is selected)
    if (selectedMapType && selectedMapType.toLowerCase() !== 'all') {
      result = result.filter(route => 
        route.type?.toLowerCase() === selectedMapType.toLowerCase()
      );
    }
    
    // Apply search term filter
    if (searchTerm) {
      result = result.filter(route => 
        route.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (route.metadata?.state && route.metadata.state.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply state filter based on metadata
    if (selectedState && availableFilters.location) {
      result = result.filter(route => 
        route.metadata?.state === selectedState
      );
    }
    
    // Apply region filter based on metadata
    if (selectedRegion && availableFilters.location) {
      result = result.filter(route => {
        if (!route.metadata?.lga) return false;
        
        // Split LGAs by comma and trim whitespace
        const lgas = route.metadata.lga.split(',').map(lga => lga.trim());
        
        // Check if the selected region is in the list of LGAs
        return lgas.includes(selectedRegion);
      });
    }
    
    // Apply surface type filter - use calculation directly
    if (surfaceType !== 'all' && availableFilters.surface) {
      result = result.filter(route => {
        if (!route.routes || route.routes.length === 0) return false;
        
        // Always use the calculation
        const unpavedPercentage = calculateUnpavedPercentage(route);
        
        switch (surfaceType) {
          case 'road': return unpavedPercentage < 10;
          case 'mixed': return unpavedPercentage >= 10 && unpavedPercentage < 60;
          case 'unpaved': return unpavedPercentage >= 60;
          default: return true;
        }
      });
    }
    
    // Apply distance filter - use metadata if available, otherwise calculate
    if (distanceFilter !== 'any' && availableFilters.distance) {
      result = result.filter(route => {
        // First check if we have the distance in metadata
        if (route.metadata?.totalDistance !== undefined) {
          const totalDistance = route.metadata.totalDistance;
          
          switch (distanceFilter) {
            case 'under50': return totalDistance < 50;
            case '50to100': return totalDistance >= 50 && totalDistance < 100;
            case '100to200': return totalDistance >= 100 && totalDistance < 200;
            case '200to500': return totalDistance >= 200 && totalDistance < 500;
            case 'over500': return totalDistance >= 500;
            default: return true;
          }
        }
        
        // Fall back to calculation if metadata is not available
        if (!route.routes || route.routes.length === 0) return false;
        
        // Calculate total distance in km (without formatting)
        const totalDistanceKm = Math.round(route.routes
          .filter(r => r.statistics?.totalDistance)
          .reduce((total, r) => total + r.statistics.totalDistance, 0) / 1000);
        
        switch (distanceFilter) {
          case 'under50': return totalDistanceKm < 50;
          case '50to100': return totalDistanceKm >= 50 && totalDistanceKm < 100;
          case '100to200': return totalDistanceKm >= 100 && totalDistanceKm < 200;
          case '200to500': return totalDistanceKm >= 200 && totalDistanceKm < 500;
          case 'over500': return totalDistanceKm >= 500;
          default: return true;
        }
      });
    }
    
    // Apply loop/point-to-point filter - use calculation directly
    if (routeTypeFilter !== 'all' && availableFilters.routeType) {
      result = result.filter(route => {
        if (!route.routes || route.routes.length === 0) return false;
        
        // Check if we have the isLoop property in metadata
        if (route.metadata?.isLoop !== undefined) {
          return routeTypeFilter === 'loop' ? route.metadata.isLoop : !route.metadata.isLoop;
        }
        
        // Otherwise determine if it's a loop based on start/end points
        const coordinates = route.routes[0]?.geojson?.features?.[0]?.geometry?.coordinates;
        if (!coordinates || coordinates.length < 2) return false;
        
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];
        
        // Calculate distance between start and end points
        const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
        const dy = end[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
        
        // If start and end are within 5km, consider it a loop
        const isLoop = distance < 5000;
        
        if (routeTypeFilter === 'loop') {
          return isLoop;
        } else {
          return !isLoop;
        }
      });
    }
    
    // No saved routes filtering needed - the SavedRoutesScreen directly passes in saved routes
    
    setFilteredRoutes(result);
    setDisplayedRoutes(result.slice(0, visibleCount));
    setHasMore(result.length > visibleCount);
  }, [
    allRoutes, 
    selectedMapType,
    searchTerm, 
    selectedState, 
    selectedRegion, 
    surfaceType, 
    distanceFilter,
    routeTypeFilter,
    visibleCount
  ]);
  
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [
    selectedMapType,
    searchTerm, 
    selectedState, 
    selectedRegion, 
    surfaceType, 
    distanceFilter,
    routeTypeFilter
  ]);
  
  return {
    // Map type
    selectedMapType,
    setSelectedMapType,
    
    // Filter states
    searchTerm,
    setSearchTerm,
    selectedState,
    setSelectedState,
    selectedRegion,
    setSelectedRegion,
    surfaceType,
    setSurfaceType,
    distanceFilter,
    setDistanceFilter,
    routeTypeFilter,
    setRouteTypeFilter,
    
    // Available options
    availableFilters,
    availableStates,
    availableRegions,
    availableMapTypes,
    
    // Results
    filteredRoutes,
    displayedRoutes,
    hasMore,
    
    // Actions
    loadMoreRoutes,
    getActiveFilterCount
  };
};
