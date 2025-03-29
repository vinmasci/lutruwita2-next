import axios from 'axios';
import logger from '../../../utils/logger';

/**
 * Fetches a brief introductory summary for a given place name, optionally qualified by state, from Wikipedia.
 * @param {string} placeName - The name of the place to search for.
 * @param {string|null} [state] - Optional state name to make the search more specific.
 * @returns {Promise<Object|null>} - An object containing the summary { summary: string } or null if not found/error.
 */
export const fetchWikipediaSummary = async (placeName, state = null) => { // Add optional state parameter
  if (!placeName) {
    logger.warn('[wikipediaService] fetchWikipediaSummary called with no placeName.');
    return null;
  }

  const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
  const params = {
    action: 'query',
    format: 'json',
    prop: 'extracts', // Request extracts (summaries)
    exintro: true,     // Get only the introductory section
    explaintext: true, // Get plain text, not HTML
    redirects: 1,      // Follow redirects
    origin: '*',       // Necessary for CORS
    // Construct title: "Place, State" if state is provided, otherwise just "Place"
    titles: state ? `${placeName}, ${state}` : placeName, 
  };

  logger.debug(`[wikipediaService] Fetching summary for title: "${params.titles}"`);

  try {
    const response = await axios.get(WIKIPEDIA_API_URL, { params });
    logger.debug('[wikipediaService] API Response:', response.data);

    const pages = response.data?.query?.pages;
    if (!pages) {
      logger.warn(`[wikipediaService] No 'pages' object found in response for "${placeName}".`);
      return null;
    }

    // The page ID is variable, so we need to get the first key inside 'pages'
    const pageId = Object.keys(pages)[0];
    
    // Check if the page exists (pageId will be -1 for non-existent pages)
    if (pageId === '-1') {
       logger.warn(`[wikipediaService] Page "${placeName}" does not exist on Wikipedia.`);
       return null;
    }

    const extract = pages[pageId]?.extract;

    if (extract) {
      logger.debug(`[wikipediaService] Found extract for "${placeName}".`);
      // Simple cleanup: remove excessive newlines
      const cleanedSummary = extract.replace(/\n{3,}/g, '\n\n').trim();
      return { summary: cleanedSummary };
    } else {
      logger.warn(`[wikipediaService] No extract found for pageId ${pageId} ("${placeName}").`);
      return null;
    }
  } catch (error) {
    logger.error(`[wikipediaService] Error fetching summary for "${placeName}":`, error);
    return null;
  }
};
