import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
  height: '24px',
  fontSize: '0.7rem',
  margin: '3px'
});

// Navigation chips for filter categories
const CategoryChip = styled(Chip)(({ theme, active }) => ({
  height: '28px',
  fontSize: '0.75rem',
  margin: '3px',
  fontWeight: active ? 'bold' : 'normal',
  backgroundColor: active ? theme.palette.info.main : 'transparent',
  color: active ? 'white' : theme.palette.text.primary,
  border: active ? 'none' : `1px solid rgba(255, 255, 255, 0.23)`,
  '&:hover': {
    backgroundColor: active ? theme.palette.info.main : 'rgba(255, 255, 255, 0.05)',
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

const EnhancedFilterCard = ({
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

  return _jsx(StyledCard, {
    children: _jsxs(CardContent, {
      sx: { 
        padding: '16px', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      },
      children: [
        _jsxs(Box, {
          sx: { display: 'flex', alignItems: 'center', mb: 2 },
          children: [
            _jsx(FilterListIcon, { sx: { mr: 1, color: 'primary.main', fontSize: '1.2rem' } }),
            _jsx(Typography, {
              variant: "h6",
              sx: { fontFamily: 'Montserrat', fontWeight: 'bold', fontSize: '1.1rem' },
              children: "Filter Routes"
            })
          ]
        }),
        
        // Search input
        _jsx(TextField, {
          placeholder: "Search routes...",
          variant: "outlined",
          size: "small",
          fullWidth: true,
          sx: { mb: 2, '& .MuiOutlinedInput-root': { height: '40px', fontSize: '0.9rem' } },
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          InputProps: {
            startAdornment: _jsx(SearchIcon, { sx: { mr: 0.5, color: 'text.secondary', fontSize: '1.2rem' } }),
          }
        }),
        
        // Category navigation chips
        _jsx(Box, {
          sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 },
          children: categories.map(category => _jsx(CategoryChip, {
            label: category.label,
            active: activeCategory === category.id,
            onClick: () => setActiveCategory(category.id),
            disabled: category.disabled
          }, category.id))
        }),
        
        _jsx(Divider, { sx: { mb: 2 } }),
        
        // Filter content based on active category
        _jsxs(Box, {
          sx: { overflowY: 'auto', flex: 1, mb: 2 },
          children: [
            // State filter
            activeCategory === 'state' && _jsxs(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: [
                _jsx(FilterChip, {
                  label: "All States",
                  size: "small",
                  sx: { 
                    bgcolor: selectedState === "" ? "#2196f3" : "default",
                    color: selectedState === "" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => {
                    setSelectedState("");
                    setSelectedRegion("");
                  }
                }, "all-states"),
                availableStates.map(state => _jsx(FilterChip, {
                  label: state,
                  size: "small",
                  sx: { 
                    bgcolor: selectedState === state ? "#2196f3" : "default",
                    color: selectedState === state ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => {
                    setSelectedState(state);
                    setSelectedRegion("");
                    // Auto-switch to region category when a state is selected
                    setActiveCategory('region');
                  }
                }, state))
              ]
            }),
            
            // Region filter
            activeCategory === 'region' && _jsxs(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: [
                _jsx(FilterChip, {
                  label: "All Regions",
                  size: "small",
                  sx: { 
                    bgcolor: selectedRegion === "" ? "#2196f3" : "default",
                    color: selectedRegion === "" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSelectedRegion(""),
                  disabled: !selectedState
                }, "all-regions"),
                availableRegions.map(region => _jsx(FilterChip, {
                  label: region,
                  size: "small",
                  sx: { 
                    bgcolor: selectedRegion === region ? "#2196f3" : "default",
                    color: selectedRegion === region ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSelectedRegion(region),
                  disabled: !selectedState
                }, region))
              ]
            }),
            
            // Map type filter
            activeCategory === 'mapType' && _jsxs(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: [
                _jsx(FilterChip, {
                  label: "All Types",
                  size: "small",
                  sx: { 
                    bgcolor: selectedMapTypes.length === 0 ? "#2196f3" : "default",
                    color: selectedMapTypes.length === 0 ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSelectedMapTypes([])
                }, "all-types"),
                availableMapTypes.map(type => _jsx(FilterChip, {
                  label: type,
                  size: "small",
                  sx: { 
                    bgcolor: selectedMapTypes.includes(type) ? "#2196f3" : "default",
                    color: selectedMapTypes.includes(type) ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => handleMapTypeToggle(type)
                }, type))
              ]
            }),
            
            // Surface type filter
            activeCategory === 'surface' && _jsxs(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: [
                _jsx(FilterChip, {
                  label: "All",
                  size: "small",
                  sx: { 
                    bgcolor: surfaceType === "all" ? "#2196f3" : "default",
                    color: surfaceType === "all" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSurfaceType("all")
                }, "all-surfaces"),
                _jsx(FilterChip, {
                  label: "Paved",
                  size: "small",
                  sx: { 
                    bgcolor: surfaceType === "road" ? "#2196f3" : "default",
                    color: surfaceType === "road" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSurfaceType("road")
                }, "road"),
                _jsx(FilterChip, {
                  label: "Mixed",
                  size: "small",
                  sx: { 
                    bgcolor: surfaceType === "mixed" ? "#2196f3" : "default",
                    color: surfaceType === "mixed" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSurfaceType("mixed")
                }, "mixed"),
                _jsx(FilterChip, {
                  label: "Unpaved",
                  size: "small",
                  sx: { 
                    bgcolor: surfaceType === "unpaved" ? "#2196f3" : "default",
                    color: surfaceType === "unpaved" ? "white" : "inherit"
                  },
                  clickable: true,
                  onClick: () => setSurfaceType("unpaved")
                }, "unpaved")
              ]
            }),
            
            // Distance filter
            activeCategory === 'distance' && _jsx(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: DISTANCE_OPTIONS.map(option => _jsx(FilterChip, {
                label: option.label,
                size: "small",
                sx: { 
                  bgcolor: distanceFilter === option.value ? "#2196f3" : "default",
                  color: distanceFilter === option.value ? "white" : "inherit"
                },
                clickable: true,
                onClick: () => setDistanceFilter(option.value)
              }, option.value))
            }),
            
            // Route type filter
            activeCategory === 'routeType' && _jsx(Box, {
              sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 },
              children: ROUTE_TYPES.map(option => _jsx(FilterChip, {
                label: option.label,
                size: "small",
                sx: { 
                  bgcolor: routeTypeFilter === option.value ? "#2196f3" : "default",
                  color: routeTypeFilter === option.value ? "white" : "inherit"
                },
                clickable: true,
                onClick: () => setRouteTypeFilter(option.value)
              }, option.value))
            })
          ]
        }),
        
        // Reset filters button
        _jsx(Box, {
          sx: { display: 'flex', justifyContent: 'center', mt: 'auto' },
          children: _jsx(Button, {
            variant: "outlined",
            size: "medium",
            onClick: resetFilters,
            sx: { fontSize: '0.8rem', py: 1, px: 3 },
            children: "Reset Filters"
          })
        })
      ]
    })
  });
};

export default EnhancedFilterCard;
