# Commit Button Save Dialog Implementation

> **Note**: This document describes an enhancement to the [Save Process Improvements](./SAVE_PROCESS_IMPROVEMENTS.md) system. Please refer to that document for details on the underlying progressive saving system.

## Problem

The current save process in creation mode has two separate UI flows:
1. The floating commit button for quick saves of incremental changes
2. The Save Route dialog for setting metadata like name, type, and visibility

This separation creates inconsistency in the user experience and can lead to validation errors when the commit button tries to save with invalid route types (e.g., 'ride' instead of valid types like 'tourism', 'event', 'bikepacking', or 'single').

## Solution

We've modified the commit button to trigger the same save dialog that's used elsewhere in the application. This provides a consistent user experience and ensures that all required metadata is properly set before saving, while still maintaining the progressive saving system that only uploads changed files.

### Implementation Details

1. **Modified MapView.js**:
   - Added state for the save dialog modal: `isSaveDialogOpen`
   - Modified `handleCommitChanges` to open the save dialog instead of directly saving
   - Added a new function `handleSaveDialogSubmit` to handle the save after the modal is submitted
   - Added the SaveDialog component to the JSX with progress feedback
   - Passed the `uploadProgress` state to the SaveDialog component
   - Added `currentLoadedPersistentId` to the component's dependencies to properly handle editing existing routes

2. **Enhanced SaveDialog.jsx**:
   - Added support for an external progress value via a new `progress` prop
   - Modified the progress tracking to use the external progress when available
   - Maintained the simulated progress as a fallback when no external progress is provided
   - Updated the progress stages based on the current progress value
   - Ensured the dialog shows accurate stage information during the upload process

3. **Improved Data Validation**:
   - The save dialog ensures that the route type is always set to a valid value from the dropdown
   - This prevents validation errors that were occurring when the commit button tried to save with invalid route types
   - Added proper handling of the `isEditing` state based on the `currentLoadedPersistentId`
   - Ensured the save dialog retains the original title of the route when editing existing routes

4. **Enhanced User Experience**:
   - Users now have a consistent experience when saving routes
   - The save dialog provides clear feedback about what information is required
   - Users can set all necessary metadata before saving, even when using the commit button
   - Real-time progress feedback shows the actual upload status with percentage and stage information
   - The dialog displays different text for the save button based on whether it's a new route or an edit

5. **Preserved Progressive Saving**:
   - Maintained the incremental saving approach from the original implementation
   - Still only uploads photos and route elements that have been changed
   - Uses the existing change tracking mechanisms from PhotoContext and RouteContext

## POI Integration (May 2025)

We've enhanced the save dialog to fully integrate Points of Interest (POIs) with the unified saving system:

1. **POI Change Tracking**: The system now includes POI changes in the total change count
2. **Visual Feedback**: The commit button color and count now reflect POI changes alongside photos and route elements
3. **Unified Progress Tracking**: The progress bar now accounts for POI changes during the save process
4. **Consistent Experience**: The same save dialog handles all types of changes, including POIs

This integration completes our unified saving system, providing a consistent and efficient experience for all types of content. For more details on the overall save process improvements, see [Save Process Improvements](./SAVE_PROCESS_IMPROVEMENTS.md).

## Benefits

1. **Consistent User Experience**: The same save dialog is used regardless of how the user initiates a save
2. **Improved Data Validation**: The save dialog ensures that all required fields are properly set
3. **Reduced Errors**: Prevents validation errors by ensuring the route type is always valid
4. **Better Metadata**: Encourages users to provide complete information about their routes
5. **Real-time Feedback**: Shows accurate progress information during the upload process
6. **Efficient Uploads**: Maintains the progressive saving approach, only uploading changed files
7. **Complete Integration**: Now handles all content types (routes, photos, and POIs) in a unified way

## Technical Implementation

The implementation follows a modal-first approach:

1. When the user clicks the commit button, we open the save dialog modal
2. The save dialog collects all necessary metadata from the user
3. When the user submits the dialog, we call the original save function with the collected metadata
4. The save process continues as before, but with validated data and real-time progress feedback

This approach ensures that all saves go through the same validation process, regardless of how they are initiated, while still benefiting from the progressive saving system's efficiency.
