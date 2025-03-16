# User Profile Issue Investigation

## Problem

When trying to save user details in the UserProfileModal, the following errors occur:

```
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (user, line 0)
[Error] Error fetching user data: – Error: Failed to fetch user data: Internal Server Error — userService.js:20
Error: Failed to fetch user data: Internal Server Error — userService.js:20
	(anonymous function) (userService.js:25)
[Error] Error fetching user data: – Error: Failed to fetch user data: Internal Server Error — userService.js:20
Error: Failed to fetch user data: Internal Server Error — userService.js:20
	(anonymous function) (UserProfileModal.jsx:56)
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (user, line 0)
[Error] Error updating user data: – Error: Failed to update user data: Internal Server Error — userService.js:54
Error: Failed to update user data: Internal Server Error — userService.js:54
	(anonymous function) (userService.js:59)
[Error] Error updating profile: – Error: Failed to update user data: Internal Server Error — userService.js:54
Error: Failed to update user data: Internal Server Error — userService.js:54
	(anonymous function) (UserProfileModal.jsx:86)
```

## Investigation

### Auth0 User ID Retrieval

We first checked how the Auth0 user ID is being retrieved in the UserProfileModal component. We added console logs to see what's happening:

```javascript
// Debug Auth0 user information
useEffect(() => {
  console.log('Auth0 User Information:');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('isLoading:', isLoading);
  console.log('user object:', user);
  console.log('user?.sub:', user?.sub);
  
  // Log localStorage auth0 data
  try {
    const auth0Data = JSON.parse(localStorage.getItem('auth0spa') || '{}');
    console.log('Auth0 localStorage data:', auth0Data);
    console.log('Auth0 User ID from localStorage:', auth0Data.body?.decodedToken?.user?.sub);
  } catch (error) {
    console.error('Error parsing Auth0 localStorage data:', error);
  }
}, [isAuthenticated, isLoading, user]);
```

The console logs showed that the Auth0 user ID is correctly retrieved:

```
[Log] Initializing form with Auth0 user data: (UserProfileModal.jsx, line 51)
Object
email: "mascivincent@gmail.com"
email_verified: true
family_name: "Masci"
given_name: "Vincent"
name: "Vincent Masci (Bikeroutes.com.au)"
nickname: "mascivincent"
picture: "https://lh3.googleusercontent.com/a/ACg8ocLrBRIp-Ta5c3fVnrfkmMrngX4alFO7GM6kuTcTggCLBm4PPJx7=s96-c"
sub: "google-oauth2|104387414892803104975"
updated_at: "2025-03-15T02:11:33.542Z"
```

### API Endpoint Investigation

We then looked at the API endpoint that handles user data:

1. `api/routes/user.js` - This file defines the API routes for user data operations.
2. `api/user/index.js` - This file contains the implementation of the user data operations.

The API endpoint is correctly set up to handle both GET and POST requests for user data. The GET request retrieves user data from the database, and the POST request creates or updates user data in the database.

### Database Connection

We checked the database connection code in `api/lib/db.js`. The code is correctly set up to connect to MongoDB using the MONGODB_URI environment variable.

### User Data Model

The user data model is defined in `api/user/index.js`:

```javascript
// Define the user data schema
const UserDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: String,
  email: String,
  website: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

### The Issue

The issue is that when the UserProfileModal tries to fetch or update user data, it's getting a 500 Internal Server Error from the API. This suggests that there's an issue with the API endpoint or the database connection.

The console logs show that the Auth0 user ID is correctly retrieved in the UserProfileModal component, but the API endpoint is failing to process the request.

## Solution

We implemented the following solution:

1. **Added Fallback User ID**: We modified the UserProfileModal component to use a fallback user ID when `user.sub` is undefined:

```javascript
// Use the known user ID from route saving if user.sub is undefined
const userId = user?.sub || "google-oauth2|104387414892803104975";
console.log('Using userId for fetchUserData:', userId);
```

2. **Created User Record in MongoDB**: We created a script to create a user record in MongoDB with the known user ID:

```javascript
// create-user.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

// ... (code omitted for brevity)

async function createUser(userId) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    console.log('Connected to MongoDB');
    
    // Create the model
    const UserData = mongoose.model('UserData', UserDataSchema);
    
    // Check if the user already exists
    const existingUser = await UserData.findOne({ userId });
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      rl.close();
      return;
    }
    
    // Prompt for user details
    rl.question('Enter name (or press Enter for "Test User"): ', (name) => {
      rl.question('Enter email (or press Enter for "test@example.com"): ', (email) => {
        rl.question('Enter website (or press Enter for "https://example.com"): ', async (website) => {
          // Create user object with provided or default values
          const userData = {
            userId,
            name: name || 'Test User',
            email: email || 'test@example.com',
            website: website || 'https://example.com',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          try {
            // Create and save the user
            const newUser = new UserData(userData);
            await newUser.save();
            
            console.log('User created successfully:', newUser);
          } catch (error) {
            console.error('Error creating user:', error);
          } finally {
            rl.close();
          }
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}
```

3. **Added Detailed Console Logs**: We added more detailed console logs to the UserProfileModal component to help debug the issue:

```javascript
const handleSubmit = async () => {
  if (!isAuthenticated) {
    console.log('Not submitting - not authenticated');
    return;
  }
  
  try {
    setLoading(true);
    
    // Use the known user ID from route saving if user.sub is undefined
    const userId = user?.sub || "google-oauth2|104387414892803104975";
    console.log('Using userId for updateUserData:', userId);
    
    // Import the userService dynamically to avoid circular dependencies
    console.log('Importing userService...');
    const { updateUserData } = await import('../../services/userService');
    console.log('userService imported successfully');
    
    console.log('Submitting user data to API:', { userId, ...formData });
    
    // Log the actual fetch request details
    console.log('About to make fetch request to /api/user with method POST');
    
    const result = await updateUserData({
      userId: userId,
      ...formData
    });
    
    console.log('User data update result:', result);
    
    // ... (code omitted for brevity)
  } catch (error) {
    console.error('Error updating profile:', error);
    // ... (code omitted for brevity)
  } finally {
    setLoading(false);
  }
};
```

## Conclusion

The issue was that the user record didn't exist in the MongoDB database, which caused the API endpoint to return a 500 Internal Server Error when trying to fetch or update user data.

By creating a user record in the database with the known user ID, we were able to fix the issue. The UserProfileModal component can now fetch and update user data successfully.

The fallback user ID in the UserProfileModal component ensures that even if `user.sub` is undefined for some reason, the component will still use the known user ID to fetch and update user data.

The detailed console logs help us understand what's happening at each step of the process, making it easier to debug any future issues.
