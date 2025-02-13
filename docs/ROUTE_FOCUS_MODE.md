# Viewport-Based Route Optimization

**Status: Implemented** - See [ROUTE_FOCUS_MODE_IMPLEMENTATION.md](./ROUTE_FOCUS_MODE_IMPLEMENTATION.md) for implementation details.

# Original Design Document

## Overview
Instead of loading and rendering all route data continuously, we'll implement a viewport-based optimization system that:
1. Maintains minimal bounding box data for all routes
2. Only loads and renders detailed GPS data for routes visible in the current viewport
3. Automatically unloads detailed data for routes that move out of view

## Expected Performance Improvements
1. Memory Usage:
   - 70-80% reduction in memory usage with 11+ routes
   - Only detailed data for visible routes kept in memory
   - Minimal bounding box data (~4 points) for off-screen routes

2. Rendering Performance:
   - 50-70% improvement in frame rates during map interactions
   - Reduced GPU load by only rendering visible routes
   - Smoother zooming and panning

## Implementation Phases

### Phase 1: Bounding Box System
- [ ] 1. Add bounding box calculation to route processing
  ```typescript
  interface RouteBounds {
    north: number;
    south: number;
    east: number;
    west: number;
  }

  interface RouteData {
    bounds: RouteBounds;
    detailed: GeoJSON | null; // null when not in viewport
  }
  ```

- [ ] 2. Update route state management
  ```typescript
  const [routeData, setRouteData] = useState<Record<string, RouteData>>({});
  
  const calculateBounds = (geoJson: GeoJSON): RouteBounds => {
    // Calculate min/max coordinates from GeoJSON
    // Return bounding box
  };
  
  useEffect(() => {
    if (!routes) return;
    const newRouteData = { ...routeData };
    routes.forEach(route => {
      if (!newRouteData[route.id]) {
        newRouteData[route.id] = {
          bounds: calculateBounds(route.geoJson),
          detailed: null
        };
      }
    });
    setRouteData(newRouteData);
  }, [routes]);
  ```

### Phase 2: Viewport Management
- [ ] 1. Add viewport tracking
  ```typescript
  interface Viewport {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }

  const [viewport, setViewport] = useState<Viewport | null>(null);
  
  useEffect(() => {
    if (!map) return;
    
    const updateViewport = () => {
      const bounds = map.getBounds();
      setViewport({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: map.getZoom()
      });
    };
    
    map.on('moveend', updateViewport);
    map.on('zoomend', updateViewport);
    updateViewport();
    
    return () => {
      map.off('moveend', updateViewport);
      map.off('zoomend', updateViewport);
    };
  }, [map]);
  ```

### Phase 3: Route Loading/Unloading
- [ ] 1. Implement visibility checking
  ```typescript
  const isRouteVisible = (bounds: RouteBounds, viewport: Viewport): boolean => {
    return !(
      bounds.north < viewport.south ||
      bounds.south > viewport.north ||
      bounds.east < viewport.west ||
      bounds.west > viewport.east
    );
  };
  ```

- [ ] 2. Add route data management
  ```typescript
  useEffect(() => {
    if (!viewport || !routeData) return;
    
    setRouteData(prev => {
      const updated = { ...prev };
      Object.entries(updated).forEach(([id, data]) => {
        const shouldBeLoaded = isRouteVisible(data.bounds, viewport);
        if (shouldBeLoaded && !data.detailed) {
          // Load detailed data
          data.detailed = routes.find(r => r.id === id)?.geoJson || null;
        } else if (!shouldBeLoaded && data.detailed) {
          // Unload detailed data
          data.detailed = null;
        }
      });
      return updated;
    });
  }, [viewport, routes]);
  ```

### Phase 4: Route Layer Updates
- [ ] 1. Update RouteLayer to use optimized data
  ```typescript
  const RouteLayer = ({ routeId }: { routeId: string }) => {
    const { routeData } = useRouteState();
    const data = routeData[routeId];
    
    useEffect(() => {
      if (!map || !data) return;
      
      if (data.detailed) {
        // Add detailed route layer
        map.addSource(sourceId, {
          type: 'geojson',
          data: data.detailed
        });
      } else {
        // Add bounding box preview
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [data.bounds.west, data.bounds.south],
                [data.bounds.east, data.bounds.south],
                [data.bounds.east, data.bounds.north],
                [data.bounds.west, data.bounds.north],
                [data.bounds.west, data.bounds.south]
              ]
            }
          }
        });
      }
      
      return () => {
        map.removeSource(sourceId);
      };
    }, [map, data]);
    
    return null;
  };
  ```

### Phase 5: Performance Optimization
- [ ] 1. Add debouncing to viewport updates
  ```typescript
  const debouncedSetViewport = useMemo(
    () => debounce((viewport: Viewport) => setViewport(viewport), 100),
    []
  );
  ```

- [ ] 2. Add route data caching
  ```typescript
  const routeDataCache = useMemo(() => new Map<string, GeoJSON>(), []);
  
  const loadRouteData = async (routeId: string) => {
    if (routeDataCache.has(routeId)) {
      return routeDataCache.get(routeId);
    }
    const data = await fetchRouteData(routeId);
    routeDataCache.set(routeId, data);
    return data;
  };
  ```

### Phase 6: Testing
- [ ] 1. Test viewport calculations
- [ ] 2. Verify memory usage improvements
- [ ] 3. Test performance with 10+ routes
- [ ] 4. Verify smooth loading/unloading
- [ ] 5. Test edge cases (rapid zooming, panning)

## Success Criteria
1. Memory usage stays consistent regardless of route count
2. Smooth performance with 10+ routes loaded
3. No visible performance degradation during map interactions
4. Seamless loading/unloading of route details

## Monitoring
1. Memory Usage:
   - Track heap size before/after optimization
   - Monitor garbage collection frequency
   
2. Performance Metrics:
   - Frame rate during map interactions
   - Time to load/unload route details
   - CPU usage during viewport changes

## Rollback Plan
1. Keep original implementation in separate branch
2. Maintain feature flag for quick disable
3. Monitor error rates after deployment
4. Have clear rollback procedure documented
