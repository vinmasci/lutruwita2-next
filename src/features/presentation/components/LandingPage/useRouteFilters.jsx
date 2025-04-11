import { useState, useEffect, useMemo } from 'react';
import { calculateUnpavedPercentage } from './RouteCard.jsx';
import { withPerformanceTracking } from '../../../../utils/performanceUtils';

// Helper function to measure performance of filtering operations
const measureFilterOperation = (operation, name) => {
  return withPerformanceTracking(operation, `useRouteFilters.${name}`);
};

export const useRouteFilters = (allRoutes) => {
  console.time('useRouteFilters-Hook');
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedMapTypes, setSelectedMapTypes] = useState([]);
  const [surfaceType, setSurfaceType] = useState('all'); // 'all', 'paved', 'unpaved'
  const [distanceFilter, setDistanceFilter] = useState('any');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all'); // 'all', 'loop', 'point'
  
  // Results
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [displayedRoutes, setDisplayedRoutes] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3); // Changed initial count to 3
  const [hasMore, setHasMore] = useState(false);
  
  // Dynamically generate available states from route metadata
  const availableStates = useMemo(() => {
    console.time('availableStates-Calculation');
    if (!allRoutes.length) {
      console.timeEnd('availableStates-Calculation');
      return [];
    }
    
    // Extract unique states from route metadata
    const states = allRoutes
      .filter(route => route.metadata?.state)
      .map(route => route.metadata.state);
    
    // Return unique states
    const result = [...new Set(states)].sort();
    console.timeEnd('availableStates-Calculation');
    return result;
  }, [allRoutes]);
  
  // Dynamically generate available regions based on selected state
  const availableRegions = useMemo(() => {
    console.time('availableRegions-Calculation');
    if (!selectedState || !allRoutes.length) {
      console.timeEnd('availableRegions-Calculation');
      return [];
    }
    
    // Extract unique regions (LGAs) from route metadata for the selected state
    // LGAs can be comma-separated in the metadata
    const regions = [];
    
    allRoutes
      .filter(route => route.metadata?.state === selectedState && route.metadata?.lga)
      .forEach(route => {
        // Split LGAs by comma and trim whitespace
        const lgas = route.metadata.lga.split(',').map(lga => lga.trim());
        regions.push(...lgas);
      });
    
    // Return unique regions
    const result = [...new Set(regions)].sort();
    console.timeEnd('availableRegions-Calculation');
    return result;
  }, [selectedState, allRoutes]);
  
  // Dynamically generate available map types from route metadata
  const availableMapTypes = useMemo(() => {
    console.time('availableMapTypes-Calculation');
    if (!allRoutes.length) {
      console.timeEnd('availableMapTypes-Calculation');
      return [];
    }
    
    // Extract unique map types from routes
    const types = allRoutes
      .filter(route => route.type)
      .map(route => route.type.charAt(0).toUpperCase() + route.type.slice(1)); // Capitalize first letter
    
    // Return unique map types
    const result = [...new Set(types)].sort();
    console.timeEnd('availableMapTypes-Calculation');
    return result;
  }, [allRoutes]);
  
  // Handle map type selection
  const handleMapTypeToggle = (type) => {
    setSelectedMapTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };
  
  const loadMoreRoutes = () => {
    const nextVisibleCount = visibleCount + 3; // Changed increment to 3
    setVisibleCount(nextVisibleCount);
    setDisplayedRoutes(filteredRoutes.slice(0, nextVisibleCount));
    setHasMore(nextVisibleCount < filteredRoutes.length);
  };
  
  // Apply filters to routes
  useEffect(() => {
    console.time('ApplyFilters-Effect');
    if (!allRoutes.length) {
      console.timeEnd('ApplyFilters-Effect');
      return;
    }
    
    let result = [...allRoutes];
    
    // Apply search term filter
    if (searchTerm) {
      console.time('SearchTermFilter');
      result = measureFilterOperation(
        () => result.filter(route => 
          route.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        'searchTermFilter'
      )();
      console.timeEnd('SearchTermFilter');
    }
    
    // Apply state filter based on metadata
    if (selectedState) {
      console.time('StateFilter');
      result = measureFilterOperation(
        () => result.filter(route => 
          route.metadata?.state === selectedState
        ),
        'stateFilter'
      )();
      console.timeEnd('StateFilter');
    }
    
    // Apply region filter based on metadata
    if (selectedRegion) {
      console.time('RegionFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          if (!route.metadata?.lga) return false;
          
          // Split LGAs by comma and trim whitespace
          const lgas = route.metadata.lga.split(',').map(lga => lga.trim());
          
          // Check if the selected region is in the list of LGAs
          return lgas.includes(selectedRegion);
        }),
        'regionFilter'
      )();
      console.timeEnd('RegionFilter');
    }
    
    // Apply map type filter
    if (selectedMapTypes.length > 0) {
      console.time('MapTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          // Convert route type to match our filter options format
          const routeType = route.type?.charAt(0).toUpperCase() + route.type?.slice(1);
          return selectedMapTypes.includes(routeType);
        }),
        'mapTypeFilter'
      )();
      console.timeEnd('MapTypeFilter');
    }
    
    // Apply surface type filter - use calculation directly
    if (surfaceType !== 'all') {
      console.time('SurfaceTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          if (!route.routes || route.routes.length === 0) return false;
          
          // Always use the calculation
          const unpavedPercentage = calculateUnpavedPercentage(route);
          
          switch (surfaceType) {
            case 'road': return unpavedPercentage < 10;
            case 'mixed': return unpavedPercentage >= 10 && unpavedPercentage < 60;
            case 'unpaved': return unpavedPercentage >= 10; // Include both mixed terrain and unpaved routes
            default: return true;
          }
        }),
        'surfaceTypeFilter'
      )();
      console.timeEnd('SurfaceTypeFilter');
    }
    
    // Apply distance filter - use metadata if available, otherwise calculate
    if (distanceFilter !== 'any') {
      console.time('DistanceFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
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
        }),
        'distanceFilter'
      )();
      console.timeEnd('DistanceFilter');
    }
    
    // Apply loop/point-to-point filter - use calculation directly
    if (routeTypeFilter !== 'all') {
      console.time('RouteTypeFilter');
      result = measureFilterOperation(
        () => result.filter(route => {
          if (!route.routes || route.routes.length === 0) return false;
          
          // Always determine if it's a loop based on start/end points
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
        }),
        'routeTypeFilter'
      )();
      console.timeEnd('RouteTypeFilter');
    }
    
    console.time('UpdateFilteredRoutes');
    setFilteredRoutes(result);
    setDisplayedRoutes(result.slice(0, visibleCount));
    setHasMore(result.length > visibleCount);
    console.timeEnd('UpdateFilteredRoutes');
    console.timeEnd('ApplyFilters-Effect');
  }, [
    allRoutes, 
    searchTerm, 
    selectedState, 
    selectedRegion, 
    selectedMapTypes, 
    surfaceType, 
    distanceFilter,
    routeTypeFilter,
    visibleCount
  ]);
  
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(3); // Changed reset count to 3
  }, [
    searchTerm, 
    selectedState, 
    selectedRegion, 
    selectedMapTypes, 
    surfaceType, 
    distanceFilter,
    routeTypeFilter
  ]);
  
  // Log when the hook completes
  useEffect(() => {
    console.timeEnd('useRouteFilters-Hook');
  }, []);

  return {
    // Filter states
    searchTerm,
    setSearchTerm,
    selectedState,
    setSelectedState,
    selectedRegion,
    setSelectedRegion,
    selectedMapTypes,
    setSelectedMapTypes,
    surfaceType,
    setSurfaceType,
    distanceFilter,
    setDistanceFilter,
    routeTypeFilter,
    setRouteTypeFilter,
    
    // Available options
    availableStates,
    availableRegions,
    availableMapTypes,
    
    // Results
    filteredRoutes,
    displayedRoutes,
    hasMore,
    
    // Actions
    handleMapTypeToggle,
    loadMoreRoutes
  };
};
