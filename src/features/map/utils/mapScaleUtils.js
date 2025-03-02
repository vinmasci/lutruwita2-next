/**
 * Utility functions for handling page scaling in creation mode
 */

/**
 * Adjusts the scale of the map container based on window size
 * @param {HTMLElement} container - The map container element
 */
export const adjustMapScale = (container) => {
  if (!container) return;
  
  // Get window dimensions
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Base scale values
  let scale = 0.8; // Default scale
  
  // Adjust scale based on window width
  if (windowWidth <= 320) {
    scale = 0.45; // Very small screens (iPhone SE size)
  } else if (windowWidth <= 480) {
    scale = 0.5;  // Small mobile screens
  } else if (windowWidth <= 600) {
    scale = 0.55; // Medium mobile screens
  } else if (windowWidth <= 900) {
    scale = 0.65; // Large mobile/small tablet screens (unchanged)
  } else if (windowWidth <= 1200) {
    scale = 0.7;  // Tablet/small desktop (unchanged)
  } else if (windowWidth <= 1600) {
    scale = 0.75; // Desktop (unchanged)
  }
  
  // Apply the scale to the container but use transform-style: preserve-3d
  // This helps maintain proper stacking context for child elements
  container.style.transform = `scale(${scale})`;
  container.style.transformStyle = 'preserve-3d';
  container.style.transformOrigin = 'top left';
  
  // Ensure the container fills the viewport
  container.style.width = '100vw';
  container.style.height = '100vh';
  
  // Calculate the width and height needed to fill the viewport after scaling
  const scaledWidth = Math.ceil(windowWidth / scale);
  const scaledHeight = Math.ceil(windowHeight / scale);
  
  // Set the container size to compensate for scaling
  container.style.width = `${scaledWidth}px`;
  container.style.height = `${scaledHeight}px`;
  
  // Ensure the map area fills the container
  const mapArea = container.querySelector('.map-container');
  if (mapArea) {
    mapArea.style.width = '100%';
    mapArea.style.height = '100%';
  }
  
  // Ensure the map layers are behind the sidebar and elevation profile
  // by setting a negative z-index on the map layers container
  const mapLayers = container.querySelector('.map-layers');
  if (mapLayers) {
    mapLayers.style.zIndex = '-1';
    
    // Find all photo markers and clusters within the map layers and set their z-index to a very low value
    const photoElements = mapLayers.querySelectorAll('.photo-layer, .photo-marker, .photo-cluster');
    photoElements.forEach(element => {
      element.style.zIndex = '-1000000'; // Very low z-index as requested
    });
  }
  
  // Ensure the sidebar and elevation profile have higher z-index values
  const styledDrawer = container.querySelector('.MuiDrawer-root');
  if (styledDrawer) {
    styledDrawer.style.zIndex = '1000';
  }
  
  const elevationPanel = container.querySelector('.MuiBox-root');
  if (elevationPanel && elevationPanel.style && elevationPanel.style.zIndex === '102') {
    elevationPanel.style.zIndex = '1002';
  }
  
  // Ensure the page is scrolled to the top after scaling
  window.scrollTo(0, 0);
};

/**
 * Sets up a resize listener to adjust scale when window size changes
 * @param {HTMLElement} container - The map container element
 */
export const setupMapScaleListener = (container) => {
  if (!container) return;
  
  // Initial adjustment
  adjustMapScale(container);
  
  // Create a named handler function so we can properly remove it later
  const handleResize = () => {
    adjustMapScale(container);
  };
  
  // Add resize listener
  window.addEventListener('resize', handleResize);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};
