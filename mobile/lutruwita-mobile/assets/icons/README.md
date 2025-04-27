# Custom FontAwesome Icons for POI Markers

This directory contains custom FontAwesome icons converted to PNG format for use with POI markers in the app.

## Available Icons

The icons are stored in the `fontawesome` subdirectory. These PNG icons are loaded at runtime using the `MapboxGL.Images` component to display POI markers on the map.

The icons are referenced by name in the `mapPoiToCustomIcon` function in `src/utils/poiIconUtils.ts`, which maps our POI icon names to custom icon names.

## Icons Used in the App

Based on the POI categories used in the app, the following FontAwesome icons (converted to PNG) are used:

### Transportation
- `flag-solid.png` - Default marker
- `train-solid.png` - Train stations
- `bus-solid.png` - Bus stops
- `cars-solid.png` - Car-related POIs
- `bicycle-solid.png` - Bike-related POIs
- `plane-solid.png` - Airports
- `ship-solid.png` - Ferry terminals

### Accommodation
- `bed-solid.png` - Hotels and other accommodations
- `campground-solid.png` - Camping sites and huts

### Food & Drink
- `utensils-solid.png` - Restaurants
- `mug-hot-solid.png` - Cafes
- `beer-mug-empty-solid.png` - Pubs and bars
- `cart-shopping-solid.png` - Grocery stores
- `store-solid.png` - General shops
- `droplet-solid.png` - Water sources

### Natural Features
- `mountain-solid.png` - Mountains and peaks
- `tree-solid.png` - Parks and natural areas
- `binoculars-solid.png` - Scenic viewpoints

### Town Services
- `restroom-solid.png` - Toilets and restrooms
- `hospital-solid.png` - Hospitals and medical facilities
- `envelope-solid.png` - Emergency phones
- `sign-post-solid.png` - Information centers

### Road Information
- `road-barrier-solid.png` - Road barriers and warnings
- `road-circle-exclamation-solid.png` - Danger points
- `traffic-cone-solid.png` - Construction areas

## Current Implementation

The app uses custom FontAwesome PNG icons for POIs. The implementation in `MapScreen.tsx` uses the `MapboxGL.Images` component to register the icons and the `iconImage` property with the icon name from the feature properties:

```tsx
{/* Register custom icons */}
<MapboxGL.Images
  images={getIconMapping()}
/>

{/* ... */}

<MapboxGL.SymbolLayer
  id="poi-symbols"
  style={{
    iconImage: '{icon}', // Use the icon property from the feature
    iconSize: 0.4, // Smaller size for better proportions
    iconAllowOverlap: true,
    iconColor: '#FFFFFF', // Make icons white
    iconHaloColor: ['get', 'color'], // Use the category color for the background
    iconHaloWidth: 3, // Wider halo for more visible background
    iconHaloBlur: 1, // Slight blur for a softer edge
    iconPadding: 2, // Add padding around the icon
    textField: '{name}',
    textSize: 12,
    textOffset: getPoiTextOffset(),
    textAnchor: 'bottom',
    textColor: '#FFFFFF',
    textHaloColor: '#000000',
    textHaloWidth: 1,
    textOptional: false
  }}
/>
```

The icon name is determined by the `mapPoiToCustomIcon` function in `src/utils/poiIconUtils.ts`, which maps our POI icon names to custom icon names.

## Resources

- [FontAwesome Icons](https://fontawesome.com/icons)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)
- [React Native Mapbox GL Documentation](https://github.com/rnmapbox/maps/blob/main/docs/SymbolLayer.md)
- [Mapbox Images Documentation](https://github.com/rnmapbox/maps/blob/main/docs/Images.md)
