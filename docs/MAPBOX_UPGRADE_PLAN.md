# Mapbox SDK Upgrade Plan: From 10.x to 11.x

## Current Status and Issues

### Current Implementation

- **Current Version**: @rnmapbox/maps version 10.1.38
- **Native SDK**: Using native Mapbox implementation (as indicated in Podfile)
- **Target Platforms**: iOS 15.1+ and Android

### Identified Issues

1. **Custom Style Compatibility**: Custom Mapbox styles created with newer SDK versions (11.12.0+) show as a black screen when loaded with our current SDK version (10.x)
2. **Icon Management Limitations**: Current version requires creating custom Mapbox styles in Mapbox Studio to use custom icons
3. **Limited Icon Features**: Version 10.x has limited support for advanced icon features like SVG rendering, icon clustering, and placement options

## Why Upgrade to Mapbox 11.x+

### Technical Benefits

1. **Enhanced Icon Support**:
   - Direct SVG icon support with better rendering quality
   - Improved runtime image loading via the `MapboxGL.Images` component
   - More control over icon placement, sizing, and collision behavior
   - Better icon clustering algorithms

2. **Performance Improvements**:
   - Optimized rendering pipeline for better performance
   - Improved handling of large numbers of markers/icons
   - Better memory management for map resources

3. **Compatibility with Modern Styles**:
   - Support for the latest Mapbox style specifications
   - Compatibility with styles created in current versions of Mapbox Studio

4. **Bug Fixes and Stability**:
   - Many bugs present in 10.x have been fixed in 11.x+
   - More stable native module integration

### Feature Benefits

1. **Simplified Custom Icon Implementation**:
   - Add custom icons directly in React Native code without creating custom styles
   - Use standard map styles (like Satellite Streets) with custom icons overlaid
   - Keep all icon management in the codebase rather than in Mapbox Studio

2. **Advanced Map Features**:
   - Improved 3D terrain visualization
   - Better camera controls and animations
   - Enhanced line styling options for routes
   - Improved offline capabilities

3. **Developer Experience**:
   - More consistent behavior across iOS and Android
   - Better error handling and debugging tools
   - More comprehensive documentation

## Upgrade Plan

### Phase 1: Preparation and Testing

1. **Create a Development Branch**:
   ```bash
   git checkout -b feature/mapbox-upgrade
   ```

2. **Update Dependencies**:
   ```bash
   # Update @rnmapbox/maps to latest version
   npm install @rnmapbox/maps@latest --save
   
   # Update related dependencies if needed
   npm install
   ```

3. **Update Native Configurations**:

   **iOS (Podfile)**:
   ```ruby
   # Update Mapbox download token if needed
   $RNMapboxMapsDownloadToken = 'sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg'
   ```

   **Android (build.gradle)**:
   - Check for any required changes to Android configuration

4. **Clean and Rebuild**:
   ```bash
   # Clean the project
   npx expo prebuild --clean
   
   # Rebuild for iOS
   npx expo run:ios
   
   # Rebuild for Android
   npx expo run:android
   ```

### Phase 2: Code Updates

1. **Update Map Component**:

   Update `MapScreen.tsx` to use the new Images component for custom icons:

   ```tsx
   <MapboxGL.MapView 
     styleURL={MAP_STYLES.SATELLITE_STREETS}
     // other props
   >
     {/* Register custom icons */}
     <MapboxGL.Images
       images={{
         'airfield': require('../assets/icons/airfield.png'),
         'attraction': require('../assets/icons/attraction.png'),
         'barrier': require('../assets/icons/barrier.png'),
         // Add all custom icons here
       }}
     />
     
     {/* Use custom icons in POI layer */}
     <MapboxGL.ShapeSource
       id="poi-source"
       shape={{
         type: 'FeatureCollection',
         features: mapDetails.pois.draggable.map((poi) => ({
           type: 'Feature',
           geometry: {
             type: 'Point',
             coordinates: ensureCorrectCoordinateOrder(poi.coordinates)
           },
           properties: {
             id: poi.id,
             name: poi.name,
             icon: mapPoiIconToMaki(poi.icon),
             color: getPoiColor(poi.category, poi.style?.color)
           }
         }))
       }}
     >
       <MapboxGL.SymbolLayer
         id="poi-symbols"
         style={{
           iconImage: '{icon}',
           iconSize: 1.5,
           iconAllowOverlap: true,
           iconColor: ['get', 'color'],
           // other style properties
         }}
       />
     </MapboxGL.ShapeSource>
   </MapboxGL.MapView>
   ```

