import React from 'react';
import { 
  Typography, Box, Button, Grid, Chip, TextField,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { styled } from '@mui/material/styles';

// Filter section styling
const FilterPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  borderRadius: '8px',
}));

// Distance filter options
const DISTANCE_OPTIONS = [
  { label: 'Any distance', value: 'any' },
  { label: '<50km', value: 'under50' },
  { label: '50-100km', value: '50to100' },
  { label: '100-200km', value: '100to200' },
  { label: '200-500km', value: '200to500' },
  { label: '500km+', value: 'over500' }
];

// Route type options (loop or point-to-point)
const ROUTE_TYPES = [
  { label: 'All routes', value: 'all' },
  { label: 'Loop', value: 'loop' },
  { label: 'Point-to-point', value: 'point' }
];

export const RouteFilters = ({ 
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

  return (
    <FilterPaper elevation={3} sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FilterListIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
        <Typography variant="subtitle1" sx={{ fontFamily: 'Montserrat' }}>Filter Routes</Typography>
      </Box>
      
      {/* Search input */}
      <TextField
        placeholder="Search routes..."
        variant="outlined"
        size="small"
        fullWidth
        sx={{ mb: 1.5 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />,
        }}
      />
      
      {/* Grid layout for filters */}
      <Grid container spacing={1}>
        {/* State filter - 6 columns */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>State</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            <Chip
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
            {/* Dynamically generate state chips from available states */}
            {availableStates.map(state => (
              <Chip
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
                }}
              />
            ))}
          </Box>
        </Grid>
        
        {/* Region filter - 6 columns (always shown) */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Region (LGA)</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            <Chip
              key="all-regions"
              label="All Regions"
              size="small"
              sx={{ 
                height: '20px', 
                fontSize: '0.65rem',
                bgcolor: selectedRegion === "" ? "#2196f3" : "default",
                color: selectedRegion === "" ? "white" : "inherit"
              }}
              clickable
              onClick={() => setSelectedRegion("")}
              disabled={!selectedState}
            />
            {/* Dynamically generate region chips from available regions */}
            {availableRegions.map(region => (
              <Chip
                key={region}
                label={region}
                size="small"
                sx={{ 
                  height: '20px', 
                  fontSize: '0.65rem',
                  bgcolor: selectedRegion === region ? "#2196f3" : "default",
                  color: selectedRegion === region ? "white" : "inherit"
                }}
                clickable
                onClick={() => setSelectedRegion(region)}
                disabled={!selectedState}
              />
            ))}
          </Box>
        </Grid>
        
        {/* Map type filter - 6 columns */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Map Type</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {/* "All Types" chip */}
            <Chip
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
            {/* Dynamically generate map type chips from available map types */}
            {availableMapTypes.map(type => (
              <Chip
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
        </Grid>
        
        {/* Surface type filter - 6 columns */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Surface Type</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            <Chip
              key="all-surfaces"
              label="All Surfaces"
              size="small"
              sx={{ 
                bgcolor: surfaceType === "all" ? "#2196f3" : "default",
                color: surfaceType === "all" ? "white" : "inherit"
              }}
              clickable
              onClick={() => setSurfaceType("all")}
            />
            <Chip
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
            <Chip
              key="mixed"
              label="Mixed Terrain"
              size="small"
              sx={{ 
                bgcolor: surfaceType === "mixed" ? "#2196f3" : "default",
                color: surfaceType === "mixed" ? "white" : "inherit"
              }}
              clickable
              onClick={() => setSurfaceType("mixed")}
            />
            <Chip
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
        </Grid>
        
        {/* Distance filter - 6 columns */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Distance</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {DISTANCE_OPTIONS.map(option => (
              <Chip
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
        </Grid>
        
        {/* Route type filter - 6 columns */}
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Route Type</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {ROUTE_TYPES.map(option => (
              <Chip
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
        </Grid>
      </Grid>
      
      {/* Reset filters button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={resetFilters}
        >
          Reset Filters
        </Button>
      </Box>
    </FilterPaper>
  );
};
