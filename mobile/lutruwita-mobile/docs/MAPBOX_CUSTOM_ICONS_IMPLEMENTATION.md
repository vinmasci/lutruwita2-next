# Mapbox Custom Icons Implementation

## Overview

This document explains how custom icons are implemented in the Lutruwita mobile app using Mapbox GL Native SDK 11.x. The implementation leverages the runtime image loading capabilities of Mapbox 11.x to use custom icons with standard map styles.

## Implementation Details

There are two approaches implemented for displaying POI markers on the map:

### Approach 1: Custom React Native Markers with MarkerView

This approach uses React Native components with MapboxGL.MarkerView to create custom styled markers that match the web app's look and feel.

#### 1. POIMarker Component

The `POIMarker.tsx` component renders a styled marker with a white icon on a colored circular background:

```tsx
const POIMarker: React.FC<POIMarkerProps> = ({ poi }) => {
  // Get the icon component based on the POI's icon property
  const IconComponent = poi.icon ? getIconComponent(poi.icon) : MapPin;
  
  // Use category color or POI's color if available
  const markerColor = poi.style?.color || getCategoryColor(poi.category) || '#3478F6';
  
  // Use the POI's size if available, otherwise use a default size
  const markerSize = poi.style?.size || 24;
  
  return (
    <View style={[
      styles.markerContainer,
      {
        width: markerSize + 12, // Add some padding
        height: markerSize + 12,
        borderRadius: (markerSize + 12) / 2,
        backgroundColor: markerColor,
      }
    ]}>
      <IconComponent size={markerSize * 0.75} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
};
```

#### 2. Using MarkerView in MapScreen

In `MapScreen.tsx`, we use MapboxGL.MarkerView to position these custom markers on the map:

```tsx
{/* Display POIs using MarkerView with custom POIMarker component */}
{mapDetails.pois && mapDetails.pois.draggable && mapDetails.pois.draggable.length > 0 && 
  mapDetails.pois.draggable.map((poi) => (
    <MapboxGL.MarkerView
      key={`poi-marker-${poi.id}`}
      coordinate={ensureCorrectCoordinateOrder(poi.coordinates)}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.markerContainer}>
        <POIMarker poi={poi} />
        {poi.name && (
          <RNText style={styles.markerLabel}>
            {poi.name}
          </RNText>
        )}
      </View>
    </MapboxGL.MarkerView>
  ))
}
```

### Approach 2: PNG Icons with SymbolLayer (Alternative)

This approach uses PNG icons with Mapbox's SymbolLayer. It's included here for reference but has limitations with styling.

#### 1. Icon Assets

Custom icons are stored in the assets directory:

```
mobile/lutruwita-mobile/assets/icons/fontawesome/
```

These are FontAwesome icons converted to PNG format for use with Mapbox.

#### 2. Icon Mapping

The `poiIconUtils.ts` file contains functions for mapping POI names to icon files:

```typescript
export const getIconMapping = () => {
  return {
    'custom-rail': require('../../assets/icons/fontawesome/train-solid.png'),
    'custom-car': require('../../assets/icons/fontawesome/cars-solid.png'),
    // ... more icon mappings
  };
};

export const mapPoiToCustomIcon = (iconName: string): string => {
  if (!iconName) return 'custom-marker';
  
  // First try exact match (case-sensitive)
  switch (iconName) {
    case 'TrainStation':
      return 'custom-rail';
    // ... more mappings
  }
  
  // Default fallback
  return 'custom-marker';
};
```

#### 3. Using SymbolLayer (Alternative Approach)

```tsx
<MapboxGL.ShapeSource
  id="poi-source"
  shape={{
    type: 'FeatureCollection',
    features: mapDetails.pois.draggable.map((poi) => ({
      // ... feature properties
      properties: {
        // ... other properties
        icon: mapPoiToCustomIcon(poi.icon),
      }
    }))
  }}
>
  <MapboxGL.SymbolLayer
    id="custom-poi-symbols"
    style={{
      iconImage: '{icon}',
      iconSize: 0.05, // Small size for 512x512 PNG icons
      iconAllowOverlap: true,
      textField: '{name}',
      // ... other style properties
    }}
  />
</MapboxGL.ShapeSource>
```

## Icon Styling

### MarkerView Approach (Current Implementation)

With the MarkerView approach, we have complete control over styling using React Native components:

- Icons are rendered as white Lucide React Native icons
- Background is a colored square with rounded corners (borderRadius: 8) based on the POI category
- Text labels are positioned below the marker with a text shadow for readability
- Marker size can be customized per POI (default size reduced to 20 for better proportions)
- White border (2.5px) around markers for better visibility against map backgrounds
- Elevation and shadow effects for a more polished look

