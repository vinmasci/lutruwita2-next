import React, { useState } from 'react';
import { 
  Typography, Box, Button, Grid, Chip, TextField,
  Card, CardContent, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { styled } from '@mui/material/styles';

// Use the same styled card as RouteCard for consistency
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

// Smaller chips for the filter options
const FilterChip = styled(Chip)({
  height: '18px',
  fontSize: '0.6rem',
  margin: '2px'
});

// Navigation chips for filter categories
const CategoryChip = styled(Chip)(({ theme, active }) => ({
  height: '24px',
  fontSize: '0.7rem',
  margin: '2px',
  fontWeight: active ? 'bold' : 'normal',
  backgroundColor: 'transparent',
  color: active ? theme.palette.info.main : theme.palette.text.primary,
  border: `1px solid ${active ? theme.palette.info.main : 'rgba(255, 255, 255, 0.23)'}`,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  }
}));

// Distance filter options
const DISTANCE_OPTIONS = [
  { label: 'Any', value: 'any' },
  { label: '<50km', value: 'under50' },
  { label: '50-100km', value: '50to100' },
  { label: '100-200km', value: '100to200' },
  { label: '200-500km', value: '200to500' },
  { label: '500km+', value: 'over500' }
];

// Route type options (loop or point-to-point)
const ROUTE_TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Loop', value: 'loop' },
  { label: 'Point to point', value: 'point' }
];

