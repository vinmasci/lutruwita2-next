import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Searchbar, 
  useTheme as usePaperTheme,
  ActivityIndicator,
  IconButton
} from 'react-native-paper';
import { useTheme } from '../theme';
import { useRoute } from '../context/RouteContext';
import { useDynamicRouteFilters } from '../hooks/useDynamicRouteFilters';
import MapTypeSelector from '../components/filters/MapTypeSelector';
import FilterModal from '../components/filters/FilterModal';
import RouteCard from '../components/routes/RouteCard';

const HomeScreen = ({ navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { routeState, loadRoutes } = useRoute();
  
  // Use the dynamic route filters hook
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
    showingSavedRoutes,
    setShowingSavedRoutes,
    availableFilters,
    availableStates,
    availableRegions,
    availableMapTypes,
    displayedRoutes,
    hasMore,
    loadMoreRoutes,
    getActiveFilterCount
  } = useDynamicRouteFilters(routeState.routes);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRoutes();
    } catch (error) {
      console.error('Error refreshing routes:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
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
  
  // Ensure saved routes is always false in Home screen
  useEffect(() => {
    setShowingSavedRoutes(false);
  }, [setShowingSavedRoutes]);
  
  // Render route card
  const renderRouteCard = ({ item }: { item: any }) => (
    <RouteCard 
      route={item}
      onPress={handleRoutePress}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text 
        style={[
          styles.title, 
          { color: paperTheme.colors.onBackground }
        ]}
      >
        Discover Maps
      </Text>
      
      {/* Map Type Selector */}
      <MapTypeSelector
        selectedType={selectedMapType}
        availableMapTypes={availableMapTypes}
        onTypeChange={setSelectedMapType}
      />
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search maps..."
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
      {routeState.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ marginTop: 16 }}>Loading maps...</Text>
        </View>
      ) : routeState.error ? (
        <View style={styles.errorContainer}>
          <Text style={{ color: paperTheme.colors.error }}>
            {routeState.error}
          </Text>
          <Text style={{ marginTop: 8 }}>
            Using mock data instead.
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text>No maps found</Text>
            </View>
          }
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
      
      {/* No FAB needed anymore as we have a dedicated Saved Routes tab */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
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
    paddingBottom: 16, // Reduced padding since we no longer have a FAB
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
    padding: 32,
    alignItems: 'center',
  },
});

export default HomeScreen;
