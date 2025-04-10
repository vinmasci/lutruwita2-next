# POI Modal Loading Optimization

## Issue
The Google Places data loading in the POI modal was causing mobile devices to crash in presentation mode. The issue was related to the multi-stage loading approach that was implemented:

1. First, it would show minimal content (contentStage 0) with just a loading spinner
2. After 300ms, it would show basic content (contentStage 1) including the image slider and description
3. After 800ms, it would show all content (contentStage 2) and start loading Google Places data

This multi-stage approach was causing the UI to appear to load, then reload, which created a jarring experience and could lead to crashes on mobile devices due to the rapid state changes and multiple re-renders.

## Root Cause
1. **Multiple Loading Stages**: The staged loading approach (contentStage 0, 1, 2) caused multiple re-renders in quick succession.
2. **Duplicate Delays**: There were two separate delay mechanisms:
   - One in the content staging effect (300ms and 800ms delays)
   - Another in the Google Places data loading function (800ms delay on mobile)
3. **Rapid State Changes**: These multiple delays and stages caused rapid state changes that could overwhelm mobile devices.

## Solution
The solution was to simplify the loading process to a single stage with one delay:

1. **Single Loading State**: Replaced the multi-stage approach (contentStage 0, 1, 2) with a single boolean state `isContentReady`.
2. **Unified Delay**: Implemented a single 600ms delay before showing any content and loading Google Places data.
3. **Simplified Rendering Logic**: Updated all conditional rendering to use the new `isContentReady` state.
4. **Removed Duplicate Delays**: Eliminated the additional delay in the Google Places data loading function.

## Implementation Details
1. Changed from `contentStage` (0, 1, 2) to a simple `isContentReady` boolean state.
2. Implemented a single timeout that:
   - Sets `isContentReady` to true
   - Triggers Google Places data loading
3. Updated all conditional rendering in the JSX to use `isContentReady` instead of checking different `contentStage` values.
4. Removed the additional delay in the `loadGooglePlacesData` function since the delay is now handled in the main effect.

## Benefits
1. **Smoother User Experience**: The content now loads in a single step after a delay, eliminating the perception of content "reloading".
2. **Improved Stability**: The simplified approach reduces the number of state changes and re-renders, which helps prevent crashes on mobile devices.
3. **More Maintainable Code**: The code is now simpler and easier to understand with a single loading state instead of multiple stages.
4. **Consistent Loading**: All content appears at once, creating a more polished and professional user experience.

## Testing
The changes have been tested on mobile devices to ensure:
1. The POI modal opens smoothly without crashing
2. Content appears after the 600ms delay without any "reloading" effect
3. Google Places data loads correctly after the initial content is displayed
4. The user experience is consistent and stable across different mobile devices