export const FilterCard = ({
  searchTerm, setSearchTerm,
  selectedState, setSelectedState,
  selectedRegion, setSelectedRegion,
  selectedMapTypes, setSelectedMapTypes,
  surfaceType, setSurfaceType,
  distanceFilter, setDistanceFilter,
  routeTypeFilter, setRouteTypeFilter,
  availableStates,
  availableRegions,
  availableMapTypes,
  handleMapTypeToggle
}) => {
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedState('');
    setSelectedRegion('');
    setSelectedMapTypes([]);
    setSurfaceType('all');
    setDistanceFilter('any');
    setRouteTypeFilter('all');
  };

  // Track which filter category is active
  const [activeCategory, setActiveCategory] = useState('state');

  // Filter categories
  const categories = [
    { id: 'state', label: 'State' },
    { id: 'region', label: 'Region', disabled: !selectedState },
    { id: 'mapType', label: 'Map Type' },
    { id: 'surface', label: 'Surface' },
    { id: 'distance', label: 'Distance' },
    { id: 'routeType', label: 'Route Type' }
  ];

  return (
    <StyledCard>
      <CardContent sx={{ padding: '12px 8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <FilterListIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1rem' }} />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Montserrat', fontWeight: 'bold', fontSize: '0.95rem' }}>
            Filter Routes
          </Typography>
        </Box>
        
        {/* Search input */}
        <TextField
          placeholder="Search routes..."
          variant="outlined"
          size="small"
          fullWidth
          sx={{ mb: 1, '& .MuiOutlinedInput-root': { height: '32px', fontSize: '0.8rem' } }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />,
          }}
        />
        
        {/* Category navigation chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {categories.map(category => (
            <CategoryChip
              key={category.id}
              label={category.label}
              active={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              disabled={category.disabled}
              variant="outlined"
            />
          ))}
        </Box>
        
        <Divider sx={{ mb: 1 }} />
        
        {/* Filter content based on active category */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {/* State filter */}
          {activeCategory === 'state' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              <FilterChip
                key="all-states"
                label="All States"
                size="small"
                sx={{ 
                  bgcolor: selectedState === "" ? "#2196f3" : "default",
                  color: selectedState === "" ? "white" : "inherit"
                }}
                clickable
                onClick={() => {
                  setSelectedState("");
                  setSelectedRegion("");
                }}
              />
              {availableStates.map(state => (
                <FilterChip
                  key={state}
                  label={state}
                  size="small"
                  sx={{ 
                    bgcolor: selectedState === state ? "#2196f3" : "default",
                    color: selectedState === state ? "white" : "inherit"
                  }}
                  clickable
                  onClick={() => {
                    setSelectedState(state);
                    setSelectedRegion("");
                    // Auto-switch to region category when a state is selected
                    setActiveCategory('region');
                  }}
                />
              ))}
            </Box>
          )}
          
          {/* Region filter */}
          {activeCategory === 'region' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              <FilterChip
                key="all-regions"
                label="All Regions"
                size="small"
                sx={{ 
                  bgcolor: selectedRegion === "" ? "#2196f3" : "default",
                  color: selectedRegion === "" ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSelectedRegion("")}
                disabled={!selectedState}
              />
              {availableRegions.map(region => (
                <FilterChip
                  key={region}
                  label={region}
                  size="small"
                  sx={{ 
                    bgcolor: selectedRegion === region ? "#2196f3" : "default",
                    color: selectedRegion === region ? "white" : "inherit"
                  }}
                  clickable
                  onClick={() => setSelectedRegion(region)}
                  disabled={!selectedState}
                />
              ))}
            </Box>
          )}
          
          {/* Map type filter */}
          {activeCategory === 'mapType' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              <FilterChip
                key="all-types"
                label="All Types"
                size="small"
                sx={{ 
                  bgcolor: selectedMapTypes.length === 0 ? "#2196f3" : "default",
                  color: selectedMapTypes.length === 0 ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSelectedMapTypes([])}
              />
              {availableMapTypes.map(type => (
                <FilterChip
                  key={type}
                  label={type}
                  size="small"
                  sx={{ 
                    bgcolor: selectedMapTypes.includes(type) ? "#2196f3" : "default",
                    color: selectedMapTypes.includes(type) ? "white" : "inherit"
                  }}
                  clickable
                  onClick={() => handleMapTypeToggle(type)}
                />
              ))}
            </Box>
          )}
          
          {/* Surface type filter */}
          {activeCategory === 'surface' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              <FilterChip
                key="all-surfaces"
                label="All"
                size="small"
                sx={{ 
                  bgcolor: surfaceType === "all" ? "#2196f3" : "default",
                  color: surfaceType === "all" ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSurfaceType("all")}
              />
              <FilterChip
                key="road"
                label="Paved"
                size="small"
                sx={{ 
                  bgcolor: surfaceType === "road" ? "#2196f3" : "default",
                  color: surfaceType === "road" ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSurfaceType("road")}
              />
              <FilterChip
                key="mixed"
                label="Mixed"
                size="small"
                sx={{ 
                  bgcolor: surfaceType === "mixed" ? "#2196f3" : "default",
                  color: surfaceType === "mixed" ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSurfaceType("mixed")}
              />
              <FilterChip
                key="unpaved"
                label="Unpaved"
                size="small"
                sx={{ 
                  bgcolor: surfaceType === "unpaved" ? "#2196f3" : "default",
                  color: surfaceType === "unpaved" ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSurfaceType("unpaved")}
              />
            </Box>
          )}
          
          {/* Distance filter */}
          {activeCategory === 'distance' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              {DISTANCE_OPTIONS.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  size="small"
                  sx={{ 
                    bgcolor: distanceFilter === option.value ? "#2196f3" : "default",
                    color: distanceFilter === option.value ? "white" : "inherit"
                  }}
                  clickable
                  onClick={() => setDistanceFilter(option.value)}
                />
              ))}
            </Box>
          )}
          
          {/* Route type filter */}
          {activeCategory === 'routeType' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              {ROUTE_TYPES.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  size="small"
                  sx={{ 
                    bgcolor: routeTypeFilter === option.value ? "#2196f3" : "default",
                    color: routeTypeFilter === option.value ? "white" : "inherit"
                  }}
                  clickable
                  onClick={() => setRouteTypeFilter(option.value)}
                />
              ))}
            </Box>
          )}
        </Box>
        
        {/* Reset filters button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 'auto', pt: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={resetFilters}
            sx={{ fontSize: '0.7rem', py: 0.5 }}
          >
            Reset Filters
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
};
