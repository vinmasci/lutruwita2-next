# POI Viewer Refactoring Log (Session: 29/03/2025)

## Initial Goal

The primary objective was to refactor the Point of Interest (POI) interaction flow in the map creation/editing mode. Specifically:

1.  When re-selecting an existing POI marker, the modal that appears (`src/features/poi/components/POIViewer/POIViewer.js`) should be visually updated to match the appearance of the viewer used in presentation mode (`src/features/presentation/components/POIViewer/PresentationPOIViewer.js`).
2.  This updated `POIViewer.js` modal needed to retain all its existing editing capabilities:
    *   Editing POI name and description.
    *   Adding new photos.
    *   Removing newly added photos (before saving).
    *   Deleting the POI.
3.  Additionally, functionality to associate a Google Place with the POI by pasting a Google Maps link (similar to `POIDetailsDrawer.js`) was requested, including a preview of the fetched place data during editing.
4.  Functionality to remove *already saved* photos associated with the POI during editing was also requested.

## Work Done & Issues Encountered

1.  **Initial Analysis:** We examined `POIDetailsModal.jsx`, `PresentationPOIViewer.js`, `MapboxPOIMarker.js`, `POIContext.js`, and `MapView.js` to understand the existing flow. We confirmed that `MapView.js` renders `POIViewer.js` upon re-selecting an existing POI in editing mode.
2.  **Layout Refactor Attempt:** We modified `POIViewer.js` to adopt the layout structure and styling of `PresentationPOIViewer.js`, including integrating the `ImageSlider` component and adding Google Places data fetching/display logic.
3.  **Regression Introduced:** Testing revealed that these changes inadvertently caused a regression in **presentation mode**. POI markers and cluster bubbles became misaligned and appeared to move incorrectly during map zoom transitions.
4.  **Troubleshooting:**
    *   We verified that `MapboxPOIMarker.js` (used by both `POIViewer` and `PresentationPOILayer`) and its associated CSS (`MapboxPOIMarker.styles.css`) were identical to a known working version from GitHub.
    *   We examined `POICluster.js` and its CSS (`POICluster.css`), confirming its marker anchor (`center`) matched the individual markers.
    *   We attempted changing the `anchor` and `offset` in `MapboxPOIMarker.js`, which did not resolve the issue and was reverted.
    *   We attempted changing the CSS `transform-origin` in `MapboxPOIMarker.styles.css`, which also did not resolve the issue and was reverted.
    *   We reverted changes made to `ImageSlider.js` (adding editing props). This did not resolve the issue.
    *   **Resolution:** Reverting `POIViewer.js` completely back to its original state (before any layout changes or Google Places additions) successfully fixed the presentation mode marker/cluster issue.

## Conclusion & Root Cause Analysis

The regression was caused by the modifications made within `src/features/poi/components/POIViewer/POIViewer.js` when attempting to replicate the layout and import components (`ImageSlider`) from the presentation context. The exact conflict is unclear but likely involves subtle interactions between shared styles, component rendering order, or context dependencies when elements designed for the presentation view were introduced into the editing view's modal.

## Current Status

*   `src/features/poi/components/POIViewer/POIViewer.js` has been reverted to its original, stable state.
*   Presentation mode marker and cluster positioning is working correctly.
*   The desired visual changes and Google Places link functionality for the `POIViewer` modal are **not** currently implemented.

## Next Steps (Revised Plan)

To achieve the desired functionality without re-introducing the regression, we will modify the stable, original `POIViewer.js` incrementally:

1.  **Add Google Places Link Functionality:**
    *   Add state variables for the link input, processing status, errors, and preview data.
    *   Add the `TextField` for pasting the Google Maps link (visible only when editing).
    *   Add the debounced logic to process the link using `POIContext.processGooglePlacesLink`.
    *   Add the preview box below the link field (visible only when editing and data is available).
    *   Update `handleSave` to pass the `googlePlacesLink` to `onUpdate`.
    *   **Test presentation mode thoroughly after this step.**
2.  **(If Stable) Re-evaluate Photo Display/Removal:**
    *   Consider adding photo removal for *saved* photos within the existing photo grid structure, rather than integrating `ImageSlider`.
    *   Explore options to improve the photo display (e.g., using a carousel library directly within `POIViewer` instead of the shared `ImageSlider`) if desired, testing carefully for regressions.

This revised, cautious approach prioritizes stability while adding the core required features back into the working component structure.
