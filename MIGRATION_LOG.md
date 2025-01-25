# Migration Log

## Project Context & Goals
Migrating from lutruwita2 to lutruwita2-next with improvements:
- Original repo: github.com/vinmasci/lutruwita2
- Target repo: github.com/vinmasci/lutruwita2-next
- Main goals:
  1. Refactor monolithic structure into feature-based architecture
  2. Add Mapbox Map Matching API for improved accuracy
  3. Split processing to dedicated Express server
  4. Enhance GPX and surface detection capabilities
  5. Keep files small.. less than 200 lines if possible

## Source Analysis (lutruwita2)
### Key Files Location:
1. GPX Processing:
   ```
   src/
   ├── services/
   │   ├── gpx-processor.ts      # Main GPX processing logic
   │   └── gpx-service.ts        # GPX service layer
   ├── hooks/
   │   └── useGpxProcessing.ts   # React hook for GPX operations
   └── components/ui/
       └── gpx-uploader.tsx      # Upload component
   ```

2. Surface Detection:
   ```
   src/
   ├── services/
   │   └── map-service.ts        # Surface detection logic
   ├── components/ui/
   │   └── surface-legend.tsx    # Surface visualization
   └── types/
       └── map-types.ts          # Surface type definitions
   ```

### Current Implementation Notes:
1. GPX Processing:
   - Basic file upload handling
   - Simple coordinate extraction
   - Basic elevation data processing
   - No map matching or validation
   - Client-side processing causing performance issues

2. Surface Detection:
   - Basic surface type assignment (paved/unpaved)
   - No integration with map data
   - Manual surface type override only

## Target Architecture (lutruwita2-next)

### Server Components (Express):
```
server/
├── src/
│   ├── services/
│   │   ├── gpx/
│   │   │   ├── processor.ts     # Core GPX processing
│   │   │   ├── validator.ts     # GPX validation
│   │   │   └── matcher.ts       # Mapbox map matching
│   │   └── surface/
│   │       ├── detector.ts      # Surface detection
│   │       └── validator.ts     # Surface validation
│   ├── routes/
│   │   ├── gpx.ts              # GPX endpoints
│   │   └── surface.ts          # Surface endpoints
│   └── utils/
│       ├── mapbox.ts           # Mapbox API utilities
│       └── progress.ts         # SSE progress updates
```

### Frontend Components (Next.js):
```
src/
├── features/
│   ├── gpx/
│   │   ├── components/
│   │   │   ├── Uploader/
│   │   │   ├── RouteDisplay/
│   │   │   └── ElevationProfile/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── types/
│   └── surface/
│       ├── components/
│       ├── services/
│       └── types/
```

## Current Progress (2025-01-25)

### Completed:
1. Initial repository setup (lutruwita2-next)
2. Basic documentation structure
3. Initial server deployment attempt to DigitalOcean

### Current Task:
Setting up Express server for GPX processing

### Next Steps:
1. Express Server Setup:
   - Initialize Express application
   - Configure middleware
   - Set up file upload handling
   - Implement health checks
   - Configure CORS for Next.js frontend

2. GPX Processing Module:
   - Port existing processor
   - Add Mapbox Map Matching integration
   - Implement progress tracking
   - Add validation layer

3. Surface Detection Enhancement:
   - Port current detector
   - Add Mapbox surface data integration
   - Implement validation rules
   - Add override capabilities

4. Frontend Integration:
   - Set up Next.js API routes
   - Implement upload component
   - Add progress visualization
   - Handle response processing

## Technical Requirements

### Environment Variables:
```
# Server
PORT=3001
MAPBOX_API_KEY=your_key
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=your_token
```

### Dependencies to Add:
1. Server:
   ```json
   {
     "@mapbox/mapbox-sdk": "^0.15.3",
     "express": "^4.18.2",
     "multer": "^1.4.5-lts.1",
     "cors": "^2.8.5"
   }
   ```

2. Frontend:
   ```json
   {
     "@mapbox/mapbox-gl-draw": "^1.4.3",
     "@mapbox/togeojson": "^0.16.0"
   }
   ```

## Deployment Info
- DigitalOcean Droplet
  - Ubuntu 22.04 LTS
  - 2GB RAM / 1 vCPU
  - Location: Sydney
  - IP: 170.64.164.187

## Important Notes
1. Keep track of memory usage during GPX processing
2. Implement proper cleanup for uploaded files
3. Consider rate limiting for Mapbox API calls
4. Handle large GPX files (>10MB) appropriately
5. Maintain progress updates for frontend

## Troubleshooting Guides
1. SSH Connection:
   ```bash
   ssh -vv root@170.64.164.187
   ```

2. Server Health Check:
   ```bash
   curl http://localhost:3001/health
   ```

3. File Upload Test:
   ```bash
   curl -X POST -F "file=@test.gpx" http://localhost:3001/api/gpx/upload
   ```