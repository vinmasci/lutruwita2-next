# Authentication Token Refresh Implementation

## Problem

Users were experiencing an issue where the avatar status showed they were logged in (with a green checkmark), but they couldn't load maps because the system reported they were not logged in. This inconsistency occurred because:

1. The UI state (avatar with green checkmark) was based on the Auth0 client-side state (`isAuthenticated` from the Auth0 React hook)
2. API requests used `getAccessTokenSilently()` to get a fresh token for each request
3. If the token was expired or invalid, the API would reject the request with a 401/403 error
4. However, the UI state wasn't updated to reflect this authentication failure

This created a confusing user experience where the UI indicated the user was logged in, but API requests failed due to authentication issues.

## Solution

We've implemented a comprehensive solution that addresses this issue by:

1. Creating an `AuthenticationManager` in the route service that:
   - Tracks token refresh times
   - Handles authentication errors
   - Dispatches custom events for authentication state changes

2. Developing a custom `AuthContext` that:
   - Wraps the Auth0 context
   - Listens for authentication events
   - Synchronizes the UI state with the actual authentication state
   - Provides methods for checking authentication and refreshing tokens

3. Enhancing the `Auth0Login` component to:
   - Use our custom AuthContext instead of Auth0 directly
   - Periodically check authentication status
   - Display authentication error messages
   - Provide visual feedback when authentication issues occur

4. Improving error handling in API requests to:
   - Detect authentication failures (401/403 responses)
   - Trigger appropriate authentication events
   - Provide clear error messages to the user

## How It Works

### Token Refresh and Validity Checking

The system now proactively checks token validity:

1. The `AuthenticationManager` tracks when tokens were last refreshed
2. Before making API requests, it checks if the token might be expiring soon (within 10 minutes of the 1-hour expiry)
3. If needed, it refreshes the token before proceeding with the request
4. A periodic check (every 5 minutes) also ensures tokens are refreshed before they expire

### Authentication State Synchronization

When authentication issues occur:

1. The `AuthenticationManager` detects the error and dispatches a custom event
2. The `AuthContext` listens for these events and updates the UI state accordingly
3. The `Auth0Login` component displays an error message and updates the visual indicators

### Error Handling

API requests now have improved error handling:

1. 401/403 responses are specifically detected and handled as authentication failures
2. Authentication errors trigger appropriate UI updates
3. Users are prompted to re-login when necessary

## Testing the Solution

To verify the solution works correctly:

1. **Normal Login Flow**: Log in normally and verify that the avatar shows a green checkmark and you can access maps.

2. **Token Expiration Handling**: 
   - The system will automatically refresh tokens before they expire
   - You can simulate token expiration by opening the browser console and running:
     ```javascript
     localStorage.removeItem('auth0.is.authenticated');
     ```
   - Then try to load a map - the system should detect the authentication issue and prompt you to log in again

3. **Authentication Error Feedback**:
   - When authentication errors occur, you should see:
     - A red error message near the avatar
     - The avatar status indicator changing to a red X
     - A prompt to log in again

## Benefits

This implementation provides several benefits:

1. **Consistent User Experience**: The UI state now accurately reflects the actual authentication state
2. **Proactive Token Management**: Tokens are refreshed before they expire, reducing authentication failures
3. **Clear Error Feedback**: Users receive clear feedback when authentication issues occur
4. **Automatic Recovery**: The system can automatically recover from many authentication issues

## Technical Implementation Details

The solution consists of three main components:

1. **routeService.js**: Enhanced with the `AuthenticationManager` that handles token refresh and authentication errors
2. **AuthContext.js**: A new context provider that wraps Auth0 and provides synchronized authentication state
3. **Auth0Login.js**: Updated to use the new AuthContext and provide better error feedback

These components work together to ensure a consistent authentication experience throughout the application.
