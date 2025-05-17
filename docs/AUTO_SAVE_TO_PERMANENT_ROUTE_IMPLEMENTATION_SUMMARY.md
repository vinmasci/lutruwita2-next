# Auto-Save to Permanent Route: Implementation Summary

This document summarizes the implementation of an enhanced auto-save feature that differentiates between saving new work (to a temporary store) and auto-saving edits directly to a loaded permanent route.

## Problem Statement

Previously, the auto-save mechanism primarily saved data to a temporary collection (`gpx_auto_saves`). When a user loaded a permanently saved route and made edits, the requirement was to have these edits auto-saved directly back to the permanent route record in `user_saved_routes` and its corresponding entry in `user_route_index`, rather than creating or updating a temporary auto-save.

## Implemented Solution

The solution involved a series of coordinated changes across services, contexts, and UI components:

1.  **Core Auto-Save Logic (`firebaseGpxAutoSaveService.js`):**
    *   The main `autoSaveGpxToFirebase` function was modified to accept an optional `loadedPermanentRouteId` parameter.
    *   **Dual-Target Saving:**
        *   If `loadedPermanentRouteId` is provided, data is saved/merged into the `user_saved_routes` collection.
        *   Otherwise (no `loadedPermanentRouteId`), data is saved to the `gpx_auto_saves` collection for temporary auto-saves.
    *   **`user_route_index` Updates:** When saving to `user_saved_routes`, the service now also attempts to update the `updatedAt` timestamp, name, and statistics of the corresponding route entry in the `user_route_index/{userId}` document within the same batch write. This ensures "My Routes" listings reflect recent edits.
    *   **Data Handling for Permanent Routes:** When updating a permanent route, POI and Line data from the current editor state replace the existing data in the permanent record.

2.  **`AutoSaveContext.js` Enhancement:**
    *   A new state variable, `loadedPermanentRouteId`, was added to track the ID of an active, loaded permanent route.
    *   A function `setLoadedPermanentRoute(routeId | null)` was added to update this state.
        *   When a permanent route is loaded, `loadedPermanentRouteId` is set to its ID, and `autoSaveId` in the context is also set to this permanent ID, directing auto-saves.
        *   When a permanent route is no longer the active context (e.g., map cleared, new GPX uploaded), `loadedPermanentRouteId`, `autoSaveId`, and `routeId` are nulled to revert to a fresh state for temporary auto-saves.

3.  **Propagation to Dependent Services and Contexts:**
    *   **`Uploader.js`**: Retrieves `loadedPermanentRouteId` from `AutoSaveContext` and passes it to `autoSaveGpxToFirebase` during new GPX processing.
    *   **Item-Specific Auto-Save Services** (`firebasePOIAutoSaveService.js`, `firebaseLineAutoSaveService.js`, `firebasePhotoAutoSaveService.js`):
        *   Their main auto-save functions (e.g., `autoSavePOIsToFirebase`) were updated to accept `loadedPermanentRouteId`.
        *   They now pass this ID to their internal calls to `autoSaveGpxToFirebase` if they need to trigger a full GPX save (e.g., if creating a new auto-save because no existing one was found).
        *   Helper functions within these services (e.g., `savePOIsToExistingAutoSave`) now use `loadedPermanentRouteId` to determine the correct target collection (`gpx_auto_saves` or `user_saved_routes`) for saving their specific data (POIs, lines, photos).
    *   **Item-Specific Contexts** (`POIContext.js`, `LineContext.jsx`, `PhotoContext.js`):
        *   These contexts now retrieve `loadedPermanentRouteId` from `AutoSaveContext`.
        *   They pass this ID to their respective auto-save service calls.
        *   The logic for skipping auto-saves (e.g., `if (!currentRoute)`) was updated to `if (!currentRoute && !currentLoadedPermanentRouteId)`, allowing auto-saves for POIs/Lines/Photos to proceed if a permanent route is loaded, even if no specific GPX track data (`currentRoute`) is active within it.

4.  **UI Integration for State Transitions:**
    *   **`SidebarListItems.js`**:
        *   When a permanent route is loaded via the "Load GPX" dialog, it now calls `autoSave.setLoadedPermanentRoute(permanentRouteId)`.
        *   When the "Clear Map" action is performed, it calls `autoSave.setLoadedPermanentRoute(null)`.
        *   When the "Add GPX" button is clicked, it now checks if a permanent route was loaded and calls `autoSave.setLoadedPermanentRoute(null)` to ensure the new GPX starts a fresh temporary auto-save session.
    *   **`AutoSavePanel.jsx`**:
        *   When a temporary auto-save is successfully converted to a permanent route (via "Publish"), it now calls `autoSave.setLoadedPermanentRoute(newlySavedPermanentRouteId)` to set the new permanent route as the active context for subsequent auto-saves.

