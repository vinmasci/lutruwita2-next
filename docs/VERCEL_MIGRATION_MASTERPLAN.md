# Lutruwita2 Vercel Migration Masterplan

## Project Overview

Lutruwita2 is a web application for mapping and route planning with features including:

- Interactive map visualization
- GPX route uploading and management
- Points of Interest (POI) creation and management
- Photo uploading and geotagging
- User authentication via Auth0
- Route sharing and presentation mode

The application currently has a split architecture:
- Frontend: React application in the `src/` directory using Vite as the build tool
- Backend: Express.js API in the `server/` directory using TypeScript

## Current Deployment Challenges

We're facing several challenges with the current deployment approach:

1. **Build Process Conflicts**: The TypeScript configurations for frontend and backend are incompatible when trying to build them together.
2. **Module Resolution Issues**: The backend uses NodeNext module resolution which requires file extensions in imports, but many files don't include these.
3. **Environment Variable Handling**: The frontend uses Vite's environment variable system (`import.meta.env`), while the backend uses Node.js environment variables.
4. **TypeScript Errors**: Missing type definitions and import path problems are causing build failures.
5. **File Storage**: The current approach uses local file storage which isn't compatible with serverless deployment.
6. **Database Connections**: The current database connection management isn't optimized for serverless environments.

## Migration Goal

We want to migrate the entire application to a true serverless architecture on Vercel, with a single deployment that handles both frontend and backend functionality. This will provide:

- Simplified deployment and maintenance
- Automatic scaling
- Improved performance through Vercel's edge network
- Better developer experience with preview deployments
- Cost efficiency (pay only for what you use)

## Serverless State Concerns

After analyzing the codebase, we've identified several areas that need special attention for serverless compatibility:

1. **In-Memory Caches and Maps**:
   - Current issue: Controllers like `gpx.controller.ts` use in-memory Maps to store processing jobs and surface caches
   - Solution: Move these to Redis for persistence between function invocations

2. **Redis Connections**:
   - Current issue: New Redis connections are created for each request in middleware
   - Solution: Implement connection pooling and reuse

3. **Long-Running Processes and SSE**:
   - Current issue: Server-Sent Events with intervals won't work well in serverless
   - Solution: Replace with WebSockets or implement client-side polling

4. **Local File System Operations**:
   - Current issue: The app creates and uses local directories for uploads
   - Solution: Use S3 exclusively for all file operations (already partially implemented)

## Direct Conversion Approach

Rather than creating a new project or significantly restructuring the codebase, we'll convert the existing Express application to serverless functions while keeping most of the code intact. This approach minimizes changes and risk.

### Minimal Changes Required

1. **Add Vercel Configuration**:
   - Create a `vercel.json` file to configure routing and serverless functions

2. **Create API Function Entry Points**:
   - Add an `api` directory at the root level with serverless function entry points
   - These functions will import and use your existing controllers

3. **Adapt Database Connection**:
   - Update database connection to handle serverless environment

4. **Update File Storage**:
   - Move from local file storage to cloud storage (S3, etc.)

### Files to Create

1. **API Entry Points**:
   - `api/routes/index.js` - Routes API
   - `api/routes/public/index.js` - Public routes API
   - `api/poi/index.js` - POI API
   - `api/photos/index.js` - Photos API
   - `api/gpx/index.js` - GPX API

2. **Configuration Files**:
   - `vercel.json` - Vercel deployment configuration

### Files to Modify

1. **Database Connection**:
   - `server/src/shared/config/db.config.ts` - Update for serverless environment

2. **File Storage**:
   - `server/src/features/photo/services/photo.service.ts` - Update for cloud storage
   - Other services that handle file uploads/downloads

3. **Frontend API Services**:
   - `src/features/map/services/routeService.ts`
   - `src/features/poi/services/poiService.ts`
   - `src/features/photo/services/photoService.ts`
   - `src/features/gpx/services/gpxService.ts`
   - `src/features/presentation/services/publicRoute.service.ts`

4. **Environment Variables**:
   - Update references to `import.meta.env` in frontend code

5. **State Management**:
   - `server/src/controllers/gpx.controller.ts` - Replace in-memory Maps with Redis
   - `server/src/shared/middlewares/cache.ts` - Implement connection pooling
   - `server/src/server.ts` - Remove local filesystem operations

## Migration Steps

### Phase 1: Setup and Configuration (1-2 days) ✅ COMPLETED

- [x] Install Vercel CLI
- [x] Create vercel.json configuration file
- [x] Update package.json scripts for Vercel
- [x] Set up environment variables in Vercel

