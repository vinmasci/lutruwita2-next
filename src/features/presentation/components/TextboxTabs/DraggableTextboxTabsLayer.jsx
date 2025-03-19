import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { useTextboxTabs } from '../../context/TextboxTabsContext';
import MapboxTextboxTabMarker from './MapboxTextboxTabMarker';
import TextboxTabDragPreview from './TextboxTabDragPreview';
import { TextboxTabViewer } from './TextboxTabViewer';

const DraggableTextboxTabsLayer = () => {
  const { map } = useMapContext();
  const { 
    tabs, 
    updateTabPosition, 
    isDragging, 
    draggedTab, 
    placeTabOnMap,
    stopDragging,
    updateTab
  } = useTextboxTabs();
  
  const [selectedTab, setSelectedTab] = useState(null);
  const [modalTab, setModalTab] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(null);
  const [justPlacedTabId, setJustPlacedTabId] = useState(null);
  
  // Listen for zoom changes
  useEffect(() => {
    if (!map) return;
    
    const handleZoom = () => {
      setCurrentZoom(Math.floor(map.getZoom()));
    };
    
    // Set initial zoom
    handleZoom();
    
    // Update on zoom changes
    map.on('zoom', handleZoom);
    
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);
  
  // Filter to only include tabs with coordinates
  const placedTabs = useMemo(() => {
    return tabs.filter(tab => tab.coordinates);
  }, [tabs]);
  
  // Handle tab click
  const handleTabClick = (tab) => {
    setSelectedTab(tab.id === selectedTab ? null : tab.id);
    setModalTab(tab); // Open the modal with the clicked tab
  };
  
  // Close modal handler
  const handleCloseModal = () => {
    setModalTab(null);
  };
  
  // Handle tab drag end - improved to pass the tab object
  const handleTabDragEnd = (newCoordinates) => {
    // Find the tab that matches the selected tab ID
    const tab = placedTabs.find(t => t.id === selectedTab);
    
    if (tab) {
      console.log('[DraggableTextboxTabsLayer] Updating tab position:', tab.id, newCoordinates);
      
      // Update the tab position in the context
      updateTabPosition(tab.id, [...newCoordinates]); // Create a new array to avoid reference issues
      
      // Clear the selected tab after moving it to remove the white border
      setSelectedTab(null);
    }
  };
  
  // Handle placing a new tab on the map
  const handlePlaceTab = (coordinates) => {
    if (draggedTab) {
      console.log('[DraggableTextboxTabsLayer] Placing tab on map:', draggedTab.id, coordinates);
      
      // Clear any selected tab before placing a new one to prevent interaction issues
      setSelectedTab(null);
      
      // Create a deep copy of coordinates to avoid reference issues
      const newCoordinates = [...coordinates];
      
      // Place the tab on the map with the new coordinates
      placeTabOnMap(draggedTab.id, newCoordinates);
      
      // Set the just placed tab ID
      setJustPlacedTabId(draggedTab.id);
      
      // Open the modal with the newly placed tab
      setModalTab({...draggedTab, coordinates: newCoordinates});
      
      // Stop dragging after placing the tab
      stopDragging();
    }
  };
  
  // Reset justPlacedTabId when modal is closed
  const handleCloseModalWithReset = () => {
    setJustPlacedTabId(null);
    handleCloseModal();
  };
  
  // We now always render tabs, but they'll be semi-transparent at low zoom levels
  // The opacity is handled in MapboxTextboxTabMarker.jsx
  if (currentZoom !== null && currentZoom <= 8) {
    console.log('[DraggableTextboxTabsLayer] Rendering tabs with reduced opacity at zoom level:', currentZoom);
  }
  
  return (
    <div>
      {/* Render placed tabs */}
      {placedTabs.map(tab => (
        <MapboxTextboxTabMarker
          key={tab.id}
          tab={tab}
          onClick={() => handleTabClick(tab)}
          onDragEnd={handleTabDragEnd}
          selected={selectedTab === tab.id}
        />
      ))}
      
      {/* Render drag preview when dragging */}
      {isDragging && draggedTab && (
        <TextboxTabDragPreview
          tab={draggedTab}
          onPlace={handlePlaceTab}
        />
      )}
      
      {/* Render modal when a tab is selected or newly placed */}
      {modalTab && (
        <TextboxTabViewer 
          tab={modalTab} 
          onClose={handleCloseModalWithReset}
          displayMode="modal"
          isEditingInitial={modalTab.id === justPlacedTabId}
        />
      )}
    </div>
  );
};

export default DraggableTextboxTabsLayer;
