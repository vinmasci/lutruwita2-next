# Mapbox SDK Upgrade Implementation

This document outlines the implementation of the Mapbox SDK upgrade from version 10.x to 11.x in the Lutruwita mobile app.

## Changes Made

1. **Package Update**
   - Updated `@rnmapbox/maps` from version 10.1.38 to 11.1.0 in package.json

2. **Icon Implementation**
   - Added `getIconMapping()` function in `poiIconUtils.ts` to map icon names to their file paths
   - Added `MapboxGL.Images` component in `MapScreen.tsx` to register custom icons

3. **Build Process**
   - Created `rebuild-mapbox.sh` script to clean and rebuild the project

## Testing the Upgrade

To test the Mapbox SDK upgrade:

1. Run the rebuild script:
   ```bash
   cd mobile/lutruwita-mobile
   ./rebuild-mapbox.sh
   ```

2. Verify that the map loads correctly with all features:
   - Routes display properly with correct styling
   - POI markers appear with correct icons and colors
   - Map style toggle works correctly
   - 3D terrain mode functions properly

## Troubleshooting

If you encounter issues after the upgrade, try the following:

### Map Not Loading

1. Check the console logs for any error messages
2. Verify that the Mapbox access token is correctly set in `config/mapbox.ts`
3. Ensure that the Mapbox download token is correctly set in the Podfile

### POI Icons Not Appearing

1. Verify that the icon paths in `getIconMapping()` are correct
2. Check that the `MapboxGL.Images` component is properly registered in `MapScreen.tsx`
3. Ensure that the icon names returned by `mapPoiToCustomIcon()` match the keys in `getIconMapping()`

### Build Errors

1. Clear the npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete the node_modules folder and reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Clean and rebuild the project:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios  # or npx expo run:android
   ```

## Benefits of the Upgrade

The upgrade to Mapbox SDK 11.x provides several benefits:

1. **Enhanced Icon Support**
   - Direct SVG icon support with better rendering quality
   - Improved runtime image loading via the `MapboxGL.Images` component
   - More control over icon placement, sizing, and collision behavior

2. **Performance Improvements**
   - Optimized rendering pipeline for better performance
   - Improved handling of large numbers of markers/icons
   - Better memory management for map resources

3. **Compatibility with Modern Styles**
   - Support for the latest Mapbox style specifications
   - Compatibility with styles created in current versions of Mapbox Studio

4. **Bug Fixes and Stability**
   - Many bugs present in 10.x have been fixed in 11.x+
   - More stable native module integration

## Future Considerations

1. **User Preferences**: Consider storing the user's preferred map style and 3D mode setting
2. **Additional Map Styles**: Add more specialized map styles for different activities
3. **Terrain Analysis**: Add elevation profile visualization alongside the map
4. **Performance Optimization**: Further optimize terrain rendering for older devices
