import axios from 'axios';
import { createApiHandler } from '../lib/middleware.js'; // Assuming middleware setup

// Handler for the photo proxy endpoint
async function handlePhotoProxy(req, res) {
  console.log('[API Photo Proxy] Function handler entered.'); // <-- ADDED THIS LINE
  const { url: googlePhotoUrl } = req.query;

  if (!googlePhotoUrl) {
    return res.status(400).json({ error: 'Missing photo URL' });
  }

  try {
    // Validate the URL (basic check)
    const parsedUrl = new URL(googlePhotoUrl);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }
    // Add more specific domain checks if needed, e.g.,
    // if (!parsedUrl.hostname.endsWith('googleapis.com')) {
    //   throw new Error('URL is not a Google API URL');
    // }

    console.log(`[API Photo Proxy] Fetching image from: ${googlePhotoUrl}`);

    // Fetch the image from Google's server as a stream
    const response = await axios({
      method: 'get',
      url: googlePhotoUrl,
      responseType: 'stream',
    });

    // Set the content type based on Google's response
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      // Fallback content type if Google doesn't provide one
      res.setHeader('Content-Type', 'image/jpeg');
    }

    // Set cache headers (optional, but recommended)
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Pipe the image stream directly to the client response
    response.data.pipe(res);

  } catch (error) {
    console.error('[API Photo Proxy] Error fetching image:', error.message);
    // Check if it's an Axios error to potentially get more details
    if (error.response) {
      console.error('[API Photo Proxy] Google API Response Status:', error.response.status);
      console.error('[API Photo Proxy] Google API Response Headers:', error.response.headers);
      // Don't send Google's error details directly to the client for security
      return res.status(error.response.status || 500).json({ error: 'Failed to fetch image from source' });
    }
    // Generic error
    return res.status(500).json({ error: 'Failed to proxy image', details: error.message });
  }
}

// Export the handler wrapped in middleware (adjust auth requirement as needed)
export default createApiHandler(handlePhotoProxy, { requireDb: false, requireAuth: false });
