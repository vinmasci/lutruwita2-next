/**
 * Utility functions for image optimization and lazy loading
 * With enhanced mobile support and error handling
 */

/**
 * Helper function to detect mobile devices
 * @returns {boolean} True if the current device is mobile
 */
export const isMobileDevice = () => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
};

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
  
  try {
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      // Extract the base URL and transformation parts
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        // Add transformations for a tiny, blurry placeholder
        return `${parts[0]}/upload/w_${width},q_${quality}/${parts[1]}`;
      }
    }
  } catch (error) {
    console.warn('[imageUtils] Error generating tiny thumbnail URL:', error);
  }
  
  return null; // Not a Cloudinary URL or couldn't parse
};

/**
 * Generates a responsive image URL from a Cloudinary image URL with various optimizations
 * Enhanced with mobile-specific optimizations and error handling
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
  
  try {
    const isMobile = isMobileDevice();
    
    // Apply mobile-specific defaults if not explicitly provided
    const { 
      width, 
      height, 
      format = 'auto', 
      quality = isMobile ? 60 : 80, // Lower quality on mobile
      crop = 'fill',
      dpr = isMobile ? 'auto' : '1.0' // Responsive DPR on mobile
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
        if (dpr) transform += `dpr_${dpr},`;
        
        // Add mobile-specific optimizations
        if (isMobile) {
          transform += 'fl_progressive,'; // Progressive loading for mobile
        }
        
        // Remove trailing comma if present
        if (transform.endsWith(',')) {
          transform = transform.slice(0, -1);
        }
        
        return `${parts[0]}/upload/${transform}/${parts[1]}`;
      }
    }
  } catch (error) {
    console.warn('[imageUtils] Error generating optimized image URL:', error);
  }
  
  return url; // Return original URL if not Cloudinary or couldn't parse
};

/**
 * Preloads an image by creating an Image object
 * Enhanced with mobile-specific optimizations and better error handling
 * 
 * @param {string} url - The image URL to preload
 * @param {Object} options - Options for preloading
 * @returns {Promise} A promise that resolves when the image is loaded
 */
export const preloadImage = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    try {
      const isMobile = isMobileDevice();
      
      // Use optimized URL for preloading on mobile
      const imageUrl = isMobile 
        ? getOptimizedImageUrl(url, { 
            width: 400, 
            quality: 60,
            format: 'auto'
          }) || url
        : url;
      
      const img = new Image();
      
      // Set a timeout for mobile devices to prevent hanging
      let timeoutId;
      if (isMobile) {
        timeoutId = setTimeout(() => {
          console.warn(`[imageUtils] Image load timeout for: ${url}`);
          resolve(img); // Resolve anyway to prevent UI from waiting indefinitely
        }, 5000); // 5 second timeout on mobile
      }
      
      img.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(img);
      };
      
      img.onerror = (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn(`[imageUtils] Failed to load image: ${url}`, error);
        
        // If optimized version failed, try original as fallback
        if (imageUrl !== url) {
          console.warn(`[imageUtils] Trying fallback to original URL: ${url}`);
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = () => reject(new Error(`Failed to load image (both optimized and original): ${url}`));
          fallbackImg.src = url;
        } else {
          reject(new Error(`Failed to load image: ${url}`));
        }
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('[imageUtils] Error in preloadImage:', error);
      reject(error);
    }
  });
};

/**
 * Generates a srcSet string for responsive images
 * Enhanced with mobile-specific optimizations and error handling
 * 
 * @param {string} url - The base Cloudinary image URL
 * @param {Array<number>} widths - Array of widths to include in the srcSet
 * @param {Object} options - Additional options for image optimization
 * @returns {string} The srcSet string or empty string if not a Cloudinary URL
 */
export const generateSrcSet = (url, widths = [400, 600, 800, 1200, 1600], options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return '';
  
  try {
    const isMobile = isMobileDevice();
    
    // Use a smaller set of widths for mobile to reduce bandwidth
    const mobileWidths = [320, 480, 640, 768];
    const effectiveWidths = isMobile ? mobileWidths : widths;
    
    // Apply mobile-specific quality settings
    const mobileOptions = isMobile 
      ? { ...options, quality: options.quality || 60 }
      : options;
    
    return effectiveWidths
      .map(width => {
        const optimizedUrl = getOptimizedImageUrl(url, { ...mobileOptions, width });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  } catch (error) {
    console.warn('[imageUtils] Error generating srcSet:', error);
    return '';
  }
};

/**
 * Checks if an element is in the viewport
 * Enhanced with mobile-specific optimizations
 * 
 * @param {HTMLElement} element - The DOM element to check
 * @param {number} offset - Additional offset to consider element in viewport
 * @returns {boolean} True if the element is in the viewport
 */
export const isInViewport = (element, offset = 200) => {
  if (!element || typeof window === 'undefined') return false;
  
  try {
    const isMobile = isMobileDevice();
    
    // Use a smaller offset on mobile to reduce the number of elements loaded at once
    const effectiveOffset = isMobile ? offset / 2 : offset;
    
    const rect = element.getBoundingClientRect();
    
    return (
      rect.bottom >= -effectiveOffset &&
      rect.right >= -effectiveOffset &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) + effectiveOffset &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth) + effectiveOffset
    );
  } catch (error) {
    console.warn('[imageUtils] Error checking if element is in viewport:', error);
    return false;
  }
};

/**
 * Determines if the browser supports WebP format
 * This is useful for providing WebP images to browsers that support it
 * 
 * @returns {Promise<boolean>} Promise that resolves to true if WebP is supported
 */
export const supportsWebP = () => {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = () => resolve(true);
    webP.onerror = () => resolve(false);
    webP.src = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  });
};
