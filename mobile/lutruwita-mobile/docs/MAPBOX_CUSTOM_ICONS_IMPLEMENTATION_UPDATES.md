# Mapbox Custom Icons Implementation Updates

## Recent Updates (April 2025)

The following updates have been made to the POI marker implementation in the Lutruwita mobile app:

### 1. Reduced Padding Around Custom Icons

- Decreased the padding from 12px to 8px, making the marker boxes more compact
- Updated in `POIMarker.tsx`:
  ```tsx
  <View style={[
    styles.markerContainer,
    {
      width: markerSize + 8, // Reduced padding (was +12)
      height: markerSize + 8, // Reduced padding (was +12)
      borderRadius: 8,
      backgroundColor: finalColor,
    }
  ]}>
  ```

### 2. Updated POI Marker Colors

- Changed food-drink POIs to #f7b731 (yellow)
- Changed town services POI markers to #0a3d62 (dark blue)
- Changed water crossing and drinking water POIs to #6a89cc (light blue)
- Changed transport icons to #38ada9 (teal)
- Updated in `POIMarker.tsx`:
  ```tsx
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'transportation':
        return '#38ada9'; // Teal (was #4A89F3)
      case 'accommodation':
        return '#9C27B0'; // Purple
      case 'food-drink':
        return '#f7b731'; // Yellow (was #ff7f50)
      case 'natural-features':
        return '#4CAF50'; // Green
      case 'town-services':
        return '#0a3d62'; // Dark blue (was #546E7A)
      // ...
    }
  };
  
  // Special case for water crossing and drinking water POIs
  let finalColor = markerColor;
  if (poi.icon && (
    poi.icon.toLowerCase() === 'watercrossing' || 
    poi.icon.toLowerCase() === 'droplet' || 
    poi.icon.toLowerCase() === 'water' || 
    poi.icon.toLowerCase() === 'waves' || 
    poi.icon.toLowerCase() === 'drinking-water'
  )) {
    finalColor = '#6a89cc'; // Light blue for water-related POIs
  }
  ```

### 3. Updated Icon Mappings

- Changed the single track icon to Worm (from Lucide icons)
- Changed the rough surface icon to Banana (from Lucide icons)
- Updated in `POIMarker.tsx`:
  ```tsx
  import {
    // ...existing imports
    // New icons for user's latest request
    Worm,
    Banana
  } from 'lucide-react-native';
  
  // In getIconComponent function:
  case 'RoughSurface':
  case 'ChevronsRightLeft':
    return Banana; // Using Banana for Rough Surface (was Trash2)
    
  case 'AudioWaveform':
    return Worm; // Using Worm for Single Track (was MoreHorizontal)
  ```

### 4. Added POI Details Drawer

- Created a new component `POIDetailsDrawer.tsx` that slides up from the bottom when a POI is clicked
- The drawer displays the POI name, category, and description
- Includes a placeholder for photos if the POI has any
- Can be closed by tapping the X button or outside the drawer area
- Implementation highlights:
  ```tsx
  const POIDetailsDrawer: React.FC<POIDetailsDrawerProps> = ({ poi, onClose }) => {
    const translateY = useRef(new Animated.Value(300)).current;
  
    useEffect(() => {
      if (poi) {
        // Animate drawer sliding up
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      } else {
        // Animate drawer sliding down
        Animated.timing(translateY, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, [poi, translateY]);
    
    // ...drawer content rendering
  }
  ```

### 5. Implemented Conditional POI Labels

- POI text labels now only appear when zoomed in past level 12
- This reduces visual clutter when viewing the map at a distance
- Updated in `MapScreen.tsx`:
  ```tsx
  const [currentZoom, setCurrentZoom] = useState<number>(9); // Default zoom level
  
  // Zoom level threshold for showing POI labels
  const POI_LABEL_ZOOM_THRESHOLD = 12; // Only show labels when zoomed in more than this
  
  // In the MapboxGL.MapView component:
  onRegionDidChange={(region) => {
    // Update current zoom level when region changes
    if (region.properties.zoomLevel) {
      setCurrentZoom(region.properties.zoomLevel);
    }
  }}
  
  // In the POI marker rendering:
  {poi.name && currentZoom >= POI_LABEL_ZOOM_THRESHOLD && (
    <RNText style={styles.markerLabel}>
      {poi.name}
    </RNText>
  )}
  ```

### 6. Added Map Centering on POI Selection with Smooth Transitions

- When a POI is clicked, the map now centers on that POI
- The zoom level is increased if needed to ensure good visibility
- The camera animation provides a smooth transition
- Updated in `MapScreen.tsx`:
  ```tsx
  <TouchableOpacity 
    style={styles.markerContainer}
    onPress={() => {
      // Set the selected POI
      setSelectedPOI(poi);
      
      // Center the map on the POI using the camera
      if (cameraRef.current) {
        // Set the camera to center on the POI with appropriate zoom
        cameraRef.current.setCamera({
          centerCoordinate: ensureCorrectCoordinateOrder(poi.coordinates),
          zoomLevel: Math.max(currentZoom, 13), // Ensure we're zoomed in enough
          animationDuration: 500,
        });
      }
    }}
  >
  ```

### 7. Improved Camera Transition When Closing POI Details

- Added a smoother, slower transition when closing the POI details drawer
- Uses fitBounds with a longer animation duration (1.5 seconds) for a more gradual zoom out
- Small delay before clearing the selected POI to allow animation to start
- Updated in `MapScreen.tsx`:
  ```tsx
  <POIDetailsDrawer 
    poi={selectedPOI} 
    onClose={() => {
      // When closing the drawer, smoothly transition the camera back
      if (selectedPOI && cameraRef.current && mapDetails?.boundingBox) {
        // Get the bounding box for a smoother transition back to the overall view
        const correctedBoundingBox = ensureCorrectBoundingBox(mapDetails.boundingBox);
        
        // Use a longer animation duration for a smoother transition
        cameraRef.current.fitBounds(
          correctedBoundingBox[0],
          correctedBoundingBox[1],
          100, // padding
          1500 // Longer animation duration (1.5 seconds) for smoother transition
        );
        
        // Small delay before clearing the selected POI to allow animation to start
        setTimeout(() => {
          setSelectedPOI(null);
        }, 100);
      } else {
        setSelectedPOI(null);
      }
    }} 
  />
  ```

## Benefits of These Updates

1. **Improved Visual Clarity**: Reduced padding and updated colors make POI markers more distinct and visually appealing
2. **Better Category Differentiation**: The new color scheme makes it easier to distinguish between different types of POIs
3. **Enhanced User Experience**: The POI details drawer provides contextual information without leaving the map view
4. **Reduced Visual Clutter**: Conditional labels ensure the map remains clean and readable at all zoom levels
5. **Improved Navigation**: Automatic centering on selected POIs makes it easier to focus on points of interest
6. **Smoother Transitions**: Gradual camera animations when opening and closing POI details create a more polished user experience

These changes enhance the map's visual appeal with more distinct colors for different POI types and improve the user experience by providing detailed information about points of interest when selected.
