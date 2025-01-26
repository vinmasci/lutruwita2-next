import { UnpavedSection } from '../services/surfaceService';

export interface MapboxMatchResult {
  geojson: GeoJSON.FeatureCollection;
  confidence: number;
  matchingStatus: 'matched' | 'partial' | 'failed';
  debugData?: {
    rawTrace: GeoJSON.FeatureCollection;
    matchedTrace: GeoJSON.FeatureCollection;
    matchingPoints: number;
    distanceDeviation: number;
  };
}

export interface SurfaceAnalysis {
  surfaceTypes: Array<{
    type: 'road' | 'trail' | 'water' | 'unknown';
    percentage: number;
    distance: number;
  }>;
  elevationProfile: Array<{
    elevation: number;
    distance: number;
    grade: number;
  }>;
  totalDistance: number;
  roughness: number;
  difficultyRating: number;
  surfaceQuality: number;
}

export interface ProcessedRoute {
  id: string;
  matchedIndices?: number[]; // Made optional since we're not using it anymore
  name: string;
  color: string;
  isVisible: boolean;
  gpxData: string;
  rawGpx: string;
  geojson: GeoJSON.FeatureCollection;
  surface?: SurfaceAnalysis;
  mapboxMatch?: MapboxMatchResult;
  unpavedSections?: UnpavedSection[];
  statistics: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    maxElevation: number;
    minElevation: number;
    averageSpeed: number;
    movingTime: number;
    totalTime: number;
  };
  status: {
    processingState: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: {
      code: string;
      message: string;
      details?: string;
    };
  };
  debug?: {
    rawTrace: GeoJSON.FeatureCollection;
    matchedTrace: GeoJSON.FeatureCollection;
    timings: Record<string, number>;
    warnings: string[];
  };
}

export type GPXProcessingError = {
  code: 'INVALID_FILE' | 'PARSING_ERROR' | 'MATCHING_ERROR' | 'SURFACE_ANALYSIS_ERROR';
  message: string;
  details?: string;
};

export type GPXProcessingStatus = {
  state: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: GPXProcessingError;
};

export interface File {
  name: string;
  data: Buffer;
  type: string;
  size: number;
  lastModified: number;
  webkitRelativePath: string;
  bytes: () => Promise<Uint8Array>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  slice: (start?: number, end?: number, contentType?: string) => Blob;
  stream: () => ReadableStream;
  text: () => Promise<string>;
}
