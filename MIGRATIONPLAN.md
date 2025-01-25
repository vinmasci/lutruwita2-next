# Lutruwita Migration Guide for AI Assistants
- please update MIGRATION_LOG.md and check off this list as you work along

## Project Context

### Overview
Lutruwita is an advanced interactive mapping application specifically designed for Tasmania, focusing on cycling, hiking, and outdoor activities. The project is currently undergoing a significant architectural migration from `lutruwita2` to `lutruwita2-next`.

### Migration Purpose
1. **Architectural Improvement**
   - Moving from a monolithic structure to a feature-based architecture
   - Breaking down large, complex files into smaller, maintainable units
   - Implementing clearer separation of concerns
   - Enhancing type safety and error handling

2. **Technical Debt Resolution**
   - Replacing ad-hoc state management with context-based solutions
   - Implementing proper error boundaries
   - Adding comprehensive testing infrastructure
   - Improving code organization and documentation

### Current Migration Status
- Core UI structure implemented
- Basic map functionality ported
- Server infrastructure established
- TypeScript configurations optimized
- GPX processing and surface handling pending implementation

## Repository Information

### Source Repository (lutruwita2)
- Location: github.com/vinmasci/lutruwita2
- Structure: Monolithic
- Key Components:
  - MapContainer (main visualization)
  - POI System
  - GPX Processing
  - Surface Type Management

### Target Repository (lutruwita2-next)
- Location: github.com/vinmasci/lutruwita2-next
- Structure: Feature-based
- Current Features:
  ```
  src/
    ├── features/
    │   ├── gpx/
    │   ├── map/
    │   └── poi/
  ```

## GPX Implementation Guide

### Core Concepts
1. **GPX File Structure**
   ```typescript
   interface GPXTrack {
     name: string;
     segments: TrackSegment[];
     metadata: TrackMetadata;
   }

   interface TrackSegment {
     points: TrackPoint[];
     surface: SurfaceType;
     elevation: ElevationData;
   }
   ```

2. **Surface Types**
   - Rating System: 0-6
   - Colors: Green (0) to Maroon (6)
   - Special Types: Dedicated bike paths

### Implementation Requirements

#### 1. File Processing
- Use Server-Sent Events (SSE) for progress tracking
- Implement chunked processing for large files
- Validate GPX structure and data integrity
- Extract elevation data for profile generation

```typescript
// SSE Progress Structure
interface UploadProgress {
  status: 'processing' | 'complete' | 'error';
  progress: number;
  currentTask: string;
  errors?: string[];
}
```

#### 2. Surface Detection
- Implement automatic surface type detection
- Allow manual surface type assignment
- Support segment-by-segment surface definition
- Include surface metadata in track segments

#### 3. Elevation Processing
- Generate elevation profiles
- Calculate gradient information
- Store elevation data efficiently
- Implement elevation visualization

### Error Handling Guidelines
1. **File Upload Errors**
   - Size limitations
   - Format validation
   - Corruption detection
   - Malformed GPX handling

2. **Processing Errors**
   - Timeout management
   - Memory constraints
   - Invalid data handling
   - Progress tracking failures

3. **Surface Detection Errors**
   - Missing data handling
   - Invalid surface types
   - Segment boundary issues
   - Metadata conflicts

## Implementation Progress Tracking

### Completed Items
- [x] Basic project structure
- [x] Server setup and feature-based architecture
- [x] TypeScript configuration and type safety
- [x] Core UI components
- [x] Map integration
- [x] Server-side error handling
- [x] File upload middleware
- [x] GPX type definitions

### In Progress
- [ ] GPX file upload component
- [ ] Server-side GPX processing
  - [x] Basic file handling
  - [ ] Chunked processing
  - [ ] SSE progress tracking
  - [ ] Elevation data extraction
- [ ] Surface type system
  - [x] Type definitions
  - [ ] Detection algorithm
  - [ ] Metadata handling
- [ ] Elevation profile generation

### Pending
- [ ] Route preview functionality
- [ ] Surface detection algorithm
- [ ] Gradient visualization
- [ ] Testing infrastructure
- [ ] Client-side utils consolidation
- [ ] Documentation updates

## Notes for AI Assistants

### 1. Context Awareness
- Always reference this guide when starting new conversations
- Check MIGRATION_LOG.md for latest updates
- Understand the feature-based architecture

### 2. Code Guidelines
- Use TypeScript with strict mode
- Implement proper error handling
- Follow the feature-based structure
- Create small, focused components

### 3. Testing Requirements
- Write unit tests for all new components
- Include integration tests for features
- Test error scenarios comprehensively
- Validate surface detection accuracy

### 4. Documentation
- Update MIGRATION_LOG.md with changes
- Document architectural decisions
- Maintain API documentation
- Update component documentation

## Important Files to Reference

### Configuration Files
- tsconfig.app.json
- tsconfig.server.json
- tsconfig.client.json

### Feature Directories
```
src/features/
  gpx/
    components/
    hooks/
    services/
    types/
  map/
    components/
    context/
    services/
  poi/
    components/
    services/
```

### Server Components
```
server/src/
  ├── features/
  │   ├── gpx/
  │   │   ├── controllers/
  │   │   ├── routes/
  │   │   ├── services/
  │   │   └── types/
  │   └── surface/       # Pending implementation
  │       ├── controllers/
  │       ├── routes/
  │       └── services/
  ├── shared/
  │   ├── config/
  │   ├── middlewares/
  │   ├── types/
  │   └── utils/
  └── server.ts
```

## Common Gotchas and Solutions

1. **GPX Processing**
   - Issue: Memory consumption with large files
   - Solution: Implement chunked processing
   - Implementation: Use streams and worker threads

2. **Surface Detection**
   - Issue: Inconsistent segment boundaries
   - Solution: Implement overlap detection
   - Implementation: Use tolerance thresholds

3. **Type Safety**
   - Issue: Complex nested types
   - Solution: Use TypeScript utility types
   - Implementation: Create proper type hierarchies

Remember to:
- Check MIGRATION_LOG.md before starting work
- Follow the feature-based structure
- Implement proper error handling
- Update documentation
- Add necessary tests

This guide should be updated as the migration progresses and new patterns or requirements emerge.
