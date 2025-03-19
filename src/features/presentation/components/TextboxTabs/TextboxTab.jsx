import React from 'react';
import { Typography, Box } from '@mui/material';
import { Tab } from './TextboxTabsDrawer.styles';
import { TabPointerDirections, TabColors } from '../../context/TextboxTabsContext';
import { TEXTBOX_ICON_PATHS } from './textbox-icon-paths';

// Component to display a textbox tab with a pointer
const TextboxTab = ({ 
  text, 
  icon, 
  pointerDirection = TabPointerDirections.RIGHT, 
  backgroundColor = TabColors.DEFAULT,
  onClick
}) => {
  // Get the icon class if it exists
  const iconClass = icon ? TEXTBOX_ICON_PATHS[icon] : null;
  const iconColor = backgroundColor === TabColors.WHITE ? 'black' : 'white';

  return (
    <Tab 
      pointerDirection={pointerDirection} 
      backgroundColor={backgroundColor}
      onClick={onClick}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {iconClass && (
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
          <i className={iconClass} style={{ fontSize: '16px', color: iconColor }} />
        </Box>
      )}
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9em' }}>
        {text}
      </Typography>
    </Tab>
  );
};

export default TextboxTab;
