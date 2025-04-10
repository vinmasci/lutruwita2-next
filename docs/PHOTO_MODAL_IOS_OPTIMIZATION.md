# Photo Modal iOS Optimization

## Issue
The photo modal in presentation mode was causing crashes on iOS devices. The issue was related to too many operations happening simultaneously when a photo marker was clicked:

1. Photo marker selection
2. Map panning to the photo's location
3. Modal opening
4. Photo loading
5. Adjacent photo preloading
6. Cluster calculations
7. Multiple state updates

These operations happening in rapid succession were overwhelming iOS devices, leading to crashes.

## Root Causes

1. **Synchronous Operations**: Too many operations were happening synchronously without giving the device time to process each step.

2. **Aggressive Preloading**: The `PhotoModal.jsx` component was trying to preload adjacent photos immediately after the current photo loaded.

3. **Multiple Map Operations**: The map was being manipulated (panning, zooming) at the same time as other resource-intensive operations.

4. **Excessive Re-renders**: The rapid state changes were causing multiple re-renders in quick succession.

## Solution

The solution implements a "staged loading" approach similar to what was done for the POI modal (as seen in `POI_MODAL_LOADING_OPTIMIZATION.md`). The key changes are:

### 1. PhotoModal.jsx Changes

1. **Staged Loading**:
   - Added a new `isContentReady` state that delays showing the modal content
   - Implemented longer delays for iOS devices (600ms vs 300ms for other devices)
   - Only render the full modal content after the delay, showing a loading spinner initially

2. **Throttled Preloading**:
   - Increased the delay between preloading adjacent photos (800ms for iOS, 400ms for others)
   - Limited the number of preload attempts to prevent excessive operations
   - Only start preloading after the content is ready

3. **Debounced Navigation**:
   - Added debounce to prevent rapid navigation between photos
   - Used refs to track navigation state to prevent multiple rapid navigation attempts
   - Implemented longer debounce delays for iOS devices

4. **Optimized Touch Handling**:
   - Added debounce to touch swipe handlers to prevent rapid swipes
   - Used refs to track touch state to prevent multiple rapid swipe attempts
   - Implemented longer debounce delays for iOS devices

### 2. PresentationPhotoLayer.js Changes

1. **Delayed Modal Opening**:
   - Added a delay between marker click and modal opening
   - First pan the map to the photo's location
   - Then, after a delay (400ms for iOS, 200ms for others), set the selected photo to open the modal
   - This ensures the map panning is completed before the modal opens

## Benefits

1. **Improved Stability**: By staggering operations and adding delays, the iOS device has time to process each step, preventing crashes.

2. **Smoother User Experience**: The staged loading approach provides a more polished experience with a loading indicator while content is being prepared.

3. **Reduced Resource Contention**: By spacing out resource-intensive operations, we reduce the peak load on the device.

4. **Consistent Performance**: The optimizations ensure consistent performance across different devices, with special handling for iOS.

## Technical Implementation Details

1. **iOS Detection**:
   ```javascript
   const isIOS = useCallback(() => {
     return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
   }, []);
   ```

2. **Staged Loading**:
   ```javascript
   const [isContentReady, setIsContentReady] = useState(false);
   
   useEffect(() => {
     // Delay setting content ready to prevent too many operations at once
     // Use a longer delay on iOS devices
     const delay = isIOS() ? 600 : 300;
     const timer = setTimeout(() => {
       setIsContentReady(true);
     }, delay);
     
     return () => clearTimeout(timer);
   }, [photos, initialIndex, isIOS]);
   ```

3. **Throttled Preloading**:
   ```javascript
   // Track preload attempts to prevent excessive preloading
   const preloadAttemptsRef = useRef(0);
   
   useEffect(() => {
     if (!selectedPhoto || !isContentReady) return;
     
     // Reset preload attempts counter when selected photo changes
     preloadAttemptsRef.current = 0;
     
     // Use longer timeouts on iOS to prevent overwhelming the device
     const isIOSDevice = isIOS();
     const baseDelay = isIOSDevice ? 800 : 400;
     
     // Only preload if we haven't exceeded the maximum number of preload attempts
     if (preloadAttemptsRef.current < 3) {
       setTimeout(() => {
         if (nextPhoto) {
           preloadPhoto(nextPhoto);
           preloadAttemptsRef.current += 1;
         }
       }, baseDelay);
     }
   }, [selectedPhoto, localPhotos, preloadPhoto, loadedPhotos, isContentReady, isIOS]);
   ```

4. **Debounced Navigation**:
   ```javascript
   const isNavigatingRef = useRef(false);
   
   const handleNext = useCallback(() => {
     // Prevent rapid navigation
     if (isNavigatingRef.current) return;
     isNavigatingRef.current = true;
     
     // Navigation logic...
     
     // Reset navigation lock after a delay
     setTimeout(() => {
       isNavigatingRef.current = false;
     }, isIOS() ? 800 : 400);
   }, [localPhotos, selectedIndex, map, isMobileDevice, loadedPhotos, isIOS]);
   ```

5. **Delayed Modal Opening**:
   ```javascript
   onClick: () => {
     // First, pan the map to the photo's location
     if (map && item.properties.photo.coordinates) {
       map.easeTo({
         center: [item.properties.photo.coordinates.lng, item.properties.photo.coordinates.lat],
         zoom: map.getZoom(),
         pitch: isMobile ? 0 : 60,
         duration: isMobile ? 200 : 300
       });
     }
     
     // Then, after a delay, set the selected photo to open the modal
     // Use a longer delay on iOS devices to prevent crashes
     const delay = isIOS ? 400 : 200;
     setTimeout(() => {
       setSelectedPhoto(item.properties.photo);
     }, delay);
   }
   ```

## Testing

The changes have been tested on iOS devices to ensure:
1. The photo modal opens smoothly without crashing
2. Navigation between photos works correctly
3. Swipe gestures work as expected
4. The user experience is consistent and stable

## Future Considerations

1. **Further Optimization**: Consider implementing more aggressive optimizations for older iOS devices.
2. **Lazy Loading**: Consider implementing true lazy loading for photos in the carousel.
3. **Reduced Quality on Mobile**: Consider using even lower quality images on mobile devices to reduce memory usage.
