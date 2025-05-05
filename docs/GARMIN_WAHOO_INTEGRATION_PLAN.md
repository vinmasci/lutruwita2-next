# Garmin Connect & Wahoo Cloud Route Sync Integration Plan

## 1. Goal

To enable users of the Lutruwita mobile app to seamlessly send routes they have saved or are viewing within the app directly to their Garmin or Wahoo cycling computers via the respective cloud platforms (Garmin Connect, Wahoo Cloud).

## 2. Approach: Cloud API Integration

Instead of direct device communication (BLE/ANT+), we will integrate with the official cloud APIs provided by Garmin and Wahoo. This involves:

1.  **Authentication:** Using OAuth 2.0 to allow users to securely authorize Lutruwita to access their Garmin/Wahoo accounts.
2.  **API Interaction:** Using the authorized access to push route data (converted to the appropriate format) to the user's account via the Garmin/Wahoo APIs.
3.  **Backend Focus:** Most of the complex logic (authentication, API communication, route conversion) will reside in the Lutruwita backend API.
4.  **Frontend Support:** The mobile app will provide the user interface for initiating the account linking (OAuth flow) and triggering the "Send to Device" action.

## 3. Key Components & Implementation Steps

### 3.1. Research & Setup

*   **[Backend/Research]** Investigate Garmin Developer Program:
    *   Confirm availability and capabilities of the Garmin Connect API, specifically for uploading courses/routes.
    *   Understand API requirements, rate limits, data formats (GPX, FIT), and terms of service.
    *   Register Lutruwita as an application to obtain API keys/secrets.
*   **[Backend/Research]** Investigate Wahoo Developer Options:
    *   Determine if Wahoo provides a similar public API for uploading routes to their cloud platform.
    *   If available, understand its requirements and register the application. (If not available, initial focus will be Garmin only).

### 3.2. Backend Development (API - `api/`)

*   **[Backend]** Implement OAuth 2.0 Flow:
    *   Add endpoints to initiate the OAuth flow for Garmin (and Wahoo if applicable).
    *   Implement callback endpoints to handle the redirect from Garmin/Wahoo after user authorization.
    *   Securely exchange authorization codes for access and refresh tokens.
    *   Store tokens securely, associated with the Lutruwita user account.
    *   Handle token refresh logic.
*   **[Backend]** Develop Route Conversion Service:
    *   Create utility functions to convert Lutruwita's internal route representation (likely GeoJSON) into GPX format.
    *   Investigate feasibility and necessity of converting to FIT format (often preferred by devices, but more complex).
*   **[Backend]** Implement Garmin/Wahoo API Client:
    *   Create service modules to interact with the Garmin Connect Courses API (and Wahoo's equivalent).
    *   Implement functions to upload the converted route file (GPX/FIT) using the user's stored OAuth token.
    *   Include robust error handling for API requests (authentication errors, rate limits, invalid data, etc.).
*   **[Backend]** Expose New API Endpoint:
    *   Create a new authenticated endpoint (e.g., `POST /api/user/routes/:routeId/send-to-device`) that accepts a target platform (Garmin/Wahoo) and triggers the conversion and upload process.

### 3.3. Frontend Development (Mobile App - `mobile/lutruwita-mobile/`)

*   **[Frontend]** Implement Account Linking UI:
    *   Add settings section in the Profile screen for connecting/disconnecting Garmin/Wahoo accounts.
    *   Buttons to initiate the OAuth flow, likely opening a WebView or system browser to the Garmin/Wahoo authorization page.
    *   Handle the redirect back into the app after authorization (may require deep linking setup via Expo config plugins).
    *   Display connection status.
*   **[Frontend]** Add "Send to Device" Functionality:
    *   Add buttons/menu items on the Route Details screen or Saved Routes screen.
    *   On press, call the new backend endpoint (`/api/user/routes/:routeId/send-to-device`) with the route ID and target platform.
*   **[Frontend]** Provide User Feedback:
    *   Display loading indicators during the API call.
    *   Show success messages or clear error messages based on the backend response.

### 3.4. Testing

*   **Unit/Integration Tests (Backend):** Test OAuth flow logic, route conversion accuracy, and API client interactions (potentially using mocks).
*   **End-to-End Tests:**
    *   Test the full OAuth linking process from the mobile app.
    *   Test sending various routes from the app to Garmin Connect/Wahoo.
    *   Verify routes appear correctly in the Garmin Connect/Wahoo platforms (web/app).
    *   Verify routes sync correctly to physical Garmin/Wahoo devices.
*   **Cross-Platform Testing:** Ensure functionality works on both iOS and Android.

## 4. Technology Stack Considerations

*   **Backend:** Node.js, Express, OAuth 2.0 libraries (e.g., `passport`, `simple-oauth2`), GPX generation library (e.g., `gpx-builder-ts` or custom implementation), potentially FIT SDK/library if needed.
*   **Frontend:** React Native, Expo, React Navigation, potentially `expo-web-browser` or deep linking configuration for OAuth redirects.

## 5. Estimated Complexity

*   **Moderate.** While avoiding direct device communication simplifies the mobile aspect, the backend work involving OAuth, API integration, and data conversion is significant.

## 6. Risks & Open Questions

*   **Wahoo API Availability:** Confirmation needed on whether a suitable public API exists for Wahoo.
*   **API Limitations:** Garmin/Wahoo API rate limits, usage restrictions, or specific data requirements could pose challenges.
*   **Route Conversion Accuracy:** Ensuring accurate conversion of all relevant route data (elevation, cues, points of interest) into GPX/FIT format.
*   **OAuth Implementation:** Correctly and securely implementing OAuth 2.0 flows requires careful attention.
*   **Deep Linking:** Setting up deep linking reliably for OAuth callbacks in Expo might require specific configuration or ejecting.
