# Architecture for Lutruwita 2.0

[Previous sections remain unchanged until GPX Processing Migration section]

3. GPX Processing Migration
   - Source files:
     - src/services/gpx-processor.ts
     - src/hooks/useGpxProcessing.ts
     - src/components/ui/gpx-uploader.tsx
   - Target structure:
     ```
     features/gpx/
       ├── components/
       │   ├── Uploader/
       │   │   ├── index.ts
       │   │   ├── Uploader.tsx        # Main uploader component
       │   │   ├── UploaderUI.tsx      # Presentation component
       │   │   ├── Uploader.types.ts   # Type definitions
       │   │   └── Uploader.styles.ts  # Styled components
       │   ├── RouteDisplay/
       │   └── ElevationProfile/
       ├── services/
       │   ├── gpxProcessor.ts
       │   └── gpxService.ts           # API integration
       ├── hooks/
       │   └── useGpxProcessing.ts     # Processing logic
       ├── routes/
       │   └── gpx.ts                  # Server-side routes
       └── types/
           ├── gpx.types.ts
           └── gpx.constants.ts
     ```

   - Implementation Details:
     * File upload flow:
       1. User interacts with Uploader component in Sidebar
       2. File is validated and passed to handleUploadGpx
       3. Server processes file with progress updates via SSE
       4. Processed GeoJSON is returned and displayed on map
     * Server-side processing:
       - Handles file upload with express-fileupload
       - Streams progress updates via SSE
       - Provides detailed error feedback
     * Client-side features:
       - Real-time progress tracking
       - Error state management
       - Loading state indicators
       - Drag and drop support
     * Type safety:
       - Strict typing for GPX data
       - Error handling types
       - Event type definitions
     * Current state:
       - Core upload functionality complete
       - Progress tracking implemented
       - Error handling improved
       - UI feedback enhanced
       - Type safety enforced
       - Server health checks implemented
       - Endpoint verification complete
       - Active server confirmed (lutruwita2-next)

[Rest of the file remains unchanged]
