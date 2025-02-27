# Route Schema Fix

## Problem

When migrating to serverless, the route schema structure was changed, causing issues with route updates. The original working schema had a specific structure with fields like `persistentId`, `type`, `mapState`, `routes`, `photos`, and `pois` at the top level. However, the new schema had a different structure, which caused route updates to fail.

Error when trying to update a route:
```
Route validation failed: routes.0.order: Path `order` is required.
```

## Solution

The solution was to update the MongoDB schema in `api/routes/index.js` to match the original structure. The key changes were:

1. Made the `order` field in the routes array optional by removing the `required: true` attribute.
2. Ensured the schema includes all the necessary fields from the original structure:
   - Top-level fields: `persistentId`, `name`, `type`, `isPublic`, `userId`, `viewCount`, etc.
   - Complex structures: `mapState`, `routes`, `photos`, `pois`, `data`, `metadata`

This allows the API to accept route updates without requiring the `order` field, which was causing validation errors.

## Implementation

The schema was updated in `api/routes/index.js` to make the `order` field optional:

```javascript
routes: [{
  order: { type: Number }, // Made optional by removing required: true
  routeId: { type: String },
  name: { type: String, required: true },
  // other fields...
}]
```

The handlers for creating and updating routes were also enhanced to properly handle all the fields in the schema.

## Current Status

The route schema fix is working successfully. Routes can now be created and updated without validation errors.

## Known Issues

### Photo Storage Issue

Photos are currently being saved into MongoDB as blob URLs instead of being stored in Cloudinary:

```
[Error] Failed to load photo thumbnail: – "blob:http://localhost:3000/7cca9ee3-5ae7-4d58-959f-54a0b25e17b4"
[Error] Failed to load resource: The operation couldn't be completed. (WebKitBlobResource error 1.) (7cca9ee3-5ae7-4d58-959f-54a0b25e17b4, line 0)
```

This is causing issues with loading photo thumbnails. Photos should be saved to Cloudinary or loaded from Cloudinary instead of being stored as blob URLs in MongoDB. There are existing docs on Cloudinary integration that should be consulted to fix this issue:

- `docs/CLOUDINARY_MIGRATION_PLAN.md`
- `docs/CLOUDINARY_MIGRATION_SUMMARY.md`
- `docs/CLOUDINARY_OPTIMIZATION_SUMMARY.md`

The photo service should be updated to properly handle photo uploads to Cloudinary and store the Cloudinary URLs in MongoDB instead of blob URLs.
