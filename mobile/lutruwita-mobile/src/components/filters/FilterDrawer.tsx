import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { 
  Text, 
  Button, 
  RadioButton, 
  Divider,
  Chip,
  useTheme,
  SegmentedButtons
} from 'react-native-paper';
import { AvailableFilters } from '../../hooks/useDynamicRouteFilters';
import { X } from 'lucide-react-native';

const { height: screenHeight } = Dimensions.get('window');

interface FilterDrawerProps {
  visible: boolean;
  onDismiss: () => void;
  filters: {
    selectedState: string;
    setSelectedState: (state: string) => void;
    selectedRegion: string;
    setSelectedRegion: (region: string) => void;
    surfaceType: string;
    setSurfaceType: (type: string) => void;
    distanceFilter: string;
    setDistanceFilter: (filter: string) => void;
    routeTypeFilter: string;
    setRouteTypeFilter: (filter: string) => void;
    availableStates: string[];
    availableRegions: string[];
    availableFilters: AvailableFilters;
  };
  resetFilters: () => void;
}

/**
 * Bottom drawer for filtering routes based on various criteria
 */
const FilterDrawer: React.FC<FilterDrawerProps> = ({ 
  visible, 
  onDismiss, 
  filters,
  resetFilters
}) => {
  const theme = useTheme();
  const { availableFilters } = filters;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  
  // Local state for filter values (to apply only when "Apply" is pressed)
  const [localState, setLocalState] = useState(filters.selectedState);
  const [localRegion, setLocalRegion] = useState(filters.selectedRegion);
  const [localSurfaceType, setLocalSurfaceType] = useState(filters.surfaceType);
  const [localDistanceFilter, setLocalDistanceFilter] = useState(filters.distanceFilter);
  const [localRouteTypeFilter, setLocalRouteTypeFilter] = useState(filters.routeTypeFilter);
  
  // Animate drawer in/out when visibility changes
  useEffect(() => {
    if (visible) {
      // Reset local state when drawer is opened
      setLocalState(filters.selectedState);
      setLocalRegion(filters.selectedRegion);
      setLocalSurfaceType(filters.surfaceType);
      setLocalDistanceFilter(filters.distanceFilter);
      setLocalRouteTypeFilter(filters.routeTypeFilter);
      
      // Animate drawer sliding up
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      // Animate drawer sliding down
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, filters]);
  
  // Apply filters and close drawer
  const handleApply = () => {
    filters.setSelectedState(localState);
    filters.setSelectedRegion(localRegion);
    filters.setSurfaceType(localSurfaceType);
    filters.setDistanceFilter(localDistanceFilter);
    filters.setRouteTypeFilter(localRouteTypeFilter);
    onDismiss();
  };
  
  // Reset filters and close drawer
  const handleReset = () => {
    resetFilters();
    onDismiss();
  };
  
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      />
      <Animated.View
        style={[
          styles.drawer,
          { 
            transform: [{ translateY }],
            backgroundColor: theme.colors.background
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.title}>Filter Routes</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onDismiss}
          >
            <X size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView}>
          {/* Location filters - always available */}
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.stateContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip
                mode="outlined"
                selected={localState === ''}
                onPress={() => {
                  setLocalState('');
                  setLocalRegion('');
                }}
                style={styles.stateChip}
              >
                All States
              </Chip>
              {filters.availableStates.map(state => (
                <Chip
                  key={state}
                  mode="outlined"
                  selected={localState === state}
                  onPress={() => {
                    setLocalState(state);
                    setLocalRegion('');
                  }}
                  style={styles.stateChip}
                >
                  {state}
                </Chip>
              ))}
            </ScrollView>
          </View>
          
          {localState && filters.availableRegions.length > 0 && (
            <View style={styles.regionContainer}>
              <Text style={styles.subsectionTitle}>Region</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip
                  mode="outlined"
                  selected={localRegion === ''}
                  onPress={() => setLocalRegion('')}
                  style={styles.regionChip}
                >
                  All Regions
                </Chip>
                {filters.availableRegions.map(region => (
                  <Chip
                    key={region}
                    mode="outlined"
                    selected={localRegion === region}
                    onPress={() => setLocalRegion(region)}
                    style={styles.regionChip}
                  >
                    {region}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Distance filter - conditionally available */}
          {availableFilters.distance && (
            <>
              <Text style={styles.sectionTitle}>Distance</Text>
              <RadioButton.Group 
                onValueChange={value => setLocalDistanceFilter(value)} 
                value={localDistanceFilter}
              >
                <RadioButton.Item label="Any distance" value="any" />
                <RadioButton.Item label="Under 50 km" value="under50" />
                <RadioButton.Item label="50-100 km" value="50to100" />
                <RadioButton.Item label="100-200 km" value="100to200" />
                <RadioButton.Item label="200-500 km" value="200to500" />
                <RadioButton.Item label="Over 500 km" value="over500" />
              </RadioButton.Group>
              
              <Divider style={styles.divider} />
            </>
          )}
          
          {/* Surface type filter - conditionally available */}
          {availableFilters.surface && (
            <>
              <Text style={styles.sectionTitle}>Surface</Text>
              <SegmentedButtons
                value={localSurfaceType}
                onValueChange={setLocalSurfaceType}
                buttons={[
                  { value: 'all', label: 'All' },
                  { value: 'road', label: 'Road' },
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'unpaved', label: 'Unpaved' }
                ]}
                style={styles.segmentedButtons}
              />
              
              <Divider style={styles.divider} />
            </>
          )}
          
          {/* Route type filter - conditionally available */}
          {availableFilters.routeType && (
            <>
              <Text style={styles.sectionTitle}>Route Type</Text>
              <SegmentedButtons
                value={localRouteTypeFilter}
                onValueChange={setLocalRouteTypeFilter}
                buttons={[
                  { value: 'all', label: 'All' },
                  { value: 'loop', label: 'Loop' },
                  { value: 'point', label: 'Point-to-Point' }
                ]}
                style={styles.segmentedButtons}
              />
            </>
          )}
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={handleReset}
            style={styles.resetButton}
          >
            Reset
          </Button>
          <Button 
            mode="contained" 
            onPress={handleApply}
            style={styles.applyButton}
          >
            Apply
          </Button>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30, // Extra padding for bottom safe area
    maxHeight: '80%', // Maximum height of the drawer
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginTop: 8,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    padding: 16,
    maxHeight: screenHeight * 0.6, // Limit scroll view height
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  stateContainer: {
    marginBottom: 16,
  },
  stateChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  regionContainer: {
    marginBottom: 16,
  },
  regionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetButton: {
    marginRight: 8,
  },
  applyButton: {
    minWidth: 100,
  },
});

export default FilterDrawer;
