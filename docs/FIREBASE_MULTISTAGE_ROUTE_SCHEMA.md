# Firebase Schema for Multi-Stage Routes

This document outlines the Firebase Firestore schema used for storing multi-stage routes, based on the provided screenshots.

## Overview

A multi-stage route (e.g., "NZ Sth Island Trail Mix") consists of a main route document that contains overall metadata and references to several individual segment documents. Each segment document holds the specific details for that stage, including its geometry.

## Collections

### 1. `user_saved_routes` (Top-Level Collection)

*   This collection stores main route documents.
*   Each document in this collection can represent either a single-stage route or a multi-stage "master" route.
*   Document ID: `{mainRouteId}` (e.g., `NPm5zoKKnHCqE8NKHfbt`)

    ```
    user_saved_routes/
        {mainRouteId}/  (e.g., NPm5zoKKnHCqE8NKHfbt - "NZ Sth Island Trail Mix")
            - name: "NZ Sth Island Trail Mix" (String)
            - color: "#ee5253" (String)
            - description: "..." (String)
            - headerSettings: { ... } (Map)
            - isPublic: true (Boolean)
            - routeType: "Bikepacking" (String)
            - statistics: { ... } (Map, overall stats for the multi-stage route)
            - thumbnailPublicId: "..." (String)
            - // Other metadata fields for the main route

            ==> routes (SUBCOLLECTION)
                  |
                  +-- {segmentId_1}/  (e.g., route-21868db9-8c4e-4584-87fc-61ec2d78f548)
                  |     - name: "NZ Day 1: A2O Lake Pukaki Twisel" (String)
                  |     - routeId: "route-6f97a766-e638-47f7-b913-6ca77deb2e42" (String, ID of this segment itself)
                  |     - color: "#ee5253" (String)
                  |     - statistics: { ... } (Map, stats for this specific segment)
                  |     - gpxFileName: "..." (String)
                  |     - metadata: { ... } (Map, metadata for this segment)
                  |
                  |     ==> data (SUBCOLLECTION of the segment)
                  |           |
                  |           +-- coords (DOCUMENT)
                  |           |     - data: [ {lat: Number, lng: Number, elevation: Number}, ... ] (Array of coordinate objects)
                  |           |
                  |           +-- elevation (DOCUMENT - content not fully shown, assumed similar or derived)
                  |           |
                  |           +-- unpaved (DOCUMENT)
                  |                 - data: [ {startIndex: Number, endIndex: Number, surfaceType: String, coordinates: [...]}, ... ] (Array of unpaved section objects)
                  |
                  +-- {segmentId_2}/
                  |     - // Fields similar to segmentId_1
                  |     ==> data (SUBCOLLECTION)
                  |           |
                  |           +-- coords (DOCUMENT)
                  |           +-- ...
                  |
                  +-- ... (other segment documents) ...
    ```

## Key Structural Points:

1.  **Master Route Document:**
    *   Located at `user_saved_routes/{mainRouteId}`.
    *   Contains metadata for the entire multi-stage journey.
    *   **Crucially, it has a subcollection named `routes`.**

2.  **Segments Subcollection:**
    *   Located at `user_saved_routes/{mainRouteId}/routes/`.
    *   This subcollection holds individual documents, one for each stage/segment of the master route.
    *   The **Document ID** of each document in this subcollection is the unique identifier for that segment (e.g., `route-2186...`).
    *   Each segment document contains its own metadata, statistics, and a `routeId` field (which is typically its own document ID).

3.  **Segment Geometry Data:**
    *   Each segment document (e.g., `user_saved_routes/{mainRouteId}/routes/{segmentId}`) has its *own* `data` subcollection.
    *   This nested `data` subcollection (e.g., `user_saved_routes/{mainRouteId}/routes/{segmentId}/data/`) contains documents like `coords`, `elevation`, and `unpaved`, which store the detailed geometry and surface information for that specific segment.

## Data Loading Implication for Swift Code:

To load a multi-stage route like "NZ Sth Island Trail Mix":

1.  Fetch the main route document: `user_saved_routes/NPm5zoKKnHCqE8NKHfbt`.
2.  Query the subcollection: `user_saved_routes/NPm5zoKKnHCqE8NKHfbt/routes/` to get all segment documents.
3.  For each segment document obtained in step 2:
    *   Parse its fields (name, color, segment-specific statistics, etc.).
    *   Fetch its geometry data from its respective sub-subcollections:
        *   `user_saved_routes/NPm5zoKKnHCqE8NKHfbt/routes/{segmentId}/data/coords`
        *   `user_saved_routes/NPm5zoKKnHCqE8NKHfbt/routes/{segmentId}/data/unpaved`
4.  Assemble the main `Route` object (for "NZ Sth Island Trail Mix") and an array of `Route` objects (one for each parsed segment).

This structure means that the `Route` model in Swift, when representing a master route, doesn't need a `routeSegments: [String]` array populated from a field on the master document itself. Instead, the loading service will discover the segments by querying the `routes` subcollection and will construct full `Route` objects for these segments.
