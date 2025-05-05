import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Searchbar, 
  useTheme as usePaperTheme,
  ActivityIndicator,
  IconButton,
  Button,
  Dialog,
  Portal
} from 'react-native-paper';
import { useTheme } from '../theme';
import { useSavedRoutes } from '../context/FirebaseSavedRoutesContext';
import { useDynamicRouteFilters } from '../hooks/useDynamicRouteFilters';
import MapTypeSelector from '../components/filters/MapTypeSelector';
import FilterModal from '../components/filters/FilterModal';
import SavedRouteCard from '../components/routes/SavedRouteCard';

const SavedRoutesScreen = ({ navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { savedRoutes, isLoading, error, refreshSavedRoutes, clearSavedRoutes } = useSavedRoutes();
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  
  // Use the dynamic route filters hook with saved routes
  const {
    selectedMapType,
    setSelectedMapType,
    searchTerm,
    setSearchTerm,
    selectedState,
    setSelectedState,
    selectedRegion,
    setSelectedRegion,
    surfaceType,
    setSurfaceType,
    distanceFilter,
    setDistanceFilter,
    routeTypeFilter,
    setRouteTypeFilter,
    availableFilters,
    availableStates,
    availableRegions,
    availableMapTypes,
    displayedRoutes,
    hasMore,
    loadMoreRoutes,
    getActiveFilterCount
  } = useDynamicRouteFilters(savedRoutes);
  
  // This screen is specifically for saved routes, so we don't need to set showingSavedRoutes
  // The filtering is now handled directly by passing the savedRoutes to the useDynamicRouteFilters hook
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[SavedRoutesScreen] Refreshing saved routes');
      await refreshSavedRoutes();
      console.log('[SavedRoutesScreen] Refresh complete');
    } catch (error) {
      console.error('[SavedRoutesScreen] Error refreshing saved routes:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Force refresh when savedRoutes changes to empty
  useEffect(() => {
    if (savedRoutes.length === 0 && !isLoading) {
      console.log('[SavedRoutesScreen] No saved routes detected, ensuring UI is updated');
      // This will ensure the empty state is shown
      onRefresh();
    }
  }, [savedRoutes.length]);
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedState('');
    setSelectedRegion('');
    setSurfaceType('all');
    setDistanceFilter('any');
    setRouteTypeFilter('all');
  };
  
  // Navigate to map screen
  const handleRoutePress = (routeId: string) => {
    navigation.navigate('Map', { mapId: routeId });
  };
  
  // Render route card
  const renderRouteCard = ({ item }: { item: any }) => (
    <SavedRouteCard 
      route={item}
      onPress={handleRoutePress}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.headerContainer}>
        <Text 
          style={[
            styles.title, 
            { color: paperTheme.colors.onBackground }
          ]}
        >
          Saved Routes
        </Text>
        {savedRoutes.length > 0 && (
          <Button 
            mode="outlined" 
            onPress={() => setClearDialogVisible(true)}
            icon="delete"
            textColor={paperTheme.colors.error}
            style={styles.clearButton}
          >
            Clear All
          </Button>
        )}
      </View>
      
      {/* Map Type Selector */}
      <MapTypeSelector
        selectedType={selectedMapType}
        availableMapTypes={availableMapTypes}
        onTypeChange={setSelectedMapType}
      />
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search saved routes..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
          iconColor={paperTheme.colors.primary}
        />
        <View style={styles.filterButtonContainer}>
          {getActiveFilterCount() > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
          <IconButton
            icon="filter"
            size={24}
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterButton}
            iconColor={paperTheme.colors.primary}
            containerColor={paperTheme.colors.surfaceVariant}
          />
        </View>
      </View>
      
      {/* Route List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ marginTop: 16 }}>Loading saved routes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={{ color: paperTheme.colors.error }}>
            {error}
          </Text>
          <Text style={{ marginTop: 8 }}>
            Please try again later.
          </Text>
        </View>
      ) : savedRoutes.length === 0 || displayedRoutes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No saved routes found</Text>
          <Text style={styles.emptySubtext}>
            Routes you save will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedRoutes}
          renderItem={renderRouteCard}
          keyExtractor={item => item.persistentId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[paperTheme.colors.primary]}
            />
          }
          onEndReached={hasMore ? loadMoreRoutes : undefined}
          onEndReachedThreshold={0.5}
        />
      )}
      
      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        filters={{
          selectedState,
          setSelectedState,
          selectedRegion,
          setSelectedRegion,
          surfaceType,
          setSurfaceType,
          distanceFilter,
          setDistanceFilter,
          routeTypeFilter,
          setRouteTypeFilter,
          availableStates,
          availableRegions,
          availableFilters,
        }}
        resetFilters={resetFilters}
      />
      
      {/* Clear Confirmation Dialog */}
      <Portal>
        <Dialog visible={clearDialogVisible} onDismiss={() => setClearDialogVisible(false)}>
          <Dialog.Title>Clear All Saved Routes</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to clear all saved routes? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={async () => {
                setClearDialogVisible(false);
                try {
                  await clearSavedRoutes();
                  console.log('[SavedRoutesScreen] Successfully cleared all saved routes');
                } catch (error) {
                  console.error('[SavedRoutesScreen] Error clearing saved routes:', error);
                }
              }}
              textColor={paperTheme.colors.error}
            >
              Clear All
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
  },
  clearButton: {
    marginTop: 40,
    borderColor: '#ee5253',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    elevation: 0,
    borderRadius: 8,
  },
  filterButtonContainer: {
    marginLeft: 8,
    position: 'relative',
  },
  filterButton: {
    margin: 0,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ee5253',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default SavedRoutesScreen;
