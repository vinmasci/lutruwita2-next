/**
 * Utility functions for working with Cloudinary data
 */

/**
 * Fetches route data from Cloudinary using the embed URL
 * @param {string} embedUrl - The Cloudinary embed URL for the route
 * @returns {Promise<Object>} - The processed route data
 */
export const fetchRouteDataFromCloudinary = async (embedUrl) => {
  if (!embedUrl) {
    throw new Error('No embed URL provided');
  }

  try {
    // Add timestamp to force fresh version
    const cloudinaryUrl = `${embedUrl}?t=${Date.now()}`;
    
    console.log(`Fetching data from Cloudinary: ${cloudinaryUrl}`);
    
    // Fetch the data from Cloudinary
    const response = await fetch(cloudinaryUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch from Cloudinary: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully loaded pre-processed data from Cloudinary: ${data.name || 'Unnamed'}`);
    
    // Return the processed data
    return {
      ...data,
      embedUrl,
      _type: 'loaded',
      _loadedState: data
    };
  } catch (error) {
    console.error('Error fetching from Cloudinary:', error);
    throw error;
  }
};
