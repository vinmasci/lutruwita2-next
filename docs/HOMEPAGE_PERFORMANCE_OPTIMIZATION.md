# Homepage Performance Optimization

## Problem

The homepage was taking a long time to load (6+ seconds) due to the following issues:

1. All route data was being fetched at once during initialization
2. The API call to `publicRouteService.listRoutes()` was taking ~6 seconds to complete
3. The page was waiting for this data before rendering the route cards
4. Route cards were not properly filling their grid spaces, causing layout issues

Performance logs showed:
```
[Log] [Performance] publicRouteService.listRoutes took 6363.00ms (async)
[Debug] FetchRoutesOperation: 6364.104ms
[Debug] LandingPage-TotalLoadTime: 6565.574ms
```

## Solution: Lazy Loading with Intersection Observer

We implemented a lazy loading approach using the Intersection Observer API to:

1. Render the page structure immediately with a loading spinner
2. Fetch route data in the background
3. Only render actual route content when cards are about to enter the viewport
4. Show proper loading states with spinners and skeleton placeholders

### Components Created

1. **LazyRouteCard.jsx**
   - Uses Intersection Observer to detect when a card is about to enter the viewport
   - Shows a skeleton placeholder with a spinner until the card is visible
   - Only renders the actual RouteCard component when needed
   - Matches the exact layout of the real card for a smooth transition
   - Ensures cards fill their entire container width and height

2. **LazyRouteCardGrid.jsx**
   - Renders a grid of LazyRouteCard components
   - Each card will only load its content when it's about to enter the viewport
   - Handles empty states gracefully
   - Uses proper grid layout with consistent spacing

### Changes to LandingPage.js

1. Modified the initialization to:
   - Show a loading spinner while fetching routes
   - Fetch routes in the background
   - Display proper loading states during the entire process
   - Use proper JSX syntax for React components

2. Replaced RouteCardGrid with LazyRouteCardGrid to enable lazy loading

### Changes to RouteCard.jsx

1. Modified the card component to:
   - Fill the entire width and height of its container
   - Ensure consistent styling across all cards
   - Remove unnecessary Grid wrapper (now handled by LazyRouteCardGrid)

### Benefits

1. **Faster Initial Page Load**: The page structure loads immediately without waiting for route data
2. **Progressive Loading**: Route cards load as the user scrolls, creating a smoother experience
3. **Reduced Resource Usage**: Only loads the resources needed for visible content
4. **Better User Experience**: Users can start interacting with the page immediately
5. **Improved Layout**: Cards now properly fill their grid spaces for a more consistent appearance

## Future Improvements

1. **Server-Side Pagination**: Implement pagination on the API side to fetch smaller batches of routes
2. **Caching**: Add client-side caching for route data to reduce API calls
3. **Image Optimization**: Further optimize image loading in the route cards
4. **Prefetching**: Implement prefetching for routes that are likely to be viewed next