2. **Update Icon Utilities**:

   Modify `poiIconUtils.ts` to return icon names that match the registered images:

   ```typescript
   export const mapPoiIconToMaki = (iconName: string): string => {
     // Map icon names to the custom icons registered in MapboxGL.Images
     // No need to map to Maki icon names anymore
     if (!iconName) return 'marker';
     
     switch (iconName) {
       case 'TrainStation':
         return 'rail';
       case 'Car':
         return 'car';
       // etc.
     }
     
     // Default fallback
     return 'marker';
   };
   ```

3. **Prepare Icon Assets**:

   - Convert SVG icons to PNG if needed
   - Organize icons in the assets directory
   - Ensure all icons have consistent sizing and styling

### Phase 3: Testing and Optimization

1. **Test on Multiple Devices**:
   - Test on various iOS and Android devices
   - Verify that all icons display correctly
   - Check performance with many POIs on the map

2. **Optimize Icon Loading**:
   - Consider lazy loading icons if there are many
   - Optimize icon image sizes for performance
   - Test memory usage with many icons

3. **Fix Any Issues**:
   - Address any compatibility issues that arise
   - Fix any styling inconsistencies
   - Ensure all features work as expected

### Phase 4: Deployment

1. **Update Documentation**:
   - Document the new icon implementation approach
   - Update any relevant developer documentation

2. **Create Pull Request**:
   - Submit PR with detailed description of changes
   - Include before/after screenshots

3. **Release**:
   - Merge to main branch after approval
   - Create a new app release
   - Monitor for any issues after deployment

## Implementation Example

### Custom Icon Registration

```tsx
// In MapScreen.tsx
<MapboxGL.Images
  images={{
    // Transportation icons
    'rail': require('../assets/icons/rail.png'),
    'car': require('../assets/icons/car.png'),
    'parking': require('../assets/icons/parking.png'),
    'bus': require('../assets/icons/bus.png'),
    'airfield': require('../assets/icons/airfield.png'),
    'ferry': require('../assets/icons/ferry.png'),
    'bicycle': require('../assets/icons/bicycle.png'),
    
    // Accommodation icons
    'campsite': require('../assets/icons/campsite.png'),
    'lodging': require('../assets/icons/lodging.png'),
    
    // Food & Drink icons
    'beer': require('../assets/icons/beer.png'),
    'alcohol-shop': require('../assets/icons/alcohol-shop.png'),
    'cafe': require('../assets/icons/cafe.png'),
    'restaurant': require('../assets/icons/restaurant.png'),
    'grocery': require('../assets/icons/grocery.png'),
    'drinking-water': require('../assets/icons/drinking-water.png'),
    'fast-food': require('../assets/icons/fast-food.png'),
    
    // Natural Features icons
    'mountain': require('../assets/icons/mountain.png'),
    'park-alt1': require('../assets/icons/park-alt1.png'),
    'viewpoint': require('../assets/icons/viewpoint.png'),
    'swimming': require('../assets/icons/swimming.png'),
    
    // Town Services icons
    'toilet': require('../assets/icons/toilet.png'),
    'hospital': require('../assets/icons/hospital.png'),
    'telephone': require('../assets/icons/telephone.png'),
    'information': require('../assets/icons/information.png'),
    'fuel': require('../assets/icons/fuel.png'),
    'post': require('../assets/icons/post.png'),
    
    // Road Information icons
    'danger': require('../assets/icons/danger.png'),
    'caution': require('../assets/icons/caution.png'),
    'communications-tower': require('../assets/icons/communications-tower.png'),
    'lift-gate': require('../assets/icons/lift-gate.png'),
    'gate': require('../assets/icons/gate.png'),
    'construction': require('../assets/icons/construction.png'),
    'roadblock': require('../assets/icons/roadblock.png'),
    
    // Other icons
    'historic': require('../assets/icons/historic.png'),
    'elevator': require('../assets/icons/elevator.png'),
    'water': require('../assets/icons/water.png'),
    'star': require('../assets/icons/star.png'),
    'racetrack': require('../assets/icons/racetrack.png'),
    'embassy': require('../assets/icons/embassy.png'),
    'hardware': require('../assets/icons/hardware.png'),
    'attraction': require('../assets/icons/attraction.png'),
    'commercial': require('../assets/icons/commercial.png'),
    'marker': require('../assets/icons/marker.png'),
  }}
/>
```

## Conclusion

Upgrading to Mapbox SDK 11.x+ will significantly improve our map implementation, particularly for custom icon support. The upgrade will allow us to use custom icons directly in our React Native code without creating custom Mapbox styles, simplifying our development process and improving the user experience.

The main benefits of this upgrade are:
1. Simplified custom icon implementation
2. Better performance and stability
3. Access to advanced map features
4. Improved developer experience

While the upgrade requires some initial effort, the long-term benefits make it a worthwhile investment for the Lutruwita mobile app.