## Current Status (Based on Feedback)

*   **Working:**
    *   POIs auto-save correctly, respecting whether a temporary or permanent route is active.
    *   The Line tool and its auto-save functionality appear to be working correctly under the new logic.
    *   **Photos Auto-Save & Load:** This is now confirmed to be working correctly. Photos are auto-saved to permanent routes without accidental deletion, and they load correctly when a permanent route is selected. The fix involved making the auto-save logic in `PhotoContext.js` sensitive to user-initiated changes post-load.
    *   **Header Settings Load:** Header settings (color, logo, username) are now correctly loaded and applied when a permanent route is opened in creation/edit mode. The fix involved ensuring `RouteContext.js` properly updates its internal `headerSettings` state when `currentLoadedState` is set.
*   **Needs Verification:**
    *   **`user_route_index` Updates:** The logic to update `name`, `statistics`, and `updatedAt` in the `user_route_index` when a permanent route is auto-saved has been added to `firebaseGpxAutoSaveService.js`. This needs to be thoroughly tested to ensure accuracy and atomicity with the main route data save.

## Debugging Photo Auto-Save & Load to Permanent Routes

Subsequent testing revealed that photo auto-saving to permanent routes was not working as intended. The `PhotoContext.js` was consistently logging `Skipping auto-save - no current route and no permanent route loaded`, even when a permanent route was active.

**Investigation Steps & Findings:**

1.  **Initial Check:** The condition `if (!route && !currentLoadedPermanentRouteId)` in `PhotoContext.js` was correct based on the design. The issue was that `currentLoadedPermanentRouteId` (derived from `autoSave.loadedPermanentRouteId`) was always `null` from `PhotoContext`'s perspective.
2.  **`AutoSaveContext` Access:** Logging confirmed that `autoSave` (the context value from `AutoSaveContext`) was `null` within `PhotoContext.js`. This pointed to an issue with how `PhotoContext` was obtaining or using the `useAutoSave` hook.
3.  **Provider Tree:** The component tree in `App.jsx` showed `PhotoProvider` correctly nested within `AutoSaveProvider`, ruling out a simple provider hierarchy issue.
4.  **Dynamic Import Issue:**
    *   `PhotoContext.js` used a module-level dynamic `require` to import `useAutoSave` from `AutoSaveContext.js`, intended to prevent circular dependencies.
    *   Logging revealed that the `useAutoSave` variable (meant to hold the hook function) was `null` or `undefined` when `PhotoProvider` rendered. This indicated the dynamic import at the module level was not successfully assigning the hook, likely due to module loading timing or circular dependency effects not being fully mitigated by the synchronous `require`.
5.  **Refactoring Dynamic Import:**
    *   The module-level dynamic `require` in `PhotoContext.js` was replaced. Instead, the `useAutoSave` hook is now dynamically imported *inside* the `PhotoProvider` component using `useEffect` and `await import()`. This defers the import until the component mounts, changing the timing and resolution context of the import.
    ```javascript
    // Inside PhotoProvider component
    const [useAutoSaveHook, setUseAutoSaveHook] = useState(null);
    // ...
    useEffect(() => {
        const importAutoSave = async () => {
            try {
                const AutoSaveModule = await import('../../../context/AutoSaveContext');
                if (AutoSaveModule && AutoSaveModule.useAutoSave) {
                    setUseAutoSaveHook(() => AutoSaveModule.useAutoSave);
                    // ...
                }
            } // ...
        };
        importAutoSave();
    }, []); // Runs once on mount

    const autoSave = useAutoSaveHook ? useAutoSaveHook() : null;
    ```
6.  **Infinite Loop Correction:**
    *   The refactored dynamic import, combined with `autoSave` (the context value) being in the dependency array of the main auto-saving `useEffect` in `PhotoContext.js`, initially caused an infinite saving loop. This was because the `autoSave` object reference changed on every context update (e.g., status changes during save), re-triggering the effect.
    *   **Solution:** The dependency array of the auto-saving `useEffect` was modified from `[..., autoSave]` to `[..., autoSave?.loadedPermanentRouteId, useAutoSaveHook]`. This makes the effect sensitive to the actual `loadedPermanentRouteId` value and the availability of the hook, rather than the entire `autoSave` object reference, thus breaking the loop.

