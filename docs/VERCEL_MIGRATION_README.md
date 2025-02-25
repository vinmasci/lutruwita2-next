# Lutruwita2 Vercel Migration

This document provides an overview of the Vercel migration for the Lutruwita2 application.

## Migration Overview

The Lutruwita2 application has been migrated from a traditional Express.js server to a serverless architecture using Vercel. This migration offers several benefits:

- **Simplified Deployment**: Single deployment for both frontend and backend
- **Automatic Scaling**: Serverless functions scale automatically based on demand
- **Improved Performance**: Vercel's edge network reduces latency
- **Cost Efficiency**: Pay only for what you use
- **Better Developer Experience**: Preview deployments for each PR

## Architecture Changes

### Before Migration

- **Frontend**: React application using Vite
- **Backend**: Express.js API using TypeScript
- **Deployment**: Separate deployment processes for frontend and backend
- **File Storage**: Local file system
- **State Management**: In-memory Maps and caches

### After Migration

- **Frontend**: React application using Vite (unchanged)
- **Backend**: Vercel serverless functions
- **Deployment**: Single unified deployment through Vercel
- **File Storage**: AWS S3
- **State Management**: Redis for temporary data and caching

## Key Components

### API Routes

The serverless API routes are organized as follows:

- `api/health/index.js`: Health check endpoint
- `api/gpx/index.js`: GPX route processing
- `api/photos/index.js`: Photo management
- `api/poi/index.js`: Points of Interest
- `api/routes/index.js`: Route management
- `api/routes/public/index.js`: Public route access

### Utility Libraries

Several utility libraries have been created to support the serverless functions:

- `api/lib/db.js`: MongoDB connection pooling
- `api/lib/redis.js`: Redis connection and caching utilities
- `api/lib/middleware.js`: Common middleware (CORS, auth, error handling)
- `api/lib/storage.js`: S3 file storage utilities
- `api/lib/job-queue.js`: Redis-based job queue for long-running tasks
- `api/lib/surface-cache.js`: Redis-based caching for surface data

## Migration Changes

### Database Connection

- Implemented connection pooling for MongoDB
- Cached connections between function invocations
- Added retry logic for connection failures

### Redis Integration

- Added connection pooling for Redis
- Created utility functions for caching
- Replaced in-memory Maps with Redis key-value storage

### File Storage

- Moved from local file system to S3
- Implemented presigned URLs for direct uploads
- Added utilities for file management

### Authentication

- Adapted Auth0 integration for serverless
- Implemented JWT verification in API routes
- Created middleware for protected routes

### State Management

- Replaced in-memory state with Redis
- Implemented TTL for automatic cleanup
- Created job queue for long-running operations

## Configuration

### Environment Variables

The application requires several environment variables for configuration. See `.env.vercel.template` for a complete list.

### Vercel Configuration

The `vercel.json` file contains the configuration for the Vercel deployment, including:

- Build commands
- Output directory
- Route configuration
- Function settings (memory, timeout)

## Local Development

For local development:

1. Copy `.env.vercel.template` to `.env.local`
2. Fill in the environment variables
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Test serverless functions: `vercel dev`

## Deployment

For deployment to Vercel:

1. Install Vercel CLI: `npm install -g vercel`
2. Login to Vercel: `vercel login`
3. Set environment variables: `vercel env add`
4. Deploy: `vercel --prod`

See `docs/VERCEL_DEPLOYMENT.md` for detailed deployment instructions.

## Troubleshooting

Common issues and their solutions:

1. **Cold Start Latency**: The first request to a function may be slow due to cold starts. This is normal for serverless functions.

2. **Database Connection Errors**: Ensure your MongoDB connection string is correct and that your IP is allowed in the MongoDB Atlas network settings.

3. **Redis Connection Errors**: Verify your Redis URL and ensure your Redis instance is accessible from Vercel.

4. **S3 Access Errors**: Check your AWS credentials and S3 bucket permissions.

5. **Function Timeouts**: Long-running operations may exceed the function timeout. Consider breaking them into smaller tasks or using background processing.

## Future Improvements

Potential future improvements:

1. **Edge Functions**: Move some functionality to edge functions for even lower latency
2. **Incremental Static Regeneration**: Use ISR for public routes
3. **WebSockets**: Implement WebSockets for real-time updates
4. **Background Processing**: Add more robust background processing for long-running tasks
