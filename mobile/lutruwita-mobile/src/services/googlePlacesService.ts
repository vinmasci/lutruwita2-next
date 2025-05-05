import { Alert } from 'react-native';

// Define the structure for the details we want to extract
export interface GooglePlaceDetails {
  name: string;
  formatted_address?: string;
  rating?: number;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: { photo_reference: string }[]; // Add photos array
  // Add other fields as needed from the Places API response
}

// Google Places API Key - Ensure this is set in your environment variables
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// Helper function to construct Google Photo URL
export const getGooglePhotoUrl = (photoReference: string, maxWidth: number = 400): string | null => {
  if (!API_KEY) {
    console.error('Google Places API key is missing for photo URL construction.');
    return null;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${API_KEY}`;
};

/**
 * Fetches detailed information for a specific place using its Place ID.
 * @param placeId The Google Place ID.
 * @returns A promise resolving to the place details or null if an error occurs.
 */
export const fetchPlaceDetails = async (placeId: string): Promise<GooglePlaceDetails | null> => {
  if (!API_KEY) {
    console.error('Google Places API key is missing. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in your environment.');
    Alert.alert('Configuration Error', 'Google Places API key is not configured.');
    return null;
  }

  if (!placeId) {
    console.warn('fetchPlaceDetails called with no placeId');
    return null;
  }

  // Define the fields you want to retrieve from the API
  // See: https://developers.google.com/maps/documentation/places/web-service/details#fields
  const fields = [
    'name',
    'formatted_address',
    'rating',
    'international_phone_number',
    'website',
    'opening_hours', // Includes open_now and weekday_text
    'photos', // Request photos
    'place_id', // Always good to include
    'geometry' // Needed for location context if desired later
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;

  console.log(`Fetching Google Place Details for ID: ${placeId}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      console.log('Successfully fetched Google Place Details:', data.result.name);
      // Return only the necessary fields structured as GooglePlaceDetails
      const details: GooglePlaceDetails = {
        name: data.result.name,
        formatted_address: data.result.formatted_address,
        rating: data.result.rating,
        international_phone_number: data.result.international_phone_number,
        website: data.result.website,
        opening_hours: data.result.opening_hours ? {
          open_now: data.result.opening_hours.open_now,
          weekday_text: data.result.opening_hours.weekday_text,
        } : undefined,
        photos: data.result.photos, // Extract photo references
      };
      return details;
    } else {
      console.error(`Google Places API error for placeId ${placeId}: ${data.status}`, data.error_message || '');
      Alert.alert('API Error', `Could not fetch place details: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Network error fetching Google Place Details for placeId ${placeId}:`, error);
    Alert.alert('Network Error', 'Failed to fetch place details. Please check your connection.');
    return null;
  }
};
