# Serverless Function Troubleshooting

## Issues Identified and Fixed

### 1. Missing Dependencies

We identified and installed several missing dependencies that were required by the serverless functions:

- **ioredis**: Required for Redis connection in api/lib/redis.js
- **jsonwebtoken**: Required for JWT verification in api/lib/middleware.js
- **express-fileupload**: Required for file upload handling in api/lib/middleware.js
- **cors**: Required for CORS handling in api/lib/middleware.js

### 2. Module Import Issues

We fixed module import issues in the serverless functions:

- **CommonJS vs ESM Module Issue**: The jsonwebtoken package is a CommonJS module, but we were trying to import it using ESM syntax in middleware.js. We fixed this by changing:
  ```javascript
  import { verify } from 'jsonwebtoken';
  ```
  to:
  ```javascript
  import pkg from 'jsonwebtoken';
  const { verify } = pkg;
  ```

- **Missing File Extensions**: We added .js extensions to imports in middleware.js:
  ```javascript
  import { connectToDatabase } from './db';
  ```
  to:
  ```javascript
  import { connectToDatabase } from './db.js';
  ```

### 3. Environment Variables

We added the Redis URL to the environment variables in .env.local:
```
# Redis URL for serverless functions
REDIS_URL=redis://localhost:6379
```

## Current Status

The serverless functions are now loading without syntax or import errors, but we're still encountering an issue with the MongoDB connection:

```
API error: Error: MONGODB_URI environment variable is not defined
```

This suggests that the environment variables are not being properly loaded or accessed by the serverless functions.

## Next Steps

1. **Fix Environment Variable Access**: Ensure that the MongoDB URI is properly loaded and accessible by the serverless functions. This might involve:
   - Checking how environment variables are loaded in the Vercel dev environment
   - Verifying that the .env.local file is being properly loaded
   - Ensuring that the MongoDB URI is correctly formatted and accessible

2. **Test API Endpoints**: Once the environment variables are properly configured, test all API endpoints to ensure they're working correctly.

3. **Complete SSE to Polling Migration**: Replace Server-Sent Events (SSE) with polling for GPX processing to eliminate dependency on the Express server.

4. **Comprehensive Testing**: Test all features to ensure they work correctly with the serverless functions.

## Running Both Servers During Transition

During the transition period, you may need to run both the Express server and the Vercel dev server:

1. **Express Server**: Handles features that haven't been fully migrated to serverless yet, such as GPX processing with SSE.
2. **Vercel Dev Server**: Handles the frontend and the serverless functions that have been migrated.

This dual-server approach allows you to gradually migrate features while ensuring the application remains functional.

## Long-term Solution

The long-term solution is to complete the migration to serverless functions and eliminate the dependency on the Express server. This involves:

1. **Completing the SSE to Polling Migration**: Replace all Server-Sent Events with polling or WebSockets.
2. **Ensuring All API Endpoints Work with Serverless**: Test and fix any remaining issues with the serverless functions.
3. **Deploying to Vercel**: Deploy the application to Vercel and test in a production-like environment.
