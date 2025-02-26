# Vercel API Fix for Missing Dependencies

## Problem Identified

The error logs from Vercel showed a consistent error pattern:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'jwks-rsa' imported from /var/task/api/lib/middleware.js
```

This error occurred across all API endpoints (/api/routes, /api/routes/public, etc.) and was causing 500 errors. The issue was that the 'jwks-rsa' package was missing in the Vercel deployment, even though it was correctly listed in the main package.json file.

## Root Cause

In Vercel's serverless environment, each API function is deployed as a separate serverless function with its own dependencies. When you're running locally, all dependencies are available in the node_modules folder, but in Vercel's serverless environment, each function only has access to the dependencies that are explicitly included in its deployment.

The main package.json file includes 'jwks-rsa' as a dependency, but Vercel wasn't bundling this dependency with the API functions when deploying.

## Solution Implemented

1. Created a dedicated package.json file for the API functions in the /api directory:
   - This file includes all the necessary dependencies for the API functions, including 'jwks-rsa'
   - This ensures that Vercel knows which dependencies to include when deploying the API functions

2. Updated the vercel.json file to install the API dependencies during the build process:
   - Modified the buildCommand to include `cd api && npm install`
   - This ensures that the API dependencies are installed before the API functions are deployed

## How This Fixes the Issue

1. The dedicated package.json file in the /api directory tells Vercel which dependencies are needed for the API functions
2. The updated build command ensures that these dependencies are installed during the build process
3. When the API functions are deployed, they will have access to all the necessary dependencies, including 'jwks-rsa'

## Deployment Instructions

1. Commit these changes to your repository
2. Push the changes to the branch that's connected to your Vercel deployment
3. Vercel will automatically rebuild and redeploy your application with the new configuration

## Verification

After deployment, you should be able to access the public routes API endpoints without encountering the 500 errors. The logs should no longer show the "Cannot find package 'jwks-rsa'" error.
