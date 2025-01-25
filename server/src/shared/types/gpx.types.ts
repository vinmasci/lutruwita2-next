export interface ProcessedRoute {
  id: string;
  name: string;
  geojson: any;
  surface: SurfaceAnalysis;
  metadata: {
    distance: number;
    duration: number;
    elevation: number[];
  };
}

export interface MapboxStep {
  surface?: string;
  duration: number;
  distance: number;
  geometry: any;
  name: string;
}

export interface MapboxLeg {
  steps?: MapboxStep[];
  duration: number;
  distance: number;
  summary: string;
}

export interface MapboxMatching {
  confidence: number;
  legs: MapboxLeg[];
  geometry: any;
  duration: number;
  distance: number;
  weight: number;
}

export interface MapboxMatchResult {
  matchings: MapboxMatching[];
  tracepoints: any[];
  geojson: any;
  distance: number;
  duration: number;
  code: string;
  message?: string;
}

export type SurfaceAnalysis = {
  surfaceTypes: string[];
  confidence: number;
};
