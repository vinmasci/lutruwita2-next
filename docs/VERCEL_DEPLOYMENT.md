# Vercel Deployment Guide

This document provides instructions for deploying the Lutruwita2 application to Vercel.

## Overview

The Lutruwita2 application has been migrated to a serverless architecture using Vercel. This migration includes:

1. Converting Express.js routes to serverless functions
2. Implementing connection pooling for MongoDB and Redis
3. Moving from local file storage to S3
4. Optimizing state management for serverless environments

## Prerequisites

Before deploying to Vercel, you need:

1. A Vercel account
2. The Vercel CLI installed (`npm install -g vercel`)
3. MongoDB Atlas database (or another MongoDB provider)
4. Redis instance (e.g., Redis Labs, Upstash)
5. AWS S3 bucket for file storage
6. Auth0 account for authentication

## Environment Variables

The following environment variables need to be set in your Vercel project:

### Database
- `MONGODB_URI`: MongoDB connection string

### Redis
- `REDIS_URL`: Redis connection string

### AWS S3
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `S3_BUCKET_NAME`: S3 bucket name

### Auth0
- `AUTH0_DOMAIN`: Auth0 domain
- `AUTH0_CLIENT_ID`: Auth0 client ID
- `AUTH0_CLIENT_SECRET`: Auth0 client secret
- `AUTH0_AUDIENCE`: Auth0 API audience
- `AUTH0_CALLBACK_URL`: Auth0 callback URL

### Mapbox
- `MAPBOX_TOKEN`: Mapbox API token

### Application
- `NODE_ENV`: Environment (production)
- `API_URL`: API URL (usually the same as your Vercel deployment URL)
- `CORS_ORIGIN`: Allowed CORS origins

## Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Initialize Vercel Project (First Time Only)

```bash
vercel init
```

Follow the prompts to set up your project.

### 4. Set Environment Variables

```bash
vercel env add
```

Add all the required environment variables listed above.

### 5. Deploy to Vercel

```bash
vercel --prod
```

This will deploy your application to Vercel's production environment.

## Project Structure

The serverless functions are organized as follows:

- `api/health/index.js`: Health check endpoint
- `api/gpx/index.js`: GPX route processing
- `api/photos/index.js`: Photo management
- `api/poi/index.js`: Points of Interest
- `api/routes/index.js`: Route management
- `api/routes/public/index.js`: Public route access

## Serverless Considerations

### Cold Starts

Serverless functions may experience cold starts. To minimize the impact:

- Keep functions small and focused
- Use connection pooling for databases
- Cache frequently accessed data

### State Management

Serverless functions are stateless. Any state that needs to persist between invocations should be stored in:

- MongoDB for permanent data
- Redis for temporary data and caching

### File Storage

All file operations use S3 instead of the local filesystem:

- Direct uploads to S3 for large files
- Presigned URLs for client-side uploads
- Temporary files are avoided where possible

## Monitoring and Debugging

Vercel provides built-in monitoring and logging:

1. **Logs**: Access function logs in the Vercel dashboard
2. **Metrics**: Monitor function performance and errors
3. **Alerts**: Set up alerts for errors and performance issues

## Rollback Plan

If issues occur with the Vercel deployment:

1. Identify the problem using Vercel logs
2. Fix the issue and redeploy
3. If necessary, roll back to a previous deployment using the Vercel dashboard
4. For critical issues, revert to the original deployment method

## Local Development

For local development:

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Test serverless functions: `vercel dev`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check MongoDB connection string
   - Ensure IP allowlist includes Vercel's IPs

2. **Redis Connection Errors**:
   - Verify Redis URL
   - Check Redis connection limits

3. **S3 Access Errors**:
   - Confirm AWS credentials
   - Check S3 bucket permissions

4. **Function Timeouts**:
   - Optimize database queries
   - Implement pagination for large datasets
   - Use background processing for long-running tasks

5. **Memory Limits**:
   - Reduce bundle size
   - Optimize memory usage
   - Increase function memory in vercel.json if needed