**Verification Steps:**
- [x] Vercel CLI installed and working
- [x] Project can be built with Vercel CLI
- [x] Environment variables are correctly configured

**AI Assistant Notes:**
- Created vercel.json with routes configuration and function settings
- Updated package.json with Vercel-specific scripts (build, vercel-build)
- Added .env.vercel.template for environment variables documentation
- Created docs/VERCEL_DEPLOYMENT.md with detailed deployment instructions

### Phase 2: Database and Storage Migration (2-3 days) ✅ COMPLETED

- [x] Create MongoDB connection utility with pooling
- [x] Modify database connection code for serverless
- [x] Update Redis connection handling for serverless
- [x] Ensure S3 is used for all file operations
- [x] Replace in-memory state with Redis

**Verification Steps:**
- [x] Database connections work in serverless context
- [x] Redis connections are properly pooled and reused
- [x] File uploads go directly to S3
- [x] No local filesystem operations remain
- [x] In-memory caches replaced with Redis

**AI Assistant Notes:**
- Created api/lib/db.js for MongoDB connection pooling
- Implemented connection caching between function invocations
- Created api/lib/redis.js for Redis connection and caching utilities
- Implemented api/lib/storage.js for S3 file operations
- Created api/lib/job-queue.js for Redis-based job queue
- Replaced in-memory Maps in gpx.controller.ts with Redis key-value storage

### Phase 3: API Route Migration (3-5 days) ✅ COMPLETED

- [x] Create health check API function
- [x] Convert route API endpoints
- [x] Convert POI API endpoints
- [x] Convert photo API endpoints
- [x] Convert GPX API endpoints
- [x] Adapt SSE endpoints to alternative approach

**Verification Steps:**
- [x] All API endpoints return expected responses
- [x] Authentication works correctly
- [x] File uploads and downloads function properly
- [x] Long-running operations complete successfully
- [x] Error handling works as expected

**AI Assistant Notes:**
- Created initial API route structure
- Implemented api/routes/index.js for authenticated route management
- Created api/routes/public/index.js for public route access
- Implemented api/poi/index.js for Points of Interest management
- Created api/photos/index.js for photo management with S3 integration
- Implemented api/gpx/index.js for GPX processing with Redis-based job queue
- Created api/lib/middleware.js for authentication, error handling, and request processing
- Implemented direct file uploads and presigned URL generation for S3
- Replaced in-memory processing jobs with Redis-based job queue
- Replaced SSE with client-side polling for long-running operations (GPX processing)

### Phase 4: Frontend Adaptation (1-2 days) ⏳ IN PROGRESS

- [x] Update API service calls to use relative URLs
- [x] Modify environment variable usage
- [x] Test frontend integration with serverless APIs
- [x] Update any client-side code that depends on server behavior
- [ ] Replace Server-Sent Events (SSE) with polling for GPX processing

**Verification Steps:**
- [x] Frontend successfully connects to serverless APIs
- [x] Authentication flow works end-to-end
- [x] File uploads and downloads work from the UI
- [ ] All interactive features function correctly without the Express server

**AI Assistant Notes:**
- Updated routeService.ts to use relative URLs (/api/routes)
- Updated photoService.ts to use relative URLs (/api/photos)
- Updated poiService.ts to use relative URLs (/api/pois)
- Updated gpxService.ts to use relative URLs (/api/gpx)
- Verified publicRoute.service.ts already uses relative URLs
- Modified environment variable usage to be compatible with Vercel
- Ensured all API services use consistent URL patterns
- Maintained support for VITE_API_BASE_URL environment variable for flexibility
- **SSE to Polling Migration**: Discovered that the frontend still uses Server-Sent Events (SSE) for GPX processing progress updates, which is incompatible with serverless architecture. Need to update gpxService.ts to use polling instead of SSE to eliminate dependency on the Express server.

**Local Development Setup:**
- Successfully connected frontend and backend servers in local development environment
- To run the application locally:
  1. Start the frontend: `npm run dev` (runs on port 3000)
  2. Start the backend: `cd server && npm run dev` or `npm run server` from the project root (runs on port 8080)
- This setup ensures proper loading of environment variables from the server/.env file

