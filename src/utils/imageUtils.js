/**
 * Utility functions for image optimization and lazy loading
 */

/**
 * Generates a tiny thumbnail URL from a Cloudinary image URL
 * This creates a very small, low-quality version of the image for use as a placeholder
 * 
 * @param {string} url - The original Cloudinary image URL
 * @param {Object} options - Options for the thumbnail
 * @param {number} options.width - Width of the thumbnail in pixels (default: 10)
 * @param {number} options.quality - Quality of the thumbnail (1-100, default: 10)
 * @returns {string|null} The thumbnail URL or null if not a Cloudinary URL
 */
export const getTinyThumbnailUrl = (url, options = {}) => {
  if (!url) return null;
  
  const { width = 10, quality = 10 } = options;
  
  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com')) {
    // Extract the base URL and transformation parts
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      // Add transformations for a tiny, blurry placeholder
      return `${parts[0]}/upload/w_${width},q_${quality}/${parts[1]}`;
    }
  }
  
  return null; // Not a Cloudinary URL or couldn't parse
};

/**
 * Generates a responsive image URL from a Cloudinary image URL with various optimizations
 * 
 * @param {string} url - The original Cloudinary image URL
 * @param {Object} options - Options for the responsive image
 * @param {number} options.width - Width of the image in pixels
 * @param {number} options.height - Height of the image in pixels
 * @param {string} options.format - Image format (auto, webp, jpg, etc.)
 * @param {number} options.quality - Quality of the image (1-100)
 * @returns {string|null} The optimized URL or the original if not a Cloudinary URL
 */
export const getOptimizedImageUrl = (url, options = {}) => {
  if (!url) return null;
  
  const { 
    width, 
    height, 
    format = 'auto', 
    quality = 80,
    crop = 'fill'
  } = options;
  
  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com')) {
    // Extract the base URL and transformation parts
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      // Build the transformation string
      let transform = '';
      
      if (width) transform += `w_${width},`;
      if (height) transform += `h_${height},`;
      if (crop) transform += `c_${crop},`;
      if (quality) transform += `q_${quality},`;
      if (format) transform += `f_${format},`;
      
      // Remove trailing comma if present
      if (transform.endsWith(',')) {
        transform = transform.slice(0, -1);
      }
      
      return `${parts[0]}/upload/${transform}/${parts[1]}`;
    }
  }
  
  return url; // Return original URL if not Cloudinary or couldn't parse
};

/**
 * Preloads an image by creating an Image object
 * 
 * @param {string} url - The image URL to preload
 * @returns {Promise} A promise that resolves when the image is loaded
 */
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Generates a srcSet string for responsive images
 * 
 * @param {string} url - The base Cloudinary image URL
 * @param {Array<number>} widths - Array of widths to include in the srcSet
 * @param {Object} options - Additional options for image optimization
 * @returns {string} The srcSet string or empty string if not a Cloudinary URL
 */
export const generateSrcSet = (url, widths = [400, 600, 800, 1200, 1600], options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return '';
  
  return widths
    .map(width => {
      const optimizedUrl = getOptimizedImageUrl(url, { ...options, width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
};

/**
 * Checks if an element is in the viewport
 * 
 * @param {HTMLElement} element - The DOM element to check
 * @param {number} offset - Additional offset to consider element in viewport
 * @returns {boolean} True if the element is in the viewport
 */
export const isInViewport = (element, offset = 200) => {
  if (!element || typeof window === 'undefined') return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.bottom >= -offset &&
    rect.right >= -offset &&
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) + offset
  );
};