**Outcome of Initial Debugging:**
With these changes, `PhotoContext.js` correctly obtained the `useAutoSave` hook and could access `loadedPermanentRouteId`. Auto-saving of photos to permanent routes was functional.

7.  **Issue with Loading Saved Photos:**
    *   **Problem:** After successfully saving photos to a permanent route, reloading that same route resulted in the photos not appearing. Subsequent auto-saves would then overwrite the permanent route with an empty photo list.
    *   **Investigation:**
        *   It was confirmed that photos were indeed being saved to Firebase correctly.
        *   The `loadPhotos` function in `PhotoContext.js` was correctly designed to populate its state if photo data was provided.
        *   The `onLoad` handler in `SidebarListItems.js` (responsible for initiating the load of a permanent route) correctly called `photoContext.loadPhotos(routeData.photos)`.
        *   The issue was traced to the `loadSavedRoute` function in `src/services/firebaseSaveCompleteRouteService.js`. This service function was responsible for fetching all data for a saved route (GPX, POIs, lines, etc.) but was missing the specific logic to fetch the `photos` data from its stored location in Firebase (assumed to be `user_saved_routes/{routeId}/data/photos`).
    *   **Solution:** The `loadSavedRoute` function in `firebaseSaveCompleteRouteService.js` was updated to include steps to fetch the photo data:
        ```javascript
        // Inside loadSavedRoute function
        // ... (after fetching other data like POIs, lines) ...
        const photosRef = doc(db, 'user_saved_routes', routeId, 'data', 'photos');
        const photosDoc = await getDoc(photosRef);

        if (photosDoc.exists()) {
          routeWithData.photos = photosDoc.data().data; // Assuming photos are stored under a 'data' field
        } else {
          routeWithData.photos = []; // Ensure photos array exists
        }
        ```
    *   **Outcome:** With this modification, `loadSavedRoute` now correctly fetches the photo data along with other route components. This data is then passed through `SidebarListItems.js` to `photoContext.loadPhotos()`, successfully populating the photo state when a permanent route is loaded.
    *   **Preventing Accidental Deletion:** Further refinement in `PhotoContext.js` introduced a "dirty" flag (`photosDirtySinceLastLoad`) to ensure that auto-saving to a permanent route only occurs if photos have been explicitly modified by the user *after* that specific permanent route was loaded. This prevents the `loadPhotos` function (e.g., if called with an empty array due to a failed fetch or a route with no photos) from inadvertently triggering an auto-save that deletes existing photos from the permanent record.

8.  **Fix for Loading Header Settings:**
    *   **Problem:** Header settings (color, logo, username) stored in `user_saved_routes/{routeId}/headerSettings` were not being correctly applied when a route was loaded in creation/edit mode.
    *   **Investigation:**
        *   `firebaseSaveCompleteRouteService.js` correctly fetched the `headerSettings` object as part of the main route document.
        *   `SidebarListItems.js` correctly passed this data to `RouteContext` via `setCurrentLoadedState()`.
        *   The issue was that `RouteContext.js` had a separate internal state for `headerSettings` that was not being consistently updated when `currentLoadedState` changed. The `loadRoute` function within `RouteContext` was attempting to populate these from top-level fields of the loaded route, not always prioritizing the nested `headerSettings` object.
    *   **Solution:**
        *   The `setCurrentLoadedState` function in `RouteContext.js` was refactored. It now directly inspects the `loadedStateData` it receives.
        *   If `loadedStateData` is provided, it extracts values from `loadedStateData.headerSettings` (with fallbacks to top-level fields like `loadedStateData.color` or `loadedStateData.thumbnailUrl` if the `headerSettings` object or its specific fields are missing) and then calls `setHeaderSettings` to update the context's internal `headerSettings` state.
        *   If `setCurrentLoadedState(null)` is called (e.g., during `clearCurrentWork`), `headerSettings` are reset to their defaults.
    *   **Outcome:** This change ensures that whenever `currentLoadedState` is updated, the `headerSettings` state within `RouteContext` is also updated consistently and correctly, leading to proper display in `MapHeader.js`.

## Overall

The core framework for differentiating auto-save targets and managing the application state accordingly is in place. The system now correctly handles auto-saving for both new work and edits to existing permanent routes. Photos are correctly saved and loaded, and header settings are applied as expected when routes are loaded. The main remaining step is comprehensive testing of all user flows and scenarios, particularly the `user_route_index` updates.
