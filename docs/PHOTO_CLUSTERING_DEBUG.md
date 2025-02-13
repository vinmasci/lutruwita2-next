# Photo Clustering Debug Notes

## Current Problem
Photos are not clustering properly in creation mode. Only one photo is showing up on the map when there should be multiple photos either clustered or shown individually.

## Investigation Steps Taken

1. **Initial Zoom-Based Logic Fix**
   - Found that the zoom-based clustering logic was backwards
   - Changed condition from `zoom >= CLUSTER_MAX_ZOOM` to `zoom <= CLUSTER_MAX_ZOOM`
   - This didn't resolve the issue

2. **Removed Redundant Filtering**
   - Noticed we were filtering photos twice unnecessarily
   - Consolidated the filtering into a single step
   - Added logging to track the number of valid photos

3. **Fixed Array Reference Issue**
   - Found we were using `points` array instead of `projectedPoints` in clustering loop
   - Updated to use `projectedPoints` consistently
   - Added logging to track clustering process

4. **Added Debug Logging**
   - Added logs for:
     - Total photos count
     - Photos with valid coordinates
     - Number of projected points
     - Cluster formation

## Potential Issues to Investigate

1. **Photo Context**
   - Need to verify if photos are being properly loaded into the PhotoContext
   - Check if the coordinates are in the correct format

2. **Coordinate Projection**
   - The `map.project()` function might be failing silently
   - Need to verify if coordinates are being projected correctly
   - Check if normalized coordinates are within valid bounds

3. **Clustering Algorithm**
   - The CLUSTER_RADIUS (50 pixels) might need adjustment
   - Distance calculation between points might need verification
   - The clustering loop might have edge cases we're not handling

4. **Rendering**
   - PhotoCluster component might not be rendering properly
   - Check if cluster center calculation is correct
   - Verify if the markers are being positioned correctly on the map

5. **Map State**
   - Verify if map is fully initialized when we start processing
   - Check if zoom level is being tracked correctly
   - Ensure map bounds are being considered

## Next Steps to Try

1. Add more detailed logging in the clustering process
2. Verify the structure of the photo objects from PhotoContext
3. Add visual debugging (e.g., console.log cluster centers)
4. Check if PhotoCluster component is receiving correct props
5. Verify the map's coordinate projection is working as expected
6. Consider implementing a different clustering algorithm
7. Add error boundaries to catch any silent failures

## Component Dependencies

- PhotoLayer.tsx (main clustering logic)
- PhotoCluster.tsx (cluster rendering)
- PhotoMarker.tsx (individual photo rendering)
- PhotoContext.tsx (photo data management)
- MapContext.tsx (map instance and state)

## Notes on Zoom-based Scaling

The zoom-based scaling in PhotoCluster.css should be kept as it handles the visual appearance of clusters at different zoom levels. This is separate from the clustering logic itself.

## Performance Considerations

- The current clustering algorithm is O(n²) - might need optimization for large sets
- Consider implementing spatial indexing for better performance
- Might need to implement virtualization for large numbers of markers
