import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { 
  Modal, 
  Portal, 
  Text, 
  Button, 
  RadioButton, 
  Divider,
  Chip,
  useTheme,
  SegmentedButtons
} from 'react-native-paper';
import { AvailableFilters } from '../../hooks/useDynamicRouteFilters';

interface FilterModalProps {
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
 * Modal for filtering routes based on various criteria
 */
const FilterModal: React.FC<FilterModalProps> = ({ 
  visible, 
  onDismiss, 
  filters,
  resetFilters
}) => {
  const theme = useTheme();
  const { availableFilters } = filters;
  
  // Local state for filter values (to apply only when "Apply" is pressed)
  const [localState, setLocalState] = useState(filters.selectedState);
  const [localRegion, setLocalRegion] = useState(filters.selectedRegion);
  const [localSurfaceType, setLocalSurfaceType] = useState(filters.surfaceType);
  const [localDistanceFilter, setLocalDistanceFilter] = useState(filters.distanceFilter);
  const [localRouteTypeFilter, setLocalRouteTypeFilter] = useState(filters.routeTypeFilter);
  
  // Reset local state when modal is opened
  React.useEffect(() => {
    if (visible) {
      setLocalState(filters.selectedState);
      setLocalRegion(filters.selectedRegion);
      setLocalSurfaceType(filters.surfaceType);
      setLocalDistanceFilter(filters.distanceFilter);
      setLocalRouteTypeFilter(filters.routeTypeFilter);
    }
  }, [visible, filters]);
  
  // Apply filters and close modal
  const handleApply = () => {
    filters.setSelectedState(localState);
    filters.setSelectedRegion(localRegion);
    filters.setSurfaceType(localSurfaceType);
    filters.setDistanceFilter(localDistanceFilter);
    filters.setRouteTypeFilter(localRouteTypeFilter);
    onDismiss();
  };
  
  // Reset filters and close modal
  const handleReset = () => {
    resetFilters();
    onDismiss();
  };
  
  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }
        ]}
      >
        <Text style={styles.modalTitle}>Filter Routes</Text>
        
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
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
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
    marginTop: 16,
  },
  resetButton: {
    marginRight: 8,
  },
  applyButton: {
    minWidth: 100,
  },
});

export default FilterModal;
