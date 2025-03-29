# Event Date Countdown Implementation

## Overview

This document outlines the implementation of a feature that allows users to set an event date for routes classified as "event" type. When a route is saved with an event date, a countdown timer is displayed in the navbar header under the title.

## Current Status (Updated 29/03/2025)

### What's Working

1.  **Save Dialog Enhancement**:
    *   The SaveDialog component has been updated to display a date/time picker when the route type is set to "event".
    *   The date picker uses the MUI DateTimePicker component and is properly integrated with the form.

2.  **Data Storage & API Integration**:
    *   The `eventDate` field is correctly included in the route data structure.
    *   The frontend (`RouteContext.js`) correctly converts the `dayjs` object to a standard JavaScript `Date` before sending the payload.
    *   The API route handler (`api/routes/index.js`) correctly includes the `eventDate` field in the `RouteSchema` and handles saving it for both new routes and updates.
    *   **Confirmation:** The `eventDate` is now successfully saving to the MongoDB database. Example raw data from a saved route:
        ```
        ...
        type: "event",
        ...
        eventDate: 2025-04-04T20:30:00.000+00:00
        ...
        ```

3.  **CountdownTimer Component**:
    *   A new CountdownTimer component has been created that displays days, hours, minutes, and seconds until the event.
    *   The component correctly handles past events and displays "Event has started!" when appropriate.

### What's Not Working

1.  **UI Display Issue**:
    *   The countdown timer is **still not being displayed** in the navbar header (`MapHeader.js`) in Presentation and Embed modes, even though the `eventDate` is being saved correctly to the database and is present in the loaded route data.

## Implementation Details

### Data Flow

1.  User selects "event" as the route type in the SaveDialog.
2.  User selects an event date using the date/time picker.
3.  SaveDialog passes the `eventDate` (as a `dayjs` object) to the `LineContext`'s `saveRoute` function.
4.  `LineContext` passes the `eventDate` to the `RouteContext`'s `saveCurrentState` function.
5.  `RouteContext` converts the `dayjs` object to a standard `Date` and includes it in the payload sent to the server via `routeService`.
6.  The API saves the `eventDate` to MongoDB.
7.  When loading a route (for Presentation/Embed views), the `eventDate` is fetched from the database (or Cloudinary embed data) and should be available in the main route data object (`currentLoadedState` in `RouteContext` or `routeData` in `useRouteDataLoader`).
8.  `MapHeader` component should receive the `eventDate` prop from the parent view (`PresentationMapView` or `EmbedMapView`).
9.  `MapHeader` component should conditionally render the `CountdownTimer` component when the route `type` is "event" and an `eventDate` is provided. **(This step appears to be failing)**

### Code Locations

-   **SaveDialog**: `src/features/map/components/Sidebar/SaveDialog.jsx`
-   **RouteContext**: `src/features/map/context/RouteContext.js`
-   **LineContext**: `src/features/lineMarkers/context/LineContext.jsx`
-   **MapHeader**: `src/features/map/components/MapHeader/MapHeader.js`
-   **CountdownTimer**: `src/features/map/components/MapHeader/CountdownTimer.js`
-   **API Route Handler**: `api/routes/index.js`
-   **Presentation View**: `src/features/presentation/components/PresentationMapView/PresentationMapView.js`
-   **Embed View**: `src/features/presentation/components/EmbedMapView/EmbedMapView.jsx`
-   **Embed Data Loader**: `src/features/presentation/components/EmbedMapView/hooks/useRouteDataLoader.js`

## Next Steps

1.  **Debug Frontend Data Flow**:
    *   Verify that `currentLoadedState` (in `PresentationMapView`) and `routeData` (in `EmbedMapView`) contain the correct `eventDate` and `type` when the `MapHeader` component renders.
    *   Confirm that `PresentationMapView` and `EmbedMapView` are correctly passing the `type` and `eventDate` props from these state objects to the `MapHeader`.
2.  **Investigate CountdownTimer**:
    *   Check if the `CountdownTimer` component correctly receives and interprets the `eventDate` prop (expected format: ISO string or Date object).
    *   Ensure there are no internal issues within `CountdownTimer` preventing it from rendering.
