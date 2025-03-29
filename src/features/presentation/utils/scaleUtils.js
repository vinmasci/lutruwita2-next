/**
 * Utility functions for handling page scaling in presentation mode
 */

/**
 * Adjusts the scale of the presentation container based on window size
 * @param {HTMLElement} container - The presentation container element
 */
export const adjustPresentationScale = (container, onScaleChange) => {
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
  
  // Apply the scale and notify if callback provided
  container.style.transform = `scale(${scale})`;
  if (onScaleChange) {
    onScaleChange(scale);
  }
  
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
  const mapArea = container.querySelector('.presentation-map-area');
  if (mapArea) {
    mapArea.style.width = '100%';
    mapArea.style.height = '100%';
  }
  
  // Ensure the page is scrolled to the top after scaling with a small delay
  setTimeout(() => {
    // Try to use scrollIntoView on the container if it has an ID
    const topElement = document.getElementById('presentation-top') || 
                       document.getElementById('embed-top');
    
    if (topElement) {
      // Use scrollIntoView for more reliable scrolling
      topElement.scrollIntoView({ 
        behavior: 'auto', 
        block: 'start' 
      });
    }
    
    // Also use window.scrollTo as a fallback
    window.scrollTo(0, 0);
  }, 100);
};

/**
 * Sets up a resize listener to adjust scale when window size changes
 * @param {HTMLElement} container - The presentation container element
 */
export const setupScaleListener = (container, onScaleChange) => {
  if (!container) return;
  
  // Initial adjustment
  adjustPresentationScale(container, onScaleChange);
  
  // Create a named handler function so we can properly remove it later
  const handleResize = () => {
    adjustPresentationScale(container, onScaleChange);
  };
  
  // Add resize listener
  window.addEventListener('resize', handleResize);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};
