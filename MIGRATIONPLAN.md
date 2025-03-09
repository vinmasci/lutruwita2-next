# Lutruwita Migration Guide for AI Assistants

🚨 **IMPORTANT**: This document should be updated with EACH change made during the migration process. After updating this document, please also add an entry to MIGRATION_LOG.md with specific implementation details and any challenges encountered.

## Latest Migration Status (2025-01-25)

### Recent Achievements
- Successfully split application into separate Express (3001) and Next.js (3000) servers
- Implemented basic GPX file handling structure (upload, process, SSE)
- Added proper environment management (.env, .gitignore)
- Set up feature-based architecture

### Current Focus
- Implementing core GPX processing functionality
- Setting up Mapbox integration
- Establishing proper type sharing between client and server

## Project Overview

### Architecture Migration
From: `lutruwita2` (Monolithic)
To: `lutruwita2-next` (Feature-based)

### Key Repositories
- Source: github.com/vinmasci/lutruwita2
- Target: github.com/vinmasci/lutruwita2-next

### Core Feature Sets
1. GPX Processing
2. Map Integration
3. Surface Type Analysis
4. POI System

## Current Implementation Status

### Server-Side Structure
```
server/
├── src/
│   ├── controllers/
│   │   └── gpx.controller.ts         # Handles GPX file processing requests
│   ├── routes/
│   │   └── gpx.routes.ts            # Defines GPX-related endpoints
│   ├── services/
│   │   └── gpx/
│   │       └── gpx.processing.ts    # Core GPX processing logic
│   └── shared/
       └── config/
           └── server.config.ts      # Server configuration (PORT=3001)
```

### Client-Side Structure
```
src/
├── features/
│   ├── gpx/
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useGpxProcessing.ts  # GPX processing hook
│   │   └── services/
│   │       └── gpxService.ts        # Frontend GPX service
│   └── map/
       └── components/
           └── MapView.tsx           # Main map component
```

## Critical Components

### GPX Processing Pipeline
1. **File Upload** → `server/src/controllers/gpx.controller.ts`
   - Handles multipart form data
   - Validates file type and size
   - Initiates processing

2. **Processing** → `server/src/services/gpx/gpx.processing.ts`
   - Parses GPX XML structure
   - Extracts track points
   - Matches to Mapbox roads
   - Analyzes surface types

3. **Progress Tracking** → Server-Sent Events (SSE)
   - Real-time progress updates
   - Error handling
   - Processing status

### Environment Configuration
Required in `server/.env`:
```
PORT=3001
NODE_ENV=development
MAPBOX_TOKEN=your_token_here
```

## Implementation Checklist

### Completed
- [x] Basic project structure
- [x] Server setup (Express + Next.js)
- [x] Environment configuration
- [x] File upload handling
- [x] Basic GPX type definitions
- [x] Error handling middleware
- [x] CORS configuration
- [x] Development environment setup

### In Progress
- [ ] GPX processing service
  - [x] Basic file parsing
  - [ ] Map matching integration
  - [ ] Surface analysis
  - [ ] Elevation data
- [ ] Frontend components
  - [x] Upload interface
  - [ ] Progress visualization
  - [ ] Error handling
- [ ] Type system
  - [ ] Shared type definitions
  - [ ] Runtime type validation

### Pending
- [ ] Testing infrastructure
- [ ] Production deployment
- [ ] Documentation
- [ ] Performance optimization

## Technical Requirements

### Dependencies
Server:
```json
{
  "@xmldom/xmldom": "^0.8.10",
  "express": "^4.21.2",
  "multer": "^1.4.5-lts.1"
}
```

Client:
```json
{
  "mapbox-gl": "^2.15.0",
  "@types/mapbox-gl": "^2.7.19"
}
```

### Type Definitions
Required in `src/types/`:
- GPX data structures
- Surface type enums
- Processing status types
- Map interaction types

## Notes for AI Assistants

### Migration Philosophy
- Feature-first architecture
- Strong type safety
- Clear separation of concerns
- Progressive enhancement

### Development Guidelines
1. Always update MIGRATION_LOG.md with implementation details
2. Keep this plan updated with progress
3. Follow TypeScript best practices
4. Maintain test coverage
5. Document API changes

### Common Issues & Solutions
1. **Port Conflicts**
   - Frontend runs on 3000
   - Backend runs on 3001
   - Use `npx kill-port` if needed

2. **Type Sharing**
   - Keep shared types in `src/types`
   - Use strict TypeScript settings
   - Validate at runtime where critical

3. **File Processing**
   - Handle large files with streams
   - Use SSE for progress
   - Implement proper cleanup

## Next Steps
1. Complete GPX processing service
2. Implement Mapbox integration
3. Set up type sharing
4. Add automated tests

## Reference Files
Always check these files when making changes:
- MIGRATION_LOG.md (Implementation details)
- MIGRATIONPLAN.md (This file - Strategy)
- server/src/shared/config/server.config.ts (Server configuration)
- src/features/gpx/services/gpxService.ts (Client GPX handling)

## Regular Updates Required
- Update this plan when adding new features
- Document breaking changes
- Track dependency updates
- Note API modifications
- Record architectural decisions

Remember: This is a living document - keep it updated!