# User Data Initialization Investigation

## Problem

When a user logs in, we need to check if they have user data saved in MongoDB. If not, we should create a new user data record for them. However, the API endpoint for this functionality is returning a 500 Internal Server Error.

Error from browser console:
```
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (user, line 0)
[Error] Error fetching user data: – Error: Failed to fetch user data: Internal Server Error — userService.js:20
Error: Failed to fetch user data: Internal Server Error — userService.js:20
	(anonymous function) (userService.js:25)
[Error] Error fetching user data: – Error: Failed to fetch user data: Internal Server Error — userService.js:20
Error: Failed to fetch user data: Internal Server Error — userService.js:20
	(anonymous function) (UserProfileModal.jsx:56)
```

## Investigation Steps

### 1. Verifying MongoDB Connection

We first checked if the MongoDB connection was working correctly by running scripts that connect to the database:

```bash
node create-user-collection.js
```

Output:
```
Connecting to MongoDB...
Connected to MongoDB
UserData collection already exists
Done
```

This confirmed that the MongoDB connection is working correctly and the `userdatas` collection exists.

### 2. Checking for Existing User

We then checked if the user with ID "google-oauth2|104387414892803104975" exists in the database:

```bash
node create-test-user.js
```

Output:
```
Connecting to MongoDB...
Connected to MongoDB
User already exists: {
  _id: new ObjectId('67d4e830231d857096bd1f8d')
  userId: 'google-oauth2|104387414892803104975'
  name: 'Test User'
  email: 'test@example.com'
  website: 'https://example.com'
  createdAt: 2025-03-15T02:38:40.191Z
  updatedAt: 2025-03-15T02:38:40.191Z
  __v: 0
}
```

This confirmed that the user exists in the database.

### 3. Creating a Debug Script

We created a debug script to check the MongoDB connection and user data:

```javascript
// debug-user-api.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  process.exit(1);
}

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

async function debugUserApi() {
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
    
    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
    // Check if the userdatas collection exists
    const userCollection = collections.find(c => c.name === 'userdatas');
    if (userCollection) {
      console.log('UserData collection exists');
    } else {
      console.log('UserData collection does not exist');
    }
    
    // Try to find the user
    const userId = 'google-oauth2|104387414892803104975';
    console.log(`Looking for user with ID: ${userId}`);
    
    try {
      const user = await UserData.findOne({ userId });
      if (user) {
        console.log('User found:', user);
      } else {
        console.log('User not found');
      }
    } catch (findError) {
      console.error('Error finding user:', findError);
    }
    
    // List all users in the collection
    console.log('Listing all users in the collection:');
    try {
      const users = await UserData.find({});
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`- ${user.userId}: ${user.name} (${user.email})`);
      });
    } catch (listError) {
      console.error('Error listing users:', listError);
    }
    
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugUserApi();
```

Running this script confirmed that:
1. The MongoDB connection works
2. The 'userdatas' collection exists
3. The user with ID "google-oauth2|104387414892803104975" exists in the collection
4. We can successfully query the database and retrieve the user

### 4. Testing the API Endpoint

We tested the API endpoint directly using curl:

```bash
curl -X GET "http://localhost:3000/api/user?userId=google-oauth2|104387414892803104975" -v
```

Output:
```
Note: Unnecessary use of -X or --request, GET is already inferred.
*   Trying [::1]:3000...
* Connected to localhost (::1) port 3000
> GET /api/user?userId=google-oauth2|104387414892803104975 HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/8.4.0
> Accept: */*
> 
< HTTP/1.1 500 Internal Server Error
< access-control-allow-origin: *
< access-control-allow-methods: GET, POST, OPTIONS
< access-control-allow-headers: Content-Type, Authorization
< cache-control: public, max-age=0, must-revalidate
< server: Vercel
< x-vercel-id: dev1::dev1::56r68-1742015831950-daed4f4c1e4a
< x-vercel-cache: MISS
< content-type: text/plain; charset=utf-8
< Date: Sat, 15 Mar 2025 05:17:11 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< Content-Length: 56
< 
A server error has occurred

FUNCTION_INVOCATION_FAILED
* Connection #0 to host localhost left intact
```

This confirmed that the API endpoint is returning a 500 Internal Server Error with the message "FUNCTION_INVOCATION_FAILED".

### 5. Checking Auth0 Configuration

We checked the Auth0 configuration in api/lib/auth0.js and found that it's using a simple in-memory cache for user data rather than making real Auth0 API calls. This should be quite reliable and not the cause of the issue.

### 6. Improving Error Handling in API

We updated the API endpoint code in api/user/index.js to add more detailed logging and error handling:

1. Added a `safelyFindUser` function to handle errors when finding a user
2. Added more detailed error handling in the getUserData and updateUserData functions
3. Added fallback mechanisms to return data even when database operations fail
4. Added more detailed logging to help diagnose issues

## Possible Causes

1. **Serverless Function Limitations**: The API is running in a serverless environment (Vercel), which has limitations on memory, execution time, and environment variables. The error "FUNCTION_INVOCATION_FAILED" suggests that the serverless function is failing to execute properly.

2. **Environment Variables**: The API might not have access to the same environment variables as local scripts. When running scripts like `create-test-user.js` locally, they have access to the local `.env` file, but the serverless function might not have the same environment variables configured.

3. **MongoDB Connection**: While local scripts can connect to MongoDB, the serverless function might be having issues with the connection. This could be due to network connectivity, authentication, or configuration issues.

4. **Code Execution Context**: The API code runs in a different context than local scripts. It's running in a serverless environment, which has different limitations and behaviors.

5. **Auth0 Configuration**: There might be issues with the Auth0 configuration or how it's being used in the API.

## Next Steps

1. **Client-Side Fallback**: Update the client-side code to handle API errors gracefully and use a fallback mechanism, such as localStorage, when the API fails.

2. **Serverless Function Debugging**: Add more detailed logging to the serverless function to help diagnose the issue.

3. **Environment Variable Check**: Ensure that all required environment variables are properly configured in the Vercel environment.

4. **MongoDB Connection Optimization**: Optimize the MongoDB connection code to be more resilient to connection issues.

5. **Auth0 Integration Review**: Review the Auth0 integration to ensure it's properly configured and used.
