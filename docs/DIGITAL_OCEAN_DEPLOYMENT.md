# Deploying to DigitalOcean App Platform

This guide explains how to deploy the application to DigitalOcean App Platform.

## Prerequisites

1. A DigitalOcean account
2. MongoDB Atlas account (or any MongoDB provider)
3. Your application code in a Git repository (GitHub, GitLab, etc.)

## Setup

### 1. Create a MongoDB Database

If you don't already have a MongoDB database:

1. Create a MongoDB Atlas account or use another MongoDB provider
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your MongoDB connection string (it should look like: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`)

### 2. Deploy to DigitalOcean App Platform

1. Log in to your DigitalOcean account
2. Go to the App Platform section
3. Click "Create App"
4. Connect your Git repository
5. Select the branch you want to deploy (e.g., `surface-detection`)
6. Configure the app:
   - Select "Web Service" as the component type
   - Set the build command to: `npm run build`
   - Set the run command to: `npm start`
   - Set the HTTP port to: `8080`

7. Add environment variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB connection string
   - Add any other required environment variables from `.env.local.template`

8. Configure health checks:
   - Set the health check path to: `/health`
   - Set the health check HTTP status code to: `200`

9. Click "Next" and review your app configuration
10. Click "Create Resources" to deploy your app

## Troubleshooting

### Health Check Failures

If your app fails health checks:

1. Check the app logs in the DigitalOcean dashboard
2. Verify that the `/health` endpoint is accessible
3. Make sure your app is listening on the correct port (8080 or the port specified by the `PORT` environment variable)
4. Ensure your app is binding to `0.0.0.0` and not just `localhost`

### MongoDB Connection Issues

If your app can't connect to MongoDB:

1. Verify that your MongoDB connection string is correct
2. Check if your MongoDB Atlas IP whitelist allows connections from DigitalOcean App Platform
3. Ensure your MongoDB user has the correct permissions

### Static Files Not Loading

If your static files (CSS, JS, images) aren't loading:

1. Make sure the build process completed successfully
2. Check that the static files are being served from the correct path
3. Verify that the Express static middleware is configured correctly

## Updating Your App

To update your app:

1. Push changes to your Git repository
2. DigitalOcean App Platform will automatically detect the changes and rebuild/redeploy your app

## Scaling

To scale your app:

1. Go to the App Platform dashboard
2. Select your app
3. Go to the "Settings" tab
4. Under "Resources", you can adjust the CPU and memory allocation
5. You can also enable auto-scaling based on CPU usage
