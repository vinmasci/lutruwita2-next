# Surface Detection Algorithm Improvements

## Overview
The surface detection system has been enhanced to provide more accurate road surface type detection by implementing a sophisticated multi-point validation system. This improvement addresses previous issues with false positives and inaccurate surface type detection.

## Key Improvements

### 1. Multi-point Validation
Instead of checking individual points in isolation, the system now validates road segments using multiple consecutive points. This approach:
- Reduces false positives from GPS noise
- Better handles road transitions
- Improves accuracy at intersections
- Accounts for the continuous nature of GPX tracks

### 2. Confidence Scoring
A weighted confidence scoring system has been implemented with the following factors:
- Points matching (40%): Proportion of points matching the same road
- Bearing alignment (30%): Track alignment with road direction
- Distance consistency (20%): Consistent proximity to road
- Consecutive matches (10%): Sequential point matches

A segment must achieve 80% total confidence to be considered valid.

## Implementation Details

### File Structure
```
src/features/gpx/
├── types/
│   └── gpx.types.ts       # Type definitions
├── utils/
│   └── roadUtils.ts       # Helper functions
└── services/
    └── surfaceService.ts  # Main implementation
```

### Type Definitions (`gpx.types.ts`)
```typescript
export interface RoadConfidence {
  points: number;        // Number of points confirming road segment
  bearing: number;       // Alignment with road direction
  distance: number;      // Proximity to road
  continuity: number;    // Consecutive point matches
}

export interface RoadSegment {
  points: [number, number][];
  matchingPoints: number;
  totalPoints: number;
  bearingMatch: boolean;
  consistentDistance: boolean;
  consecutiveMatches: number;
  road: {
    id: string;
    surface: string;
    bearing: number;
  };
}
```

### Helper Functions (`roadUtils.ts`)
```typescript
// Calculate bearing between two points
export const getBearing = (start: [number, number], end: [number, number]): number

// Calculate minimum distance from point to road
export const getDistanceToRoad = (point: [number, number], roadCoords: [number, number][]): number

// Calculate variance for distance consistency
export const getVariance = (numbers: number[]): number

// Track consecutive road matches
export const getConsecutiveMatches = (roadMatches: Array<{ id: string } | null>): number
```

### Main Implementation (`surfaceService.ts`)
The surface detection logic has been updated with:
- Verification window for multi-point validation
- Sophisticated road detection at intersections
- Confidence-based validation
- Debug overlays for visual verification

Key constants that can be tuned:
```typescript
const VERIFICATION_WINDOW = 3;    // Number of points to check
const BEARING_TOLERANCE = 20;     // Degrees
const VARIANCE_THRESHOLD = 5;     // Meters
const TURN_ANGLE_THRESHOLD = 30;  // Degrees
const MIN_SEGMENT_LENGTH = 5;     // Points
```

## Validation Process

1. **Point Collection**
   - Takes VERIFICATION_WINDOW consecutive points
   - Projects points onto map coordinates

2. **Road Detection**
   ```typescript
   function validateRoadSegment(
     points: [number, number][],
     map: mapboxgl.Map
   ): RoadSegment | null
   ```
   - Finds nearest road for each point
   - Checks surface type consistency
   - Calculates bearing alignment
   - Measures distance consistency

3. **Confidence Calculation**
   ```typescript
   function isValidRoadSegment(segment: RoadSegment): boolean
   ```
   - Calculates individual confidence scores
   - Applies weights
   - Validates against threshold (0.8)

4. **Section Processing**
   - Creates unpaved sections from validated segments
   - Merges consecutive matching sections
   - Adds visual overlays to map

## Visual Debugging

The implementation includes several debug features:
- Query area visualization
- Point markers at section starts
- Console logging of validation steps
- Section highlighting on map

## Usage

The surface detection is automatically applied when processing GPX tracks:
```typescript
await addSurfaceOverlay(map, routeFeature);
```

## Future Improvements

Potential areas for enhancement:
1. Dynamic confidence thresholds based on terrain
2. Machine learning for pattern recognition
3. Integration with elevation data
4. Support for complex intersection patterns
5. Performance optimizations for long tracks

## References

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)
- [GPX Processing Issues](../GPX_Processing_Issues.md)
- [Architecture Overview](../ARCHITECTURE.md)
