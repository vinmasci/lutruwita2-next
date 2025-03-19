import React, { useState, useEffect } from 'react';
import { Drawer, Box } from '@mui/material';
import { StyledDrawer } from './TextboxTabsDrawer.styles';
import { useTextboxTabs } from '../../context/TextboxTabsContext.jsx';
import TextboxTabsCreator from './TextboxTabsCreator.jsx';

// Main drawer component for textbox tabs
const TextboxTabsDrawer = ({ isOpen, onClose }) => {
  const { 
    isDrawerOpen, 
    closeDrawer, 
    addTab, 
    startDragging
  } = useTextboxTabs();
  
  // Use either the prop or the context value for controlling the drawer
  // This allows the drawer to be controlled from outside (like other drawers)
  // while maintaining backward compatibility with the context
  const drawerOpen = isOpen !== undefined ? isOpen : isDrawerOpen;
  
  // Handle drawer close from either prop or context
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeDrawer();
    }
  };

  const handleSaveNew = (tabData) => {
    // Add the tab
    const tabId = addTab(tabData);
    
    // Get the tab object with the new ID
    const newTab = {
      ...tabData,
      id: tabId
    };
    
    // Immediately start dragging the new tab
    setTimeout(() => {
      startDragging(newTab);
    }, 100);
    
    // Close the drawer
    handleClose();
  };

  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={handleClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: '264px',
          border: 'none',
          backgroundColor: 'transparent',
          overflowY: 'auto',
          height: '100%',
          top: '64px', // Position below the header
          height: 'calc(100% - 64px)', // Adjust height to account for header
          marginLeft: '56px', // Account for the sidebar width
          paddingTop: '0px' // Remove any top padding
        }
      }}
    >
      <StyledDrawer>
        <TextboxTabsCreator 
          onSave={handleSaveNew} 
          onBack={handleClose} 
        />
      </StyledDrawer>
    </Drawer>
  );
};

export default TextboxTabsDrawer;
