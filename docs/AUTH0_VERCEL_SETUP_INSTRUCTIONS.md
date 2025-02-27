# Auth0 Configuration for Vercel Deployment

This document provides instructions for configuring Auth0 to work with your Vercel deployment at https://lutruwita2-next.vercel.app.

## Auth0 Dashboard Configuration

1. Log in to your Auth0 dashboard at https://manage.auth0.com/
2. Select your tenant (dev-8jmwfh4hugvdjwh8.au.auth0.com)
3. Navigate to "Applications" in the left sidebar
4. Select your application (the one with Client ID: hLnq0z7KNvwcORjFF9KdC4kGPtu51kVB)

### Update Allowed Callback URLs

In the "Application URIs" section, add the following URL to the "Allowed Callback URLs" field:

```
https://lutruwita2-next.vercel.app/callback
```

If there are existing URLs, separate them with a comma.

### Update Allowed Logout URLs

Add the following URL to the "Allowed Logout URLs" field:

```
https://lutruwita2-next.vercel.app
```

### Update Allowed Web Origins

Add the following URL to the "Allowed Web Origins" field:

```
https://lutruwita2-next.vercel.app
```

### Update Allowed Origins (CORS)

Add the following URL to the "Allowed Origins (CORS)" field:

```
https://lutruwita2-next.vercel.app
```

## Environment Variables in Vercel

When deploying to Vercel, you need to add these environment variables to your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the following variables (copy values from .env.vercel file):

```
VITE_AUTH0_DOMAIN=dev-8jmwfh4hugvdjwh8.au.auth0.com
VITE_AUTH0_CLIENT_ID=hLnq0z7KNvwcORjFF9KdC4kGPtu51kVB
VITE_AUTH0_REDIRECT_URI=https://lutruwita2-next.vercel.app/callback
AUTH0_SECRET=671c315a4f0769ab61285e0311e7956625dd25f253f1538a70fe5d4f2e962d8e9b4959fb75c4cd600d55083a978b121477bcdd85735ede374f95e79c25c0e2c4
AUTH0_BASE_URL=https://lutruwita2-next.vercel.app
AUTH0_POST_LOGOUT_REDIRECT_URI=https://lutruwita2-next.vercel.app
AUTH0_ISSUER_BASE_URL=https://dev-8jmwfh4hugvdjwh8.au.auth0.com
AUTH0_REDIRECT_URI=https://lutruwita2-next.vercel.app/callback
AUTH0_CLIENT_ID=hLnq0z7KNvwcORjFF9KdC4kGPtu51kVB
AUTH0_CLIENT_SECRET=YEI3kegEEy1a8URDzOqZTLz7hxRDyppzT_-vW2iFhixyLi5W_yzSHaKG9eM57pas
AUTH0_AUDIENCE=https://dev-8jmwfh4hugvdjwh8.au.auth0.com/api/v2/
```

## Deployment Notes

1. You can use the existing build cache when redeploying to Vercel
2. The changes we've made are minimal and only affect environment variables
3. Using the build cache will significantly speed up your deployment

## Verifying the Configuration

After updating the Auth0 settings and deploying your application to Vercel:

1. Visit https://lutruwita2-next.vercel.app
2. Click the login button
3. You should be redirected to Auth0 for authentication
4. After successful authentication, you should be redirected back to your application

## Troubleshooting Common Issues

### Callback URL Error

If you see an error message about an invalid callback URL, it means the URL your application is trying to redirect to after authentication is not in the list of allowed callback URLs in your Auth0 application settings.

**Solution**: Add the exact callback URL to the "Allowed Callback URLs" field in your Auth0 application settings.

### CORS Errors

If you see CORS errors in the console, it means your application domain is not listed in the "Allowed Web Origins" or "Allowed Origins (CORS)" fields.

**Solution**: Add your application domain to both fields in your Auth0 application settings.

### Token Validation Errors

If you see errors related to token validation, it could be due to incorrect audience or issuer configuration.

**Solution**: Verify that the `AUTH0_AUDIENCE` environment variable matches the API identifier in your Auth0 dashboard.