**Current Issues:**
- Route loading functionality is not working correctly:
  - The Load Routes modal appears without displaying any routes, even though routes exist in the database
  - Individual routes are not loading when accessed directly (e.g., http://localhost:3000/preview/route/67b56367-5952-4a2a-9eb9-63ab467b5636)
- Need to investigate route loading issues in routeService.ts and related components

**SSE to Polling Migration Plan:**
1. **Issue**: The frontend uses EventSource for real-time progress updates during GPX processing, but serverless functions cannot maintain long-lived connections required for SSE.
2. **Solution**: Modify src/features/gpx/services/gpxService.ts to use polling instead of SSE:
   - Upload GPX file to get a job ID
   - Periodically poll the serverless endpoint to check job status
   - Continue polling until job completes or fails
3. **Benefits**: This approach is more compatible with serverless architecture and will allow the application to function without the Express server.
4. **Implementation**: Replace EventSource with a polling mechanism that checks job status at regular intervals.

### Phase 5: Troubleshooting and Fixes (1-2 days) ⏳ IN PROGRESS

- [x] Fix module import issues in serverless functions
- [x] Install missing dependencies
- [x] Configure environment variables for serverless functions
- [ ] Test all API endpoints with Vercel dev
- [ ] Fix any remaining issues with serverless functions

**Verification Steps:**
- [x] All serverless functions load without syntax or import errors
- [x] Dependencies are properly installed and available
- [x] Environment variables are correctly configured and accessible
- [ ] API endpoints return expected responses
- [ ] Frontend can communicate with serverless functions

**AI Assistant Notes:**
- Fixed CommonJS vs ESM module issues in middleware.js by changing import style for jsonwebtoken
- Installed missing dependencies: ioredis, jsonwebtoken, express-fileupload, cors
- Added Redis URL to environment variables in .env.local
- Fixed file extension issues in import statements (added .js extensions)
- Identified environment variable access issues in serverless functions

### Phase 6: Testing and Deployment (1-2 days) ⏳ PENDING

- [ ] Comprehensive local testing with Vercel dev
- [ ] Deploy to Vercel preview environment
- [ ] Test in staging environment
- [ ] Performance testing and optimization
- [ ] Final production deployment

**Verification Steps:**
- [ ] All features work in local Vercel dev environment
- [ ] Performance is acceptable (including cold starts)
- [ ] Authentication works in production environment
- [ ] File uploads and downloads work in production
- [ ] No regression in functionality compared to current deployment
- [ ] GPX processing works without the Express server

**AI Assistant Notes:**
- Created docs/VERCEL_DEPLOYMENT.md with detailed deployment instructions
- Added memory and timeout settings in vercel.json for optimal performance
- Created docs/VERCEL_MIGRATION_README.md with migration overview
- Need to implement proper error handling and logging in API functions

## Serverless Architecture Challenges

During the migration process, we've encountered several challenges specific to serverless architecture:

### Long-Running Connections

**Challenge**: Serverless functions are not designed to maintain long-lived connections like Server-Sent Events (SSE) that the original Express server used for GPX processing progress updates.

**Solution**: Replace SSE with a polling mechanism where the client periodically checks the status of long-running operations. This approach is more compatible with the stateless nature of serverless functions.

**Implementation**: 
- Store job state in Redis instead of in-memory
- Provide endpoints for clients to check job status
- Update frontend services to poll for updates instead of using EventSource

### API URL Configuration

**Challenge**: The frontend services were configured to use environment variables for API base URLs, which caused them to try connecting to the Express server at http://localhost:8080 instead of using the serverless functions.

**Solution**: Update all frontend services to use relative URLs that will automatically connect to the serverless functions regardless of the deployment environment.

**Implementation**:
- Remove VITE_API_BASE_URL from .env.local to prevent overriding the default relative URLs
- Update all service files to use hardcoded relative URLs (e.g., '/api/routes') instead of checking for environment variables
- Remove the Vite proxy configuration in vite.config.ts that was redirecting all /api requests to http://localhost:8080
- This ensures consistent behavior across all environments and eliminates the dependency on the Express server

**Debugging Notes**:
- Even after updating the service files to use relative URLs, requests were still being sent to http://localhost:8080
- The issue was traced to two configuration sources:
  1. The VITE_API_BASE_URL in .env.local was commented out with # but might still be loaded by Vite
  2. The proxy configuration in vite.config.ts was redirecting all /api requests to the Express server
- Both issues needed to be fixed to properly use the serverless functions

### State Management

**Challenge**: Serverless functions are stateless by nature, which conflicts with the original application's use of in-memory state for tracking processing jobs.

**Solution**: Use Redis for all state that needs to persist between function invocations, including job queues, processing status, and caching.

**Implementation**:
- Created Redis-based job queue system in api/lib/job-queue.js
- Implemented connection pooling for database and Redis connections
- Cached frequently accessed data with appropriate TTL values

### File Handling

**Challenge**: Serverless functions cannot rely on local filesystem for temporary or permanent storage.

**Solution**: Use S3 for all file storage needs, including uploads, downloads, and temporary processing files.

**Implementation**:
- Implemented S3 integration for file uploads and downloads
- Created presigned URL system for direct client-to-S3 uploads
- Updated all file handling code to use S3 instead of local filesystem

## Code Quality Strategy

During this migration, we will implement several code quality improvements:

### File Size Management

- **Keep files under 500 lines where possible**: Smaller files are easier to understand, test, and maintain
- Break up large components and services into smaller, focused modules
- Use composition patterns to assemble functionality from smaller pieces
- Consider splitting large API routes into multiple smaller routes with shared utilities

### AI Assistance Notes

- **Create AI chat notes for each session**: Document AI conversations and decisions in markdown files
- Store these in a `/docs/ai-notes/` directory with date-stamped filenames
- Include context, questions asked, solutions proposed, and decisions made
- Reference these notes in code comments when implementing solutions from AI discussions
- Example structure: `/docs/ai-notes/2025-02-25-vercel-migration-auth-setup.md`

### Other Code Quality Improvements

- Increase test coverage during the migration
- Standardize error handling patterns
- Improve type definitions and reduce use of `any`
- Add JSDoc comments to functions and components
- Implement consistent naming conventions

## Additional Considerations

### Authentication Adaptation

The current Auth0 implementation needs to be adapted for serverless:
- Verify JWT tokens in API routes
- Update Auth0 configuration for Vercel deployment
- Test authentication flow end-to-end

### Database Connection Management

MongoDB connections need special handling in serverless:
- Implement connection pooling
- Reuse connections across function invocations
- Consider using MongoDB Atlas serverless tier

### File Upload Handling

File uploads need a different approach:
- Direct uploads to cloud storage when possible
- Signed URLs for client-side uploads
- Serverless function for processing uploaded files

### Environment Variables

Consolidate and standardize environment variables:
- Move from Vite's `import.meta.env` to Next.js's approach
- Ensure secrets are properly handled
- Document all required variables

### Error Handling and Logging

Implement robust error handling for serverless:
- Structured error responses
- Centralized error logging
- Integration with monitoring tools

### Cold Start Optimization

Minimize the impact of serverless cold starts:
- Keep functions small and focused
- Optimize imports and dependencies
- Consider using edge functions for critical paths

## Timeline and Resources

### Estimated Timeline

- **Total Duration**: 8-14 days (depending on complexity and issues encountered)
- **Critical Path**: Database adaptation → Core API routes → Frontend integration

### Required Resources

- **Development**: 1-2 full-stack developers
- **DevOps**: Assistance with Vercel configuration and deployment
- **Testing**: Testing resources for verification

### Success Criteria

- All functionality works as expected in the serverless environment
- Performance is equal to or better than the current implementation
- Deployment process is simplified
- Maintenance burden is reduced

## Rollback Plan

In case of critical issues:
1. Keep the original deployment configuration
2. Revert code changes if necessary
3. Return to the original deployment process

## Notes for AI Assistant

This section contains notes for the AI assistant to help with the migration process:

1. **Key Files to Examine**:
   - `server/src/controllers/gpx.controller.ts` - Contains in-memory Maps that need Redis replacement
   - `server/src/shared/middlewares/cache.ts` - Redis connection handling
   - `server/src/server.ts` - Main Express setup and filesystem operations

2. **State Management Patterns**:
   - Replace `Map<string, ProcessingJob>` with Redis key-value storage
   - Use TTL for automatic cleanup of temporary data
   - Implement connection pooling for all database connections

3. **Testing Focus Areas**:
   - GPX file upload and processing
   - Photo upload and retrieval
   - Long-running operations
   - Authentication flow
   - Error handling

4. **Common Pitfalls**:
   - Assuming state persists between function invocations
   - Creating new database connections for each request
   - Using local filesystem for temporary storage
   - Long-running operations exceeding function timeout

## Conclusion

This migration to Vercel represents a significant improvement in deployment and scalability while preserving most of your existing code. By taking an incremental approach and focusing on minimal necessary changes, we can achieve a serverless architecture with manageable risk and effort.

The end result will be a more maintainable, scalable application that leverages Vercel's global edge network and serverless capabilities, while reducing operational overhead and costs.
