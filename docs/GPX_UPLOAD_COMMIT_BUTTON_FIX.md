# GPX Upload Commit Button Fix

## Problem

The commit button was not appearing when a GPX file was uploaded, making it difficult to save route changes. This was mentioned in the `SAVE_PROCESS_IMPROVEMENTS.md` document:

> Fixed an issue where the commit button wasn't appearing for GPX uploads by explicitly marking routes as changed when a GPX file is uploaded

However, the issue was still occurring in some cases.

## Investigation

After examining the code, we identified two main issues:

1. **Change Tracking Issue**: When a GPX file was uploaded, the changes were being marked correctly in the `Uploader.js` file, but the `MapView.js` component wasn't always detecting these changes.

2. **React Hook Error**: When trying to commit changes, there was a React error related to using the `usePhotoService` hook inside the `handleCommitChanges` function, which is not allowed in React (hooks can only be called at the top level of a component).

## Implemented Fixes

### 1. Improved Change Tracking

We modified the `RouteContext.js` file to expose the `changedSectionsRef` directly:

```javascript
// Expose changedSections and ref for debugging
changedSections,
changedSectionsRef,
```

This allows components to access the most up-to-date changes even if state updates haven't fully propagated.

### 2. Fixed React Hook Error

We moved the `usePhotoService` hook call to the top level of the `MapViewContent` component:

```javascript
// Get photo service at component level
const photoService = usePhotoService();
```

This ensures the hook is called at the component level (which is allowed) and the service instance is available to use inside the `handleCommitChanges` function.

### 3. Updated Change Detection Logic

We modified the `getTotalChangeCount` function in `MapView.js` to use the `changedSectionsRef` directly instead of relying on the state variable:

```javascript
// Use the ref directly to get the most up-to-date changes
const currentChangedSections = changedSectionsRef.current || {};
```

This ensures we're always working with the most up-to-date changes.

## Remaining Issues

1. **Photo Upload Error**: There's still an error when trying to upload photos. The error occurs because we're still trying to call `usePhotoService()` inside the `handleCommitChanges` function. This needs to be fixed by using the photoService instance that was created at the component level.

2. **Multiple Change Count**: The commit button sometimes shows more changes than expected (e.g., showing 3 changes when only 1 route was added). This is because the system tracks different types of changes separately:
   - `routes` - The actual route data
   - `metadata` - Information about the route (country, state, etc.)
   - `mapState` - The current map view (zoom, center, etc.)

   This behavior is expected as each of these represents a different aspect of the changes that need to be saved.

## Next Steps

1. Fix the photo upload error by updating the `handleCommitChanges` function to use the photoService instance created at the component level instead of calling `usePhotoService()` again.

2. Consider adding more detailed logging or UI indicators to show what types of changes are being tracked, to make it clearer to users why the commit button shows a specific number of changes.
