# User Profile Implementation

This document outlines the implementation of the user profile functionality in the application.

## Overview

The user profile functionality allows users to:
- View their profile information
- Edit their profile details (name and website)
- Log out of their account
- Save profile changes to the database

The implementation consists of:
1. A modal dialog that appears when users click on their avatar in the sidebar
2. API endpoints for fetching and updating user data
3. MongoDB storage for user profile information

## Components

### Frontend Components

#### UserProfileModal

Located at `src/features/auth/components/UserProfileModal/UserProfileModal.jsx`

This component provides a modal dialog for viewing and editing user profile information. It includes:
- Display of user's avatar (from Auth0)
- Form fields for name, email, and website
- Logout button
- Save and cancel buttons
- Loading indicators and error handling

#### Auth0Login

Located at `src/features/auth/components/Auth0Login/Auth0Login.js`

This component has been modified to:
- Display the user's avatar in the sidebar
- Open the UserProfileModal when the avatar is clicked (instead of logging out)
- Show login/logout status indicators

### Backend Components

#### User API Endpoint

Located at `api/user/index.js`

This file defines:
- MongoDB schema for user data
- API handlers for GET and POST requests
- Integration with Redis for caching

#### User Routes

Located at `api/routes/user.js`

This file routes API requests to the appropriate handlers.

## Data Flow

1. When a user clicks their avatar in the sidebar, the UserProfileModal opens
2. The modal fetches the user's data from the API
3. The user can edit their profile information (name and website)
4. When the user clicks "Save Changes", the data is sent to the API
5. The API updates the MongoDB database and Redis cache
6. The modal displays a success message and closes

## Authentication

The user profile functionality integrates with Auth0 for authentication:
- User ID is obtained from Auth0
- Basic profile information (name, email, picture) comes from Auth0
- Additional profile fields (website) are stored in our database
- Logout functionality is provided through Auth0

## Database Schema

The user data is stored in MongoDB with the following schema:

```javascript
{
  userId: String,       // Auth0 user ID (primary key)
  name: String,         // User's name
  email: String,        // User's email
  website: String,      // User's website
  createdAt: Date,      // When the record was created
  updatedAt: Date       // When the record was last updated
}
```

## Caching

User data is cached in Redis to improve performance:
- Cache key format: `user-data:{userId}`
- Cache duration: 1 hour (3600 seconds)
- Cache is invalidated when user data is updated

## Future Improvements

Potential future enhancements to the user profile functionality:
- Add profile picture upload capability (currently using Auth0 picture)
- Add social media links
- Implement user preferences (theme, notifications, etc.)
- Add user roles and permissions
- Implement email verification for changes
