# Google Places API Integration

This document outlines the implementation of Google Places API integration for POIs (Points of Interest) in the application.

## Overview

The Google Places API integration allows users to:

1. Add Google Places links to POIs
2. See real-time Google Places information in presentation mode
3. Access up-to-date details like ratings, address, phone number, and website

## User Guide

### Adding a Google Places Link to a POI

There are two ways to add Google Places information to a POI:

#### Method 1: Auto-search (New!)

1. When creating a POI, simply type its name in the "Name" field
2. The system will automatically search for matching places near the POI's location
3. A dropdown will appear with search results showing place names, addresses, and ratings
4. Click on a result to select it and automatically populate the POI with Google Places data

#### Method 2: Manual Link Entry

1. When creating or editing a POI, paste a Google Maps link in the "Google Places Link" field
2. The system supports various Google Maps link formats:
   - Regular Google Maps links (e.g., `https://www.google.com/maps/place/...`)
   - Share links (e.g., `https://maps.app.goo.gl/...`)
   - Embed links/iframe code (recommended for best results)

### Getting an Embed Link

For the most reliable results, use an embed link:

1. Go to Google Maps and find the place you want to add
2. Click "Share" and then "Embed a map"
3. Copy the entire iframe code (starts with `<iframe src="https://www.google.com/maps/embed?...`)
4. Paste this code into the "Google Places Link" field

### Viewing Google Places Information

In presentation mode, POIs with Google Places links will show:
- Name and address
- Rating (if available)
- Phone number (if available)
- Website link (if available)
- Photos (if available)

The information is fetched in real-time when viewing the POI, ensuring it's always up-to-date.

## Technical Implementation

### Architecture

The implementation follows these principles:

1. **Store minimal data**: Only the place ID and URL are stored in the database
2. **Fetch on demand**: Place details are fetched in real-time when viewing a POI
3. **Graceful degradation**: If the API is unavailable, the POI still works with basic information
4. **Auto-search**: Automatically search for places based on name and coordinates

### Components

1. **Google Places Service** (`src/features/poi/services/googlePlacesService.js`)
   - Handles extracting place IDs from various URL formats
   - Provides functions to fetch place details from the Google Places API
   - Implements search functionality for places by name and coordinates

2. **POI Context** (`src/features/poi/context/POIContext.js`)
   - Processes Google Places links when a POI is created
   - Stores the place ID and URL in the POI object
   - Provides a search interface for components to find places

3. **POI Details Components** (`src/features/poi/components/POIDetailsDrawer/POIDetailsDrawer.js` and `src/features/poi/components/POIDetailsModal/POIDetailsModal.jsx`)
   - Implement auto-search functionality when typing a POI name
   - Display search results in a dropdown
   - Allow selection of places from search results

4. **Presentation POI Viewer** (`src/features/presentation/components/POIViewer/PresentationPOIViewer.js`)
   - Fetches and displays Google Places information in presentation mode
   - Shows loading state while fetching data
   - Handles errors gracefully

### URL Parsing

The system can extract place IDs from various Google Maps URL formats:

1. **Direct place_id parameter**: `?place_id=ChIJ...`
2. **Embed URLs**: Extracts from the `pb` parameter in embed URLs
3. **Coordinates**: For URLs with `@lat,lng`, finds the nearest place
4. **Query parameter**: For URLs with `?q=...`, searches for the place by name

### Data Flow

1. User adds a Google Places link to a POI
2. The system extracts the place ID and stores it with the POI
3. When viewing the POI in presentation mode, the system:
   - Fetches the latest place details using the stored place ID
   - Displays the information in the POI viewer
   - Shows a loading indicator while fetching
   - Handles any errors gracefully

## Limitations and Considerations

1. **API Key**: Requires a valid Google Places API key in the `.env.local` file
2. **Usage Limits**: Subject to Google Places API usage limits
3. **URL Formats**: Some URL formats may not be supported or may require additional processing
4. **Offline Use**: Place details are not available offline

## Future Improvements

1. Add caching to reduce API calls
2. Support more URL formats
3. Add more place details (opening hours, reviews, etc.)
4. Improve error handling and fallback mechanisms
5. Enhance search results with more details and filtering options
6. Add a map preview for search results
