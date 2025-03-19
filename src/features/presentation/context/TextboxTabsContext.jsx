import React, { createContext, useContext, useState, useCallback } from 'react';
import { useMapContext } from '../../map/context/MapContext';
import { v4 as uuidv4 } from 'uuid';

// Define the shape of a textbox tab
export const TabPointerDirections = {
  TOP: 'top',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  LEFT: 'left',
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left'
};

// Define the colors from POI icons
export const TabColors = {
  DEFAULT: '#1a1a1a',
  ROAD: '#ff6348',
  FOOD: '#ffa801',
  WATER: '#3498db',
  EVENT: '#ef5777',
  HC_CLIMB: '#8B0000',
  CAT1_CLIMB: '#FF0000',
  CAT2_CLIMB: '#fa8231',
  WHITE: '#ffffff',
  CAT4_CLIMB: '#228B22'
};

// Create the context
const TextboxTabsContext = createContext();

// Provider component
export const TextboxTabsProvider = ({ children }) => {
  const [tabs, setTabs] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTab, setDraggedTab] = useState(null);
  const { map } = useMapContext();

  // Add a new tab and return the ID
  const addTab = useCallback((tab) => {
    const newId = uuidv4();
    setTabs(prevTabs => [...prevTabs, { 
      ...tab, 
      id: newId,
      coordinates: tab.coordinates || null,
      content: tab.content || '',
      photos: tab.photos || []
    }]);
    return newId;
  }, []);

  // Remove a tab
  const removeTab = useCallback((tabId) => {
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
  }, []);

  // Update a tab
  const updateTab = useCallback((tabId, updatedTab) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => tab.id === tabId ? { ...tab, ...updatedTab } : tab)
    );
  }, []);

  // Update tab position with improved deep copying and logging
  const updateTabPosition = useCallback((tabId, coordinates) => {
    // Ensure coordinates is a new array to prevent reference issues
    const newCoordinates = Array.isArray(coordinates) ? [...coordinates] : coordinates;
    
    console.log(`[TextboxTabsContext] Updating tab ${tabId} position to:`, newCoordinates);
    
    setTabs(prevTabs => 
      prevTabs.map(tab => {
        if (tab.id === tabId) {
          // Create a completely new tab object with deep-copied coordinates
          const updatedTab = { 
            ...tab, 
            coordinates: [...newCoordinates] // Create another copy to be extra safe
          };
          console.log(`[TextboxTabsContext] Tab ${tabId} updated:`, updatedTab);
          return updatedTab;
        }
        return tab;
      })
    );
  }, []);

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Open drawer
  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  // Start dragging a tab
  const startDragging = useCallback((tab) => {
    setIsDragging(true);
    setDraggedTab(tab);
  }, []);

  // Stop dragging and clear any selection state
  const stopDragging = useCallback(() => {
    setIsDragging(false);
    setDraggedTab(null);
  }, []);

  // Place a tab on the map with improved coordinate handling
  const placeTabOnMap = useCallback((tabId, coordinates) => {
    // Create a deep copy of the coordinates to prevent reference issues
    const newCoordinates = [...coordinates];
    
    console.log(`[TextboxTabsContext] Placing tab ${tabId} on map at:`, newCoordinates);
    
    // Use updateTabPosition to ensure consistent handling
    updateTabPosition(tabId, newCoordinates);
  }, [updateTabPosition]);

  // Context value
  const value = {
    tabs,
    isDrawerOpen,
    isDragging,
    draggedTab,
    addTab,
    removeTab,
    updateTab,
    updateTabPosition,
    toggleDrawer,
    closeDrawer,
    openDrawer,
    startDragging,
    stopDragging,
    placeTabOnMap
  };

  return (
    <TextboxTabsContext.Provider value={value}>
      {children}
    </TextboxTabsContext.Provider>
  );
};

// Custom hook to use the context
export const useTextboxTabs = () => {
  const context = useContext(TextboxTabsContext);
  if (!context) {
    throw new Error('useTextboxTabs must be used within a TextboxTabsProvider');
  }
  return context;
};