This approach matches the styling of the web app and provides the most flexibility.

#### Specific Icon Mappings

The following specific icon mappings from Lucide React Native are used:

- Road closed: Construction
- Private road: Ban
- Gate locked: LockKeyhole (for door-closed-locked)
- Gate unlocked: DoorClosed (for door-closed)
- HeavyTraffic: Car
- Single Track: MoreHorizontal (for ellipsis)
- Start: Play
- Finish: StopCircle (for circle-stop)
- Aid station: BriefcaseMedical
- Rest stop: Battery (for battery-medium)
- Bikehub: Wrench
- Checkpoint: Flag
- Shower: ShowerHead
- Service station: Fuel
- Post office: Mail
- Swimming: Waves (for waves-ladder)
- Mountainbikepark: Signpost (for signpost-big)
- Remote Area: WifiOff (for wifi-off)
- Rough Surface: Trash2 (for bin)

#### Styling Updates

- Changed marker shape from circular to square with rounded corners (borderRadius: 8)
- Reduced border width from 2.5px to 1.5px for a more refined look
- Reduced default marker size from 24 to 20 for better proportions
- Updated category colors:
  - Hazard icons (road-information, trail-information): Red (#F44336)
  - Food, drink, and shopping (food-drink): Yellow (#FFC107)
  - Accommodation: Purple (#9C27B0)
  - Natural features: Green (#4CAF50)
  - Town services or event information: Dark blue gray (#546E7A)

### SymbolLayer Approach (Alternative)

When using PNG icons with SymbolLayer, styling options are more limited:

```typescript
iconImage: '{icon}', // Use the icon property from the feature
iconSize: 0.05, // Smaller size for 512x512 PNG icons
iconAllowOverlap: true,
// No iconColor for PNG icons as they don't support recoloring
```

**Important Note**: Unlike SVG icons, PNG icons cannot be recolored using the `iconColor` property, and the halo effects (`iconHaloColor`, `iconHaloWidth`, etc.) don't work well with PNG icons. This is why we switched to the MarkerView approach for better styling control.

## Benefits of the MarkerView Approach

1. **Complete Styling Control**: Full control over the appearance of markers using React Native components
2. **Consistent Look**: Markers match the styling of the web app with white icons on colored backgrounds
3. **Flexible Customization**: Easy to customize individual markers based on their properties
4. **No Asset Limitations**: Not limited by PNG icon coloring restrictions
5. **Standard Map Styles**: We can use standard Mapbox styles while still having custom styled markers
6. **Code Reuse**: Leverages the existing POIMarker component already used in other parts of the app

## Map Style Configuration

The app uses standard Mapbox styles defined in `config/mapbox.ts`:

```typescript
export const MAP_STYLES = {
  STREET: 'mapbox://styles/mapbox/streets-v11',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v11',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v10',
  LIGHT: 'mapbox://styles/mapbox/light-v10',
  CUSTOM: 'mapbox://styles/vinmasci/cm9tiznwq00em01ss9hy10ep9', // Custom style (not used by default)
};
```

The app defaults to using `MAP_STYLES.SATELLITE_STREETS` and allows users to toggle between different styles.

## Web App POI Icon References

The POI icon names used in the mobile app are derived from the web application. The web app defines its POI icons in:

```
src/features/poi/constants/poi-icons.js
```

This file contains the `POI_ICONS` array that defines all available icons with their names, categories, labels, and descriptions. When adding new icons to the mobile app, you should reference this file to ensure consistency between the web and mobile applications.

Example of the POI_ICONS definition in the web app:

```javascript
export const POI_ICONS = [
    // Road Information
    { name: 'TrafficCone', category: 'road-information', label: 'Road Hazard', description: 'Warning for road hazards or dangerous conditions' },
    { name: 'Octagon', category: 'road-information', label: 'Road Closed', description: 'Road is closed to all traffic' },
    // ... more icons
];
```

## Adding New Icons

To add a new icon:

1. Check the web app's `src/features/poi/constants/poi-icons.js` file to find the icon name
2. Add the PNG file to `assets/icons/fontawesome/`
3. Add the icon mapping in `getIconMapping()` in `poiIconUtils.ts`
4. Update the `mapPoiToCustomIcon()` function to map your POI icon names to the new icon

Example:

```typescript
// In getIconMapping()
return {
  // ... existing icons
  'new-icon': require('../../assets/icons/fontawesome/new-icon.png'),
};

// In mapPoiToCustomIcon()
switch (iconName) {
  // ... existing cases
  case 'NewIconName':
    return 'new-icon';
}
```

## Troubleshooting

If icons don't appear:

1. Check that the icon file exists in the assets directory
2. Verify the icon mapping in `getIconMapping()`
3. Ensure the `mapPoiToCustomIcon()` function returns the correct icon name
4. Check the console for any errors related to image loading

## Troubleshooting Custom Icons

### Common Issues and Solutions

#### 1. Custom Icons Appearing Too Large

If your custom icons appear too large on the map, this is typically because the source PNG files are large (e.g., 512x512 pixels) while the `iconSize` property is not small enough to compensate.

**Solution:**
- Reduce the `iconSize` property in the SymbolLayer configuration to a much smaller value (e.g., 0.05 instead of 0.25)
- Consider using smaller source PNG files (64x64 or 128x128) for better performance

```typescript
<MapboxGL.SymbolLayer
  id="custom-poi-symbols"
  style={{
    iconImage: '{icon}',
    iconSize: 0.05, // Much smaller size for large PNG icons
    // other properties...
  }}
/>
```

#### 2. Built-in Mapbox Icons Overriding Custom Icons

Standard Mapbox styles (like satellite-streets-v12) already include symbol layers for common POI types like camping sites, airports, and restaurants. These built-in icons can override your custom icons if they share the same location or category.

**Solution:**
- Hide the built-in POI icons by adding a SymbolLayer that targets Mapbox's internal POI layer:

```typescript
<MapboxGL.SymbolLayer
  id="hide-poi-labels"
  sourceID="composite"
  sourceLayerID="poi_label"
  style={{
    visibility: 'none' // Hide all built-in POI icons
  }}
/>
```

- Ensure your custom icons have higher priority by using the `symbolZOrder` and `symbolSortKey` properties:

```typescript
<MapboxGL.SymbolLayer
  id="custom-poi-symbols"
  style={{
    // other properties...
    iconIgnorePlacement: true, // Ensure icons are always shown
    symbolZOrder: 'source', // Prioritize our custom icons
    symbolSortKey: 10 // Higher value = higher priority
  }}
/>
```

#### 3. Custom Icons Not Showing Until 3D Mode is Toggled

If your custom icons don't appear initially but do show up after toggling to 3D mode (and then persist when toggling back to 2D), this indicates an issue with layer rendering order or style refresh.

**Solution:**
- Use prefixed icon names to avoid conflicts with Mapbox's built-in POI categories:

```typescript
// In getIconMapping()
return {
  'custom-rail': require('../../assets/icons/fontawesome/train-solid.png'),
  'custom-car': require('../../assets/icons/fontawesome/cars-solid.png'),
  'custom-parking': require('../../assets/icons/fontawesome/square-parking-solid.png'),
  // ... more prefixed icon mappings
};

// In mapPoiToCustomIcon()
switch (iconName) {
  case 'TrainStation':
    return 'custom-rail'; // Using prefixed name
  case 'Car':
    return 'custom-car';
  // ... more mappings
}
```

This approach is more elegant and reliable than trying to hide Mapbox's built-in icons because:

1. It avoids name collisions entirely rather than trying to hide existing elements
2. It's more maintainable and less likely to break with Mapbox updates
3. It works with Mapbox's design rather than against it
4. It doesn't rely on complex layer manipulation or refresh tricks

The key insight is that Mapbox's built-in icons are only overriding your custom icons when they share the same name (like 'campsite', 'ferry', etc.). By using prefixed names like 'custom-campsite', you ensure your icons are treated as completely separate entities.

#### 4. Inconsistent Icon Appearance

If your icons appear inconsistently or flicker when panning/zooming, you may need to adjust additional properties.

**Solution:**
- Add padding around icons and ensure they're properly aligned with the map:

```typescript
<MapboxGL.SymbolLayer
  style={{
    // other properties...
    iconPadding: 5, // Add padding around icons
    iconPitchAlignment: 'map', // Keep icons aligned with the map
  }}
/>
```

## Conclusion

This implementation leverages the improved icon handling capabilities in Mapbox 11.x to provide a flexible and maintainable solution for custom icons. By using runtime image loading with custom PNG icons, we can display POI markers that match the web application's icons.

While PNG icons cannot be recolored like SVG icons, they offer the advantage of consistent appearance across different devices and platforms. If colored icons are needed, you would need to prepare different colored versions of the PNG files.

This approach gives us full control over our custom icons while still using standard map styles, making it easier to maintain and update the app. The troubleshooting section above provides solutions to common issues that may arise when implementing custom icons.
