import React, { useState } from 'react';
import { Typography, Box, TextField, InputAdornment } from '@mui/material';
import { IconGrid, StyledIconButton } from './TextboxTabsDrawer.styles';
import SearchIcon from '@mui/icons-material/Search';
import { TEXTBOX_ICON_PATHS } from './textbox-icon-paths';

// Define icon categories based on naming patterns
const getCategoryFromIconName = (iconName) => {
  // Building icons
  if (iconName.includes('Building') || iconName.includes('House') || 
      iconName === 'Church' || iconName === 'Mosque' || iconName === 'Synagogue' || 
      iconName === 'University' || iconName === 'School' || iconName === 'Warehouse' || 
      iconName === 'Industry' || iconName === 'Shop' || iconName === 'Store' || 
      iconName === 'Igloo' || iconName.includes('Landmark')) {
    return 'building';
  }
  
  // Camping icons
  if (iconName === 'Campground' || iconName === 'Tent' || iconName === 'Tents' || 
      iconName.includes('Fire') || iconName === 'Backpack' || iconName.includes('Person') || 
      iconName === 'MountainSun' || iconName.includes('Sunrise') || iconName.includes('Sunset') || 
      iconName.includes('Water') || iconName === 'Faucet' || iconName === 'FaucetDrip' || 
      iconName === 'Shovel' || iconName === 'Trailer' || iconName.includes('Tree') || 
      iconName === 'Seedling' || iconName === 'Leaf' || iconName === 'Acorn') {
    return 'camping';
  }
  
  // Map icons
  if (iconName.includes('Location') || iconName.includes('Map') || 
      iconName.includes('Globe') || iconName.includes('Earth') || 
      iconName === 'Mountain' || iconName === 'MountainCity' || 
      iconName.includes('Road') || iconName.includes('Bridge') || 
      iconName === 'Volcano' || iconName === 'Compass' || 
      iconName === 'CompassDrafting' || iconName === 'Crosshairs' || 
      iconName === 'Directions' || iconName === 'Signs' || 
      iconName === 'StreetView' || iconName === 'Route') {
    return 'map';
  }
  
  // Travel and Hotel icons
  if (iconName === 'Hotel' || iconName === 'Bed' || iconName === 'BedDouble' || 
      iconName === 'BedSingle' || iconName === 'Concierge' || iconName === 'Luggage' || 
      iconName === 'Passport' || iconName.includes('Plane') || iconName === 'Suitcase' || 
      iconName === 'SuitcaseRolling' || iconName === 'Taxi' || iconName === 'Train' || 
      iconName.includes('Train') || iconName === 'Bus' || iconName === 'BusSimple' || 
      iconName === 'VanShuttle' || iconName === 'Car' || iconName.includes('Car') || 
      iconName === 'Ship' || iconName === 'Ferry' || iconName === 'Umbrella' || 
      iconName === 'UmbrellaBeach' || iconName === 'Utensils' || iconName.includes('Martini') || 
      iconName === 'Ticket' || iconName === 'TicketSimple' || iconName === 'Wallet' || 
      iconName === 'Coins' || iconName === 'CreditCard' || iconName === 'Language') {
    return 'travel';
  }
  
  // Shape icons
  if (iconName.includes('Circle') || iconName.includes('Square') || 
      iconName.includes('Triangle') || iconName.includes('Diamond') || 
      iconName.includes('Hexagon') || iconName.includes('Octagon') || 
      iconName === 'Pentagon' || iconName === 'Rhombus' || iconName === 'Star') {
    return 'shape';
  }
  
  // Default to POI category for any remaining icons
  return 'poi';
};

// Create the icons array from TEXTBOX_ICON_PATHS
const ICONS = Object.keys(TEXTBOX_ICON_PATHS).map(iconName => {
  // Determine the category based on the icon name
  const category = getCategoryFromIconName(iconName);
  
  // Create the icon object
  return {
    name: iconName,
    iconClass: TEXTBOX_ICON_PATHS[iconName],
    category: category,
    label: iconName.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to spaces
    description: `${category.charAt(0).toUpperCase() + category.slice(1)} icon`
  };
});

// Component to select the icon
const IconSelector = ({ selectedIcon, onIconSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('shape');

  // Get unique categories
  const categories = [...new Set(ICONS.map(icon => icon.category))];

  // Filter icons based on search term and selected category
  const filteredIcons = ICONS.filter(icon => {
    const matchesSearch = searchTerm === '' || 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (icon.description && icon.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || icon.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Box>
      {/* Search input */}
      <TextField
        fullWidth
        placeholder="Search icons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        margin="normal"
        variant="outlined"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(74, 158, 255, 0.7)',
            },
            color: 'white',
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiInputAdornment-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />

      {/* Category filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box
          onClick={() => setSelectedCategory(null)}
          sx={{
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: selectedCategory === null ? 'rgba(74, 158, 255, 0.2)' : 'rgba(35, 35, 35, 0.9)',
            border: selectedCategory === null ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '0.75rem',
            '&:hover': {
              backgroundColor: selectedCategory === null ? 'rgba(74, 158, 255, 0.3)' : 'rgba(45, 45, 45, 0.95)',
            }
          }}
        >
          All
        </Box>
        {categories.map(category => (
          <Box
            key={category}
            onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            sx={{
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: category === selectedCategory ? 'rgba(74, 158, 255, 0.2)' : 'rgba(35, 35, 35, 0.9)',
              border: category === selectedCategory ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '0.75rem',
              '&:hover': {
                backgroundColor: category === selectedCategory ? 'rgba(74, 158, 255, 0.3)' : 'rgba(45, 45, 45, 0.95)',
              }
            }}
          >
            {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Box>
        ))}
      </Box>

      {/* Icons count */}
      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1, display: 'block' }}>
        Showing {filteredIcons.length} of {ICONS.length} icons
      </Typography>

      {/* Icons grid */}
      <IconGrid>
        {filteredIcons.map((icon) => (
          <StyledIconButton
            key={icon.name}
            selected={selectedIcon === icon.name}
            onClick={() => onIconSelect(icon.name)}
            title={icon.label}
          >
            <i className={icon.iconClass} style={{ fontSize: '18px', color: 'white' }} />
          </StyledIconButton>
        ))}
      </IconGrid>
    </Box>
  );
};

export default IconSelector;
