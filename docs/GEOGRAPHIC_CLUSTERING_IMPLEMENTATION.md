# Geographic Clustering Implementation

## Problem

The application was experiencing issues with POI clusters on mobile devices:

1. **Excessive Movement**: Clusters were recalculating and moving around too much when zooming in/out
2. **Performance Issues**: The constant recalculation was causing high CPU usage
3. **Crashes**: On mobile devices, this was leading to crashes due to resource limitations

The root cause was that the original clustering approach used Supercluster with pixel-based distance thresholds, which meant:
- Clusters were based on screen distance (pixels), not real-world distance
- Every zoom change required complete recalculation of clusters
- Clusters could dramatically reorganize between zoom levels

## Solution: Zoom-Dependent Geographic Clustering

We implemented a new clustering approach that:

1. Uses **geographic distance** (meters) instead of pixel distance
2. Adjusts clustering distance based on **zoom level**
3. Provides **special optimizations for mobile devices**

### Key Components

1. **Geographic Distance Calculation**: Using the Haversine formula to calculate real-world distances between POIs
2. **Zoom-Dependent Thresholds**: Different clustering distances at different zoom levels
3. **Progressive Reveal**: Clusters break apart gradually as the user zooms in
4. **Mobile Optimizations**: More aggressive clustering and no animations on mobile

## Implementation Details

### 1. Geographic Clustering Utility

The `geographicClustering.js` file provides utilities for:

- Calculating distances between coordinates using the Haversine formula
- Creating clusters based on geographic proximity
- Converting clusters to GeoJSON format for rendering
- Special handling for high zoom levels (no clustering)

### 2. Zoom-Dependent Distance Thresholds

The clustering distance threshold varies by zoom level:

| Zoom Level | Desktop Threshold | Mobile Threshold | Effect |
|------------|------------------|------------------|--------|
| < 8        | 800m             | 1000m            | Large clusters when zoomed out |
| 8-12       | 400m             | 500m             | Medium clusters at mid zoom |
| 12-15      | 150m             | 200m             | Small clusters when zoomed in |
| ≥ 15       | 0m (no clustering) | 0m (no clustering) | Individual POIs at high zoom |

### 3. Mobile-Specific Optimizations

For mobile devices (screen width ≤ 768px):
- Larger clustering distances (25% more than desktop)
- Direct zoom jumps instead of animations
- Simplified cluster expansion behavior

## Benefits

1. **Stability**: Clusters maintain consistent membership across zoom levels
2. **Performance**: Reduced CPU/GPU load, especially on mobile
3. **User Experience**: More predictable behavior when navigating the map
4. **Progressive Detail**: Appropriate level of detail at each zoom level

## Technical Notes

- The implementation uses a hybrid approach that combines the stability of geographic clustering with the progressive reveal of zoom-dependent thresholds
- At high zoom levels (≥ 15), clustering is disabled entirely to show full detail
- The geographic clustering is still recalculated on zoom changes, but the calculations are much more stable and predictable
- Mobile devices use more aggressive clustering to further reduce processing load

## Future Improvements

Potential future enhancements could include:

1. Pre-calculating clusters at server level for even better performance
2. Caching cluster results to avoid recalculation when returning to previous zoom levels
3. Further optimizing the mobile experience with simplified marker rendering
